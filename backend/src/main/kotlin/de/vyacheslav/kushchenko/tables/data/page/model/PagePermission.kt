package de.vyacheslav.kushchenko.tables.data.page.model

import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import java.util.UUID

data class PagePermission (
    val pageId: UUID,
    val userId: UUID,
    var access: PageAccess,
)