package de.vyacheslav.kushchenko.tables.data.cell.dao


import de.vyacheslav.kushchenko.tables.data.cell.model.Cell
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.io.Serializable
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID
import kotlin.time.ExperimentalTime
import java.time.Instant

@Entity
@Table(name = "cells")
data class CellEntity @OptIn(ExperimentalTime::class) constructor(

    @EmbeddedId
    val id: CellId,

    @Column(name = "value_text")
    var valueText: String?,

    @Column(name = "value_number")
    var valueNumber: BigDecimal?,

    @Column(name = "value_date")
    var valueDate: LocalDate?,

    @Column(name = "file_id")
    val fileId: UUID?,

    @Column(name = "option_id")
    var optionId: UUID?,

    @Column(name = "updated_by")
    var updatedBy: UUID,

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),

    ) {
    @Embeddable
    data class CellId(
        @Column(name = "side_id")
        val sideId: UUID,

        @Column(name = "column_id")
        val columnId: UUID,

        @Column(name = "row_id")
        val rowId: UUID,
    ) : Serializable

    companion object : EntityConverter<Cell, CellEntity> {
        override fun CellEntity.asModel(): Cell = Cell(
            sideId = id.sideId,
            columnId = id.columnId,
            rowId = id.rowId,
            valueText = valueText,
            valueNumber = valueNumber,
            valueDate = valueDate,
            fileId = fileId,
            optionId = optionId,
            updatedBy = updatedBy,

        )
        override fun Cell.asEntity(): CellEntity = CellEntity(
            id = CellId(sideId = sideId, columnId = columnId, rowId = rowId),
            valueText = valueText,
            valueNumber = valueNumber,
            valueDate = valueDate,
            fileId = fileId,
            optionId = optionId,
            updatedBy = updatedBy,
        )
    }
}