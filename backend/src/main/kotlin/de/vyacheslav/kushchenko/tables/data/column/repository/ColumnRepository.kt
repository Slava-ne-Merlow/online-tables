package de.vyacheslav.kushchenko.tables.data.column.repository

import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface ColumnRepository : JpaRepository<ColumnEntity, UUID> {
    fun findAllBySideId(sideId: UUID): List<ColumnEntity>
    fun findColumnEntityById(id: UUID): ColumnEntity?
    fun findColumnEntityByKey(key: String): ColumnEntity?
}