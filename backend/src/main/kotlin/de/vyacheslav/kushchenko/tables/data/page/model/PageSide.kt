package de.vyacheslav.kushchenko.tables.data.page.model

import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import java.util.UUID

data class PageSide (
    val id: UUID? = null,
    val pageId: UUID,
    val side: Side,
)