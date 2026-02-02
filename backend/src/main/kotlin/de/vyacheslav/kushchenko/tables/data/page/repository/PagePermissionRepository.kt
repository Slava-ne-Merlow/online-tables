package de.vyacheslav.kushchenko.tables.data.page.repository

import de.vyacheslav.kushchenko.tables.data.page.dao.PagePermissionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PagePermissionRepository : JpaRepository<PagePermissionEntity, PagePermissionEntity.PagePermissionId> {
    fun findAllByIdUserId(id: UUID): List<PagePermissionEntity>
    fun findByIdPageIdAndIdUserId(pageId: UUID, userId: UUID): PagePermissionEntity?
}