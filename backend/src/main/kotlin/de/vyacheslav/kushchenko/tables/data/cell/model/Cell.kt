package de.vyacheslav.kushchenko.tables.data.cell.model

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class Cell (
    val sideId: UUID,
    val columnId: UUID,
    val rowId: UUID,
    var valueText: String?=null,
    var valueNumber: BigDecimal?=null,
    var valueDate: LocalDate?=null,
    var fileId: UUID?=null,
    var optionId: UUID?=null,
    var updatedBy: UUID,
    var updatedAt: Instant = Instant.now(),
)