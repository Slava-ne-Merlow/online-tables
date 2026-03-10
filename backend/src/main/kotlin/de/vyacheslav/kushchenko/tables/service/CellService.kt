package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.UpdateCellRequest
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.api.model.Side as SideDto
import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity
import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity.Companion.asModel as cellAsModel
import de.vyacheslav.kushchenko.tables.data.cell.model.Cell
import de.vyacheslav.kushchenko.tables.data.cell.repository.CellRepository
import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnEntity.Companion.asModel as columnAsModel
import de.vyacheslav.kushchenko.tables.data.column.dao.SelectorOptionEntity.Companion.asModel as selectorOptionAsModel
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.data.column.model.Column
import de.vyacheslav.kushchenko.tables.data.column.model.SelectorOption
import de.vyacheslav.kushchenko.tables.data.column.repository.ColumnRepository
import de.vyacheslav.kushchenko.tables.data.column.repository.SelectorOptionRepository
import de.vyacheslav.kushchenko.tables.data.file.repository.FileRepository
import de.vyacheslav.kushchenko.tables.data.page.model.PageSide
import de.vyacheslav.kushchenko.tables.data.user.dao.UserEntity.Companion.asModel as userAsModel
import de.vyacheslav.kushchenko.tables.data.user.model.User
import de.vyacheslav.kushchenko.tables.data.user.repository.UserRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import jakarta.transaction.Transactional
import org.apache.coyote.BadRequestException
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.*

@Service
class CellService(
    private val cellRepository: CellRepository,
    private val columnService: ColumnService,
    private val pageSideService: PageSideService,
    private val columnRepository: ColumnRepository,
    private val selectorOptionRepository: SelectorOptionRepository,
    private val userRepository: UserRepository,
    private val fileRepository: FileRepository,
) {
    private data class CellRenderContext(
        val columnsById: Map<UUID, Column>,
        val usersById: Map<UUID, User>,
        val optionsById: Map<UUID, SelectorOption>,
        val filenamesById: Map<UUID, String>,
    )

    @Transactional
    fun addRow(pageId: UUID, rowId: UUID, side: PageSide, userId: UUID): Map<String, Map<String, Any?>> {
        val cells = columnService.getColumns(pageId, side.side).sortedBy { it.position }.map { it ->
            cellRepository.save(
                Cell(
                    columnId = it.id!!,
                    sideId = side.id!!,
                    rowId = rowId,
                    updatedBy = userId,
                ).asEntity()
            ).cellAsModel()
        }
        return listOfCellsToMap(cells)
    }

    @Transactional
    fun addCellsByColumn(columnId: UUID, sideId: UUID, userId: UUID) {
        pageSideService.getRowIdsBySideId(sideId).forEach {
            cellRepository.save(
                Cell(
                    columnId = columnId,
                    sideId = sideId,
                    rowId = it,
                    updatedBy = userId,
                ).asEntity()
            ).cellAsModel()
        }
    }


    @Transactional
    fun deleteCellByRowId(rightRowId: UUID) {
        cellRepository.deleteByIdRowId(rightRowId)
    }

    @Transactional
    fun updateCell(
        pageId: UUID,
        rowId: UUID,
        side: SideDto,
        columnKey: String,
        columnType: ColumnType,
        value: Any?,
        userId: UUID
    ): Map<String, Any> {
        val sideId = pageSideService.getSideIdByPageIdAndSide(pageId, Side.valueOf(side.name)).id
        val column = columnService.getColumnByColumnKey(columnKey)

        val oldCell = cellRepository.findCellEntityById(CellEntity.CellId(sideId!!, column.id!!, rowId))
            ?: throw BadRequestException("No cell with id: ${CellEntity.CellId(sideId, column.id, rowId)}")

        val newCell = when (columnType.name) {
            ColumnType.SELECTOR.name -> {
                val value = value?.toString()
                oldCell.copy(
                    optionId = value?.let { UUID.fromString(it) },
                    updatedBy = userId,
                    updatedAt = Instant.now()
                )
            }

            ColumnType.TEXT.name -> {
                oldCell.copy(
                    valueText = value?.toString(),
                    updatedBy = userId,
                    updatedAt = Instant.now()
                )
            }

            ColumnType.FILE.name -> {
                val value = value?.toString()
                oldCell.copy(
                    fileId = value?.let { UUID.fromString(it) },
                    updatedBy = userId,
                    updatedAt = Instant.now()
                )
            }

            ColumnType.DATE.name -> {
                val value = value?.toString()
                try {
                    oldCell.copy(
                        valueDate = value?.let { LocalDate.parse(it) },
                        updatedBy = userId,
                        updatedAt = Instant.now()
                    )
                } catch (e: DateTimeParseException) {
                    throw BadRequestException(e.message)
                }
            }

            ColumnType.NUMBER.name -> {
                val value = value?.toString()
                oldCell.copy(
                    valueNumber = value?.toBigDecimalOrNull(),
                    updatedBy = userId,
                    updatedAt = Instant.now()
                )
            }


            else -> throw IllegalArgumentException("$columnType is unsupported dataType")
        }


        val savedCell = cellRepository.save(newCell).cellAsModel()

        return cellToMap(savedCell)
    }

    fun getRowBySideIdAndRowId(sideId: UUID, rowId: UUID) =
        listOfCellsToMap(cellRepository.findAllCellEntityByIdSideIdAndIdRowId(sideId, rowId).map { it.cellAsModel() })

    fun getRowsBySideIdAndRowIds(sideId: UUID, rowIds: Collection<UUID>): Map<UUID, Map<String, Map<String, Any?>>> {
        if (rowIds.isEmpty()) return emptyMap()

        val cells = cellRepository.findAllByIdSideIdAndIdRowIdIn(sideId, rowIds).map { it.cellAsModel() }
        val context = buildCellRenderContext(cells)

        return cells.groupBy { it.rowId }
            .mapValues { (_, rowCells) -> listOfCellsToMap(rowCells, context) }
    }


    fun cellToMap(cell: Cell): Map<String, Any> {
        val context = buildCellRenderContext(listOf(cell))
        return cellToMap(cell, context)
    }

    private fun cellToMap(cell: Cell, context: CellRenderContext): Map<String, Any> {
        val user = context.usersById[cell.updatedBy]
            ?: throw NotFoundException("User not found")

        val updatedBy = mapOf<String, Any>(
            "name" to user.name,
            "email" to user.email,
            "role" to user.role,
        )

        if (cell.optionId == null && cell.valueDate == null && cell.valueText == null && cell.valueNumber == null && cell.fileId == null) {
            return mapOf(
                "dataType" to "EMPTY",
                "value" to "",
                "updatedAt" to cell.updatedAt,
                "updatedBy" to updatedBy
            )

        }

        val column = context.columnsById[cell.columnId]
            ?: throw NotFoundException("Column with ID ${cell.columnId} not found")
        val columnType = column.type
        val data = mutableMapOf<String, Any>(
            "dataType" to columnType,
            "value" to when (columnType) {
                ColumnType.SELECTOR -> {
                    val optionId = cell.optionId!!
                    val option = context.optionsById[optionId]
                        ?: throw NotFoundException("SelectorOption with id $optionId not found")
                    mapOf(
                        "optionId" to optionId,
                        "value" to option.value,
                        "label" to option.label,
                    )
                }

                ColumnType.TEXT -> {
                    cell.valueText!!
                }

                ColumnType.DATE -> {
                    cell.valueDate!!
                }

                ColumnType.FILE -> {
                    cell.fileId!!
                }

                ColumnType.NUMBER -> {
                    cell.valueNumber!!
                }
            },
            "updatedAt" to cell.updatedAt,
            "updatedBy" to updatedBy
        )

        if (columnType == ColumnType.FILE && cell.fileId != null) {
            val fileId = cell.fileId
            data["filename"] = context.filenamesById[fileId]
                ?: throw NotFoundException("File with $fileId not found")
        }
        return data
    }

    fun listOfCellsToMap(cells: List<Cell>): Map<String, Map<String, Any?>> {
        val context = buildCellRenderContext(cells)
        return listOfCellsToMap(cells, context)
    }

    private fun listOfCellsToMap(cells: List<Cell>, context: CellRenderContext): Map<String, Map<String, Any?>> {
        val data = mutableMapOf<String, Map<String, Any?>>()
        cells.forEach { cell ->
            val column = context.columnsById[cell.columnId]
                ?: throw NotFoundException("Column with ID ${cell.columnId} not found")
            data[column.key] = cellToMap(cell, context)
        }
        return data
    }

    private fun buildCellRenderContext(cells: List<Cell>): CellRenderContext {
        if (cells.isEmpty()) {
            return CellRenderContext(
                columnsById = emptyMap(),
                usersById = emptyMap(),
                optionsById = emptyMap(),
                filenamesById = emptyMap(),
            )
        }

        val columnIds = cells.map { it.columnId }.distinct()
        val columnsById = columnRepository.findAllById(columnIds)
            .map { it.columnAsModel() }
            .associateBy { it.id!! }
        val missingColumnId = columnIds.firstOrNull { !columnsById.containsKey(it) }
        if (missingColumnId != null) {
            throw NotFoundException("Column with ID $missingColumnId not found")
        }

        val userIds = cells.map { it.updatedBy }.distinct()
        val usersById = userRepository.findAllById(userIds)
            .map { it.userAsModel() }
            .associateBy { it.id!! }
        val missingUserId = userIds.firstOrNull { !usersById.containsKey(it) }
        if (missingUserId != null) {
            throw NotFoundException("User not found")
        }

        val optionIds = cells.mapNotNull { it.optionId }.distinct()
        val optionsById = selectorOptionRepository.findAllById(optionIds)
            .map { it.selectorOptionAsModel() }
            .associateBy { it.id!! }
        val missingOptionId = optionIds.firstOrNull { !optionsById.containsKey(it) }
        if (missingOptionId != null) {
            throw NotFoundException("SelectorOption with id $missingOptionId not found")
        }

        val fileIds = cells.mapNotNull { it.fileId }.distinct()
        val filenamesById = fileRepository.findAllById(fileIds)
            .associate { file -> (file.id ?: error("File id is null")) to file.fileName }
        val missingFileId = fileIds.firstOrNull { !filenamesById.containsKey(it) }
        if (missingFileId != null) {
            throw NotFoundException("File with $missingFileId not found")
        }

        return CellRenderContext(
            columnsById = columnsById,
            usersById = usersById,
            optionsById = optionsById,
            filenamesById = filenamesById,
        )
    }
}
