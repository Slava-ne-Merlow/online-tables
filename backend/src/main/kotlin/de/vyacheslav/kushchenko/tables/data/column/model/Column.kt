package de.vyacheslav.kushchenko.tables.data.column.model

import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.api.model.Column as ColumnDto
import de.vyacheslav.kushchenko.tables.api.model.ColumnAccess as ColumnAccessDto
import de.vyacheslav.kushchenko.tables.api.model.ColumnType as ColumnTypeDto
import java.util.UUID

data class Column(
    val id: UUID? = null,
    val sideId: UUID,
    val name: String,
    val key: String,
    val type: ColumnType,
    var position: Int,
    val widthPx: Int? = null,
)

fun Column.toDto(access: ColumnAccess) = ColumnDto(
    id = this.id!!,
    sideId = this.sideId,
    name = this.name,
    key = this.key,
    position = this.position,
    type = ColumnTypeDto.valueOf(this.type.name),
    access = ColumnAccessDto.valueOf(access.name),
    widthPx = this.widthPx,

)
