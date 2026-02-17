package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.TablesApi
import de.vyacheslav.kushchenko.tables.api.model.*
import de.vyacheslav.kushchenko.tables.service.TableService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanReadPage
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanWritePage
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import java.util.*

@Component
class TableController (
    private val tableService: TableService,
) : TablesApi {


    @CanReadPage
    override fun getLegend(pageId: UUID): ResponseEntity<PageLegend> =
        tableService.getLegend(pageId, getRequestUser()).ok()

    @CanWritePage
    override fun addRow(pageId: UUID): ResponseEntity<LeftRow> =
        tableService.addRow(pageId, getRequestUser().id!!).ok()

    @CanWritePage
    override fun addRightRow(pageId: UUID, leftRowId: UUID): ResponseEntity<RightRow> =
        tableService.addRightRow(pageId, leftRowId, getRequestUser().id!!).ok()

    @CanWritePage
    override fun deleteLeftRow(pageId: UUID, leftRowId: UUID): ResponseEntity<DeleteLeftRow200Response> {
        val (leftDeleted, rightsDeletedCount) = tableService.deleteLeftRow(pageId, leftRowId)
        return DeleteLeftRow200Response(
            leftDeleted = leftDeleted,
            rightsDeletedCount = rightsDeletedCount
        ).ok()
    }

    @CanWritePage
    override fun deleteRightRow(pageId: UUID, rightRowId: UUID): ResponseEntity<DeleteRightRow200Response> {
        val (rightDeleted, leftDeleted) = tableService.deleteRightRow(pageId, rightRowId)
        return DeleteRightRow200Response(
            rightDeleted = rightDeleted,
            leftDeleted = leftDeleted
        ).ok()
    }

    @CanWritePage
    override fun mergeLeftRows(pageId: UUID, mergeLeftRowsRequest: MergeLeftRowsRequest) =
        tableService.mergeRows(pageId, mergeLeftRowsRequest.leftRowIds, mergeLeftRowsRequest.propertyValues, getRequestUser().id!!).ok()

    @CanWritePage
    override fun addRowsBulk(pageId: UUID, bulkRowsRequest: BulkRowsRequest): ResponseEntity<BulkRowsResponse> =
        tableService.addRowsBulk(pageId, bulkRowsRequest, getRequestUser().id!!).ok()
}
