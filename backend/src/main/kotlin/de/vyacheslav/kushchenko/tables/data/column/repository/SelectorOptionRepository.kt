package de.vyacheslav.kushchenko.tables.data.column.repository

import de.vyacheslav.kushchenko.tables.data.column.dao.SelectorOptionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface SelectorOptionRepository : JpaRepository<SelectorOptionEntity, UUID> {
    fun findAllByColumnIdOrderBySortOrderAsc(columnId: UUID): List<SelectorOptionEntity>
    fun findSelectorOptionEntityById(id: UUID): SelectorOptionEntity?
    fun deleteSelectorOptionEntityById(columnId: UUID): SelectorOptionEntity

}
