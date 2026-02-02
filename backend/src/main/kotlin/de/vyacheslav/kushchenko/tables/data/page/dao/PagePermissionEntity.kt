package de.vyacheslav.kushchenko.tables.data.page.dao

import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.data.page.model.PagePermission
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.*
import java.io.Serializable
import java.util.*


@Entity
@Table(name = "page_permissions")
data class PagePermissionEntity(

    @EmbeddedId
    val id: PagePermissionId,

    @Column(nullable = false)
    var access: PageAccess,

) {
    @Embeddable
    data class PagePermissionId(
        @Column(name = "page_id")
        val pageId: UUID,
        @Column(name = "user_id")
        val userId: UUID,
    ) : Serializable


    companion object : EntityConverter<PagePermission, PagePermissionEntity> {
        override fun PagePermissionEntity.asModel(): PagePermission = PagePermission(
            id.pageId, id.userId, access
        )

        override fun PagePermission.asEntity(): PagePermissionEntity = PagePermissionEntity(
            id = PagePermissionId(pageId, userId),
            access
        )
    }
}
