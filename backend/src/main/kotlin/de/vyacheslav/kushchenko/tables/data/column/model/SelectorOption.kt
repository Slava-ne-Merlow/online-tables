package de.vyacheslav.kushchenko.tables.data.column.model

import de.vyacheslav.kushchenko.tables.api.model.SelectorOption as SelectorOptionDto
import java.util.UUID

data class SelectorOption (
    val id: UUID? = null,
    val columnId: UUID,
    val label: String,
    val value: String,
    val sortOrder: Int,
)

fun SelectorOption.toDto(): SelectorOptionDto = SelectorOptionDto(
    id!!, columnId, label, value, sortOrder
)