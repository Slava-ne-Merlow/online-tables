package de.vyacheslav.kushchenko.tables.data.page.model

import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.api.model.PageAccess as PageAccessDto
import de.vyacheslav.kushchenko.tables.api.model.Page as PageDto
import java.util.UUID

data class Page(
    val id: UUID? = null,
    val name: String,
    val isArchived: Boolean,
)

fun Page.toDto(access: PageAccess): PageDto = PageDto(
    this.id!!, this.name, PageAccessDto.valueOf(access.name), this.isArchived
)
