package de.vyacheslav.kushchenko.tables.data.page.repository

import de.vyacheslav.kushchenko.tables.data.page.dao.PageEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PageRepository : JpaRepository<PageEntity, UUID> {
    fun findPageEntityById(id: UUID): PageEntity?
    fun findAllByOrderByPositionAscIdAsc(): List<PageEntity>
    fun findAllByIdInOrderByPositionAscIdAsc(ids: Collection<UUID>): List<PageEntity>
    fun findTopByOrderByPositionDescIdDesc(): PageEntity?
}
