package de.vyacheslav.kushchenko.tables.service

import com.github.dockerjava.api.exception.BadRequestException
import com.github.dockerjava.api.exception.NotFoundException
import de.vyacheslav.kushchenko.tables.api.model.ColumnCreateRequest
import de.vyacheslav.kushchenko.tables.api.model.ColumnCreateRequestOptionsInner
import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.data.column.model.Column
import de.vyacheslav.kushchenko.tables.data.column.repository.ColumnRepository
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.user.dao.UserEntity.Companion.asModel
import jakarta.transaction.Transactional
import org.aspectj.weaver.Position
import org.springframework.stereotype.Service
import java.util.*

@Service
class ColumnService(
    private val columnRepository: ColumnRepository,
    private val pageSideService: PageSideService,
    private val selectorOptionService: SelectorOptionService
) {
    companion object {
        private const val MIN_WIDTH_PX = 40
        private const val MAX_WIDTH_PX = 1200
    }

    @Transactional
    fun updateColumnsOrder(pageId: UUID, side: Side, columnIds: List<UUID>): List<Column> {
        val pageSide = pageSideService.getSideIdByPageIdAndSide(pageId, side)
        columnIds.mapIndexed { ind, columnId ->
            val column = columnRepository.findColumnEntityById(columnId)
                ?: throw NotFoundException("Column $columnId not found")
            if (column.sideId != pageSide.id) throw BadRequestException("Column $columnId not in PageSide: ${pageSide.id}")
            columnRepository.save(column.copy(position = ind + 1))
        }
        return columnRepository.findAllBySideId(pageSide.id!!).map { it.asModel() }
    }

    @Transactional
    fun updateColumn(columnId: UUID, newName: String): Column {
        val oldColumn = columnRepository.findColumnEntityById(columnId)
            ?: throw NotFoundException("Column with ID $columnId not found")

        val newColumn = oldColumn.copy(name = newName)

        return columnRepository.save(newColumn).asModel()
    }

    @Transactional
    fun updateColumnWidth(columnId: UUID, widthPx: Int?): Column {
        validateWidth(widthPx)
        val oldColumn = columnRepository.findColumnEntityById(columnId)
            ?: throw NotFoundException("Column with ID $columnId not found")

        val newColumn = oldColumn.copy(widthPx = widthPx)
        return columnRepository.save(newColumn).asModel()
    }

    fun getColumns(pageId: UUID, side: Side): List<Column> {
        val pageSide = pageSideService.getSideIdByPageIdAndSide(pageId, side)

        val columns = columnRepository.findAllBySideId(pageSide.id!!)

        return columns.map { column -> column.asModel() }
    }


    @Transactional
    fun deleteColumn(columnId: UUID): Column {

        val column = getColumn(columnId)
        columnRepository.deleteById(columnId)
        val remaining = columnRepository.findAllBySideId(column.sideId)
            .sortedBy { it.position }
        remaining.forEachIndexed { index, entity ->
            val newPosition = index + 1
            if (entity.position != newPosition) {
                columnRepository.save(entity.copy(position = newPosition))
            }
        }
        return column
    }

    @Transactional
    fun createColumn(pageId: UUID, side: Side, columnType: ColumnType, name: String, position: Int, options: List<ColumnCreateRequestOptionsInner>?, widthPx: Int? = null): Column {
        validateWidth(widthPx)

        val sideId = pageSideService.getSideIdByPageIdAndSide(pageId, side).id
        val columnsToShift = columnRepository.findAllBySideId(sideId!!)
            .filter { it.position >= position }
            .sortedByDescending { it.position }
        columnsToShift.forEach { columnRepository.save(it.copy(position = it.position + 1)) }

        val newColumn = Column(
            sideId = sideId,
            name = name,
            type = columnType,
            key = generateKey(),
            position = position,
            widthPx = widthPx,
        )

        val savedColumn = columnRepository.save(newColumn.asEntity()).asModel()

        if (columnType == ColumnType.SELECTOR){
            if (options == null) {
                selectorOptionService.addDefaultOption(savedColumn.id!!)
            } else {
                selectorOptionService.addOptionsToColumn(savedColumn.id!!, options)
            }

        }

        return savedColumn
    }

    fun getColumn(columnId: UUID): Column {
        val column = columnRepository.findColumnEntityById(columnId)
            ?: throw NotFoundException("Column with ID $columnId not found")
        return column.asModel()
    }

    fun getColumnByColumnKey(columnKey: String): Column {
        val column = columnRepository.findColumnEntityByKey(columnKey)
            ?: throw NotFoundException("Column with ID $columnKey not found")
        return column.asModel()
    }

    fun generateKey(length: Int = 10) = UUID.randomUUID()
        .toString()
        .replace("-", "")
        .take(length)

    private fun validateWidth(widthPx: Int?) {
        if (widthPx == null) return
        if (widthPx !in MIN_WIDTH_PX..MAX_WIDTH_PX) {
            throw BadRequestException("Column width must be between $MIN_WIDTH_PX and $MAX_WIDTH_PX px")
        }
    }

}
