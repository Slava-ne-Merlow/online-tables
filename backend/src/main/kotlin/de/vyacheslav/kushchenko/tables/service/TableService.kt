package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.*
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.data.column.model.Column
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.user.model.User
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.*
import de.vyacheslav.kushchenko.tables.api.model.Side as SideDto

@Service
class TableService (
    private val columnService: ColumnService,
    private val columnPermissionService: ColumnPermissionService,
    private val pageSideService: PageSideService,
    private val rightToLeftLinkService: RightToLeftLinkService,
    private val cellService: CellService,
)
{
    @Transactional
    fun addColumn(pageId: UUID, side: Side, columnType: ColumnType, name: String, position: Int, options: List<ColumnCreateRequestOptionsInner>?, widthPx: Int?, userId: UUID): Column {
        val newColumn = columnService.createColumn(pageId, side, columnType, name, position, options, widthPx)
        cellService.addCellsByColumn(newColumn.id!!, newColumn.sideId, userId)

        columnPermissionService.savePermission(
            columnId = newColumn.id,
            userId = userId,
            access = ColumnAccess.WRITE
        )

        return newColumn
    }

    fun getLegend(pageId: UUID, user: User) = columnPermissionService.getLegend(pageId, user)

    @Transactional
    fun addRow(pageId: UUID, userId: UUID): LeftRow {
        val leftSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.LEFT)
        val rightSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.RIGHT)

        val link = rightToLeftLinkService.createLink(pageId)

        val leftCells = cellService.addRow(pageId, link.leftRowId, leftSide, userId)
        val rightCells = cellService.addRow(pageId, link.rightRowId, rightSide, userId)

        return LeftRow(
            leftRowId = link.leftRowId,
            dataLeft = leftCells,
            rights = listOf(
                RightRow(
                    rightRowId = link.rightRowId,
                    dataRight = rightCells
                )
            )
        )
    }

    @Transactional
    fun addRightRow(pageId: UUID, leftRowId: UUID, userId: UUID): RightRow {
        val rightSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.RIGHT)
        val link = rightToLeftLinkService.creteLinkRightToLeft(pageId, leftRowId)
        val rightCells = cellService.addRow(pageId, link.rightRowId, rightSide, userId)
        return RightRow(
            rightRowId = link.rightRowId,
            dataRight = rightCells,
        )
    }

    @Transactional
    fun deleteRightRow(pageId: UUID, rightRowId: UUID): Pair<Boolean, Boolean> {
        val link = rightToLeftLinkService.findLinkByRightRowId(pageId, rightRowId)
        val links = rightToLeftLinkService.findLinksByLeftRowId(pageId, link.leftRowId)
        if (links.size == 1) {
            deleteLeftRow(pageId, links.first().leftRowId)
            return true to true
        } else {
            cellService.deleteCellByRowId(rightRowId)
            rightToLeftLinkService.deleteLinkByRightRowId(rightRowId)

            return true to false
        }

    }

    @Transactional
    fun deleteLeftRow(pageId: UUID, leftRowId: UUID): Pair<Boolean, Int> {
        var deletedRightRows = 0
        rightToLeftLinkService.findLinksByLeftRowId(pageId, leftRowId).forEach { link ->
            cellService.deleteCellByRowId(link.rightRowId)
            deletedRightRows += 1
        }
        cellService.deleteCellByRowId(leftRowId)

        rightToLeftLinkService.deleteAllLinksByLeftRowId(leftRowId)
        return true to deletedRightRows
    }

    @Transactional
    fun mergeRows(pageId: UUID, leftRowIds: List<UUID>, cells: List<CellSummary>, userId: UUID ) : LeftRow {
        val leftSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.LEFT)
        val rightSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.RIGHT)

        val newLeftRowId = UUID.randomUUID()

        cellService.addRow(pageId, newLeftRowId, leftSide, userId)

        val rightRows = mutableListOf<RightRow>()

        leftRowIds.forEach { leftRowId ->

            val links = rightToLeftLinkService.findLinksByLeftRowId(pageId, leftRowId)


            links.forEach { link ->

                val newLink = rightToLeftLinkService.updateLink(link.id!!, newLeftRowId)
                rightRows.add(RightRow(
                    rightRowId = newLink.rightRowId,
                    dataRight = cellService.getRowBySideIdAndRowId(rightSide.id!!, newLink.rightRowId),
                ))
            }
            cellService.deleteCellByRowId(leftRowId)

        }

        cells.forEach { cell ->
            cellService.updateCell(
                pageId,
                newLeftRowId,
                SideDto.LEFT,
                cell.columnKey,
                ColumnType.valueOf(cell.dataType.name),
                cell.value,
                userId,
            )
        }


        return LeftRow(
            leftRowId = newLeftRowId,
            dataLeft = cellService.getRowBySideIdAndRowId(leftSide.id!!, newLeftRowId),
            rights = rightRows
        )
    }

    @Transactional
    fun addRowsBulk(pageId: UUID, request: BulkRowsRequest, userId: UUID): BulkRowsResponse {
        val leftSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.LEFT)
        val rightSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.RIGHT)

        var leftInserted = 0
        var rightInserted = 0

        fun applyCells(
            rowId: UUID,
            side: SideDto,
            data: Map<String, CellValue>
        ) {
            data.forEach { (columnKey, cellValue) ->
                cellService.updateCell(
                    pageId,
                    rowId,
                    side,
                    columnKey,
                    ColumnType.valueOf(cellValue.dataType.name),
                    cellValue.value,
                    userId
                )
            }
        }

        request.rows.forEach { row ->
            val leftRowId = UUID.randomUUID()
            cellService.addRow(pageId, leftRowId, leftSide, userId)
            leftInserted += 1
            applyCells(leftRowId, SideDto.LEFT, row.dataLeft)

            row.rights?.forEach { rightRow ->
                val rightRowId = UUID.randomUUID()
                rightToLeftLinkService.linkRightToLeft(pageId, leftRowId, rightRowId)
                cellService.addRow(pageId, rightRowId, rightSide, userId)
                rightInserted += 1
                applyCells(rightRowId, SideDto.RIGHT, rightRow.dataRight)
            }
        }

        return BulkRowsResponse(
            leftInserted = leftInserted,
            rightInserted = rightInserted
        )
    }
}
