package de.vyacheslav.kushchenko.tables.data.cell.repository

import de.vyacheslav.kushchenko.tables.data.cell.dao.CellEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CellRepository : JpaRepository<CellEntity, CellEntity.CellId> {
    fun deleteByIdRowId(rowId: UUID)
    fun findCellEntityById(cellId: CellEntity.CellId): CellEntity?
    fun findAllCellEntityByIdSideIdAndIdRowId(sideId: UUID, rowId: UUID): List<CellEntity>
    fun findAllByIdSideIdAndIdRowIdIn(sideId: UUID, rowIds: Collection<UUID>): List<CellEntity>
}
