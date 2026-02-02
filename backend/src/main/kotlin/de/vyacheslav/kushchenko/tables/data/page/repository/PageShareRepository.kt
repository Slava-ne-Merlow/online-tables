package de.vyacheslav.kushchenko.tables.data.page.repository

import de.vyacheslav.kushchenko.tables.data.page.dao.PageShareEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PageShareRepository : JpaRepository<PageShareEntity, UUID> {
    fun findByPageId(pageId: UUID): PageShareEntity?
    fun findByToken(token: UUID): PageShareEntity?
}
