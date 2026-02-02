package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.UpdateCellRequest
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.api.model.Side as SideDto
import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity
import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.cell.model.Cell
import de.vyacheslav.kushchenko.tables.data.cell.repository.CellRepository
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.data.page.model.PageSide
import jakarta.transaction.Transactional
import jakarta.validation.constraints.DecimalMax
import org.apache.coyote.BadRequestException
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.*

@Service
class CellService(
    private val cellRepository: CellRepository,
    private val columnService: ColumnService,
    private val selectorOptionService: SelectorOptionService,
    private val userService: UserService,
    private val pageSideService: PageSideService,
    private val fileService: FileService,
) {
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
            ).asModel()
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
            ).asModel()
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

        val logger = LoggerFactory.getLogger(javaClass)
        logger.warn("${value?.toString()}")

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


        val savedCell = cellRepository.save(newCell).asModel()

        return cellToMap(savedCell)
    }

    fun getRowBySideIdAndRowId(sideId: UUID, rowId: UUID) =
        listOfCellsToMap(cellRepository.findAllCellEntityByIdSideIdAndIdRowId(sideId, rowId).map { it.asModel() })


    fun cellToMap(cell: Cell): Map<String, Any> {

        val user = userService.getById(cell.updatedBy)

        if (cell.optionId == null && cell.valueDate == null && cell.valueText == null && cell.valueNumber == null && cell.fileId == null) {
            return mapOf(
                "dataType" to "EMPTY",
                "value" to "",
                "updatedAt" to cell.updatedAt,
                "updatedBy" to mapOf<String, Any>(
                    "name" to user.name,
                    "email" to user.email,
                    "role" to user.role,
                )
            )

        }

        val columnType = columnService.getColumn(cell.columnId).type
        val data = mutableMapOf<String, Any>(
            "dataType" to columnType,
            "value" to when (columnType) {
                ColumnType.SELECTOR -> {
                    val option = selectorOptionService.getOptionById(cell.optionId!!)
                    mapOf(
                        "optionId" to cell.optionId,
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
            "updatedBy" to mapOf<String, Any>(
                "name" to user.name,
                "email" to user.email,
                "role" to user.role,
            )
        )

        if (columnType == ColumnType.FILE && cell.fileId != null) {
            data["filename"] = fileService.getFilenameBIid(cell.fileId!!)
        }
        if (columnType == ColumnType.FILE){
            val logger = LoggerFactory.getLogger(javaClass)
            logger.warn(data.toString())
        }
        return data
    }

    fun listOfCellsToMap(cells: List<Cell>): Map<String, Map<String, Any?>> {
        val data = mutableMapOf<String, Map<String, Any?>>()
        cells.forEach { cell ->
            data[columnService.getColumn(cell.columnId).key] = cellToMap(cell)
        }
        return data
    }
}
