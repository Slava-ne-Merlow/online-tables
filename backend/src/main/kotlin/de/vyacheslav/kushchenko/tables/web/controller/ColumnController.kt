package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.ColumnsApi
import de.vyacheslav.kushchenko.tables.api.model.Column
import de.vyacheslav.kushchenko.tables.api.model.ColumnCreateRequest
import de.vyacheslav.kushchenko.tables.api.model.ColumnType as columnTypeDto
import de.vyacheslav.kushchenko.tables.api.model.ColumnUpdateRequest
import de.vyacheslav.kushchenko.tables.api.model.UpdateColumnWidthRequest
import de.vyacheslav.kushchenko.tables.api.model.UpdateColumnsOrderRequest
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.api.model.Side as SideDto
import de.vyacheslav.kushchenko.tables.data.column.model.toDto
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.service.ColumnPermissionService
import de.vyacheslav.kushchenko.tables.service.ColumnService
import de.vyacheslav.kushchenko.tables.service.PermissionService
import de.vyacheslav.kushchenko.tables.service.TableService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanManagePage
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanReadPage
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class ColumnController(
    private val columnService: ColumnService,
    private val columnPermissionService: ColumnPermissionService,
    private val tableService: TableService,
    private val permissionService: PermissionService,
) : ColumnsApi {
    @CanManagePage
    override fun addColumn(
        pageId: UUID,
        side: SideDto,
        columnType: columnTypeDto,
        columnCreateRequest: ColumnCreateRequest
    ): ResponseEntity<Column> {

        val column = tableService.addColumn(
            pageId,
            Side.valueOf(side.name),
            ColumnType.valueOf(columnType.name),
            columnCreateRequest.name,
            columnCreateRequest.position,
            columnCreateRequest.options,
            columnCreateRequest.widthPx,
            getRequestUser().id!!
        )
        permissionService.updateUsersPermissions()
        val access = columnPermissionService.getPermissionsByUserAndColumnId(getRequestUser(), column.id!!)

        return column.toDto(access).ok()

    }

    @CanReadPage
    override fun getColumns(pageId: UUID, side: SideDto): ResponseEntity<List<Column>> {
        val columns = columnService.getColumns(pageId, Side.valueOf(side.name))
        return columns.map { it ->
            it.toDto(columnPermissionService.getPermissionsByUserAndColumnId(getRequestUser(), it.id!!))
        }.ok()
    }

    @CanManagePage
    override fun updateColumn(
        pageId: UUID,
        columnId: UUID,
        columnUpdateRequest: ColumnUpdateRequest
    ): ResponseEntity<Column> {
        val column = columnService.updateColumn(columnId, columnUpdateRequest.name)
        val access = columnPermissionService.getPermissionsByUserAndColumnId(getRequestUser(), column.id!!)
        return column.toDto(access).ok()
    }

    @CanManagePage
    override fun updateColumnWidth(
        pageId: UUID,
        columnId: UUID,
        updateColumnWidthRequest: UpdateColumnWidthRequest
    ): ResponseEntity<Column> {
        val column = columnService.updateColumnWidth(columnId, updateColumnWidthRequest.widthPx)
        val access = columnPermissionService.getPermissionsByUserAndColumnId(getRequestUser(), column.id!!)
        return column.toDto(access).ok()
    }

    @CanManagePage
    override fun deleteColumn(pageId: UUID, columnId: UUID): ResponseEntity<Column> =
        columnService.deleteColumn(columnId).toDto(ColumnAccess.NO).ok()


    @Authorized
    override fun updateColumnsOrder(
        pageId: UUID,
        side: SideDto,
        updateColumnsOrderRequest: UpdateColumnsOrderRequest
    ): ResponseEntity<List<Column>> =
        columnService.updateColumnsOrder(pageId, Side.valueOf(side.name), updateColumnsOrderRequest.columnIds)
            .map { it ->
                it.toDto(columnPermissionService.getPermissionsByUserAndColumnId(getRequestUser(), it.id!!))
            }
            .ok()
}
