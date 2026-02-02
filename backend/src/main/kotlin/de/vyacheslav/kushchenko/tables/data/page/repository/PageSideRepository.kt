package de.vyacheslav.kushchenko.tables.data.page.repository


import de.vyacheslav.kushchenko.tables.data.page.dao.PageSideEntity
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PageSideRepository : JpaRepository<PageSideEntity, UUID> {
    fun findByPageIdAndSide(pageId: UUID, side: Side): PageSideEntity?
}