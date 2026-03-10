package de.vyacheslav.kushchenko.tables.data.column.repository

import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnPermissionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ColumnPermissionRepository : JpaRepository<ColumnPermissionEntity, UUID> {
    fun findByIdUserIdAndIdColumnId(userId: UUID, columnId: UUID): ColumnPermissionEntity?
    fun findAllByIdUserIdAndIdColumnIdIn(userId: UUID, columnIds: Collection<UUID>): List<ColumnPermissionEntity>
}
