package de.vyacheslav.kushchenko.tables.data.column.model

import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import java.util.UUID

data class ColumnPermission (
    val columnId: UUID,
    val userId: UUID,
    var access: ColumnAccess,
)