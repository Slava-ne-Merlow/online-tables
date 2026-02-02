package de.vyacheslav.kushchenko.tables.data.page.model

import java.util.UUID

data class RightToLeftLink (
    val id: UUID? = null,
    val pageId: UUID,
    val leftRowId: UUID,
    val rightRowId: UUID,
)