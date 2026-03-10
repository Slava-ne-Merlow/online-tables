package de.vyacheslav.kushchenko.tables.data.page.repository

import de.vyacheslav.kushchenko.tables.data.page.dao.RightToLeftLinkEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface RightToLeftLinkRepository : JpaRepository<RightToLeftLinkEntity, UUID> {
    fun findRightToLeftLinkEntitiesByPageIdAndRightRowId(pageId: UUID, rightRowId: UUID): RightToLeftLinkEntity?
    fun findRightToLeftLinkEntitiesByPageIdAndLeftRowId(pageId: UUID, leftRowId: UUID): List<RightToLeftLinkEntity>
    fun findAllByPageId(pageId: UUID): List<RightToLeftLinkEntity>
    fun findAllByPageIdOrderByCreatedAtAsc(pageId: UUID): List<RightToLeftLinkEntity>
    fun deleteByRightRowId(rightRowId: UUID)
    fun deleteAllByLeftRowId(leftRowId: UUID)
    fun findRightToLeftLinkEntitiesById(linkId: UUID): RightToLeftLinkEntity?
}
