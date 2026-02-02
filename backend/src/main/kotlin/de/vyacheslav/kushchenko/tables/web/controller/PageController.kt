package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.PagesApi
import de.vyacheslav.kushchenko.tables.api.model.AddPageRequest
import de.vyacheslav.kushchenko.tables.api.model.DeleteLeftRow200Response
import de.vyacheslav.kushchenko.tables.api.model.DeleteRightRow200Response
import de.vyacheslav.kushchenko.tables.api.model.LeftRow
import de.vyacheslav.kushchenko.tables.api.model.MergeLeftRows200Response
import de.vyacheslav.kushchenko.tables.api.model.MergeLeftRowsRequest
import de.vyacheslav.kushchenko.tables.api.model.Page
import de.vyacheslav.kushchenko.tables.api.model.PageGrid
import de.vyacheslav.kushchenko.tables.api.model.PageLegend
import de.vyacheslav.kushchenko.tables.api.model.RenamePageRequest
import de.vyacheslav.kushchenko.tables.api.model.RightRow
import de.vyacheslav.kushchenko.tables.api.model.ShareLinkResponse
import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.data.page.model.toDto
import de.vyacheslav.kushchenko.tables.service.PageService
import de.vyacheslav.kushchenko.tables.service.PageShareService
import de.vyacheslav.kushchenko.tables.service.PermissionService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanManagePage
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanReadPage
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanWritePage
import de.vyacheslav.kushchenko.tables.web.security.annotation.IsAdmin
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class PageController (
    private val pageService: PageService,
    private val permissionService: PermissionService,
    private val pageShareService: PageShareService,
): PagesApi {
    @Authorized
    override fun getPages(): ResponseEntity<List<Page>> =
        pageService.getPages(getRequestUser()).ok()

    @CanReadPage
    override fun getPage(pageId: UUID): ResponseEntity<Page> =
        pageService.getPage(pageId, getRequestUser()).ok()


    @CanReadPage
    override fun getGrid(pageId: UUID): ResponseEntity<PageGrid> =
        pageService.getGrid(pageId, getRequestUser()).ok()

    @CanReadPage
    override fun createPageShare(pageId: UUID): ResponseEntity<ShareLinkResponse> {
        val share = pageShareService.getOrCreate(pageId)
        val url = "/share/${share.token}"
        return ShareLinkResponse(token = share.token, url = url).ok()
    }

    override fun getSharedGrid(token: UUID): ResponseEntity<PageGrid> {
        val pageId = pageShareService.getPageIdByToken(token)
        return pageService.getGridPublic(pageId).ok()
    }

    @CanManagePage
    override fun exportPage(pageId: UUID): ResponseEntity<Resource> {
        val export = pageService.exportPageExcel(pageId, getRequestUser())

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header("Content-Disposition", """attachment; filename="${export.filename}"""")
            .contentLength(export.bytes.size.toLong())
            .body(ByteArrayResource(export.bytes))
    }

    @IsAdmin
    override fun addPage(addPageRequest: AddPageRequest) : ResponseEntity<Page> {

        val page = pageService.addPage(addPageRequest.name).toDto(PageAccess.MANAGE).ok()

        permissionService.updateUsersPermissions()

        return page
    }

    @IsAdmin
    override fun deletePage(pageId: UUID) =
        pageService.deletePage(pageId).toDto(PageAccess.NO).ok()

    @CanManagePage
    override fun renamePage(pageId: UUID, renamePageRequest: RenamePageRequest) =
        pageService.renamePage(pageId, renamePageRequest.name).toDto(PageAccess.MANAGE).ok()

    @CanManagePage
    override fun togglePageArchive(pageId: UUID) =
        pageService.togglePage(pageId).toDto(PageAccess.MANAGE).ok()

}
