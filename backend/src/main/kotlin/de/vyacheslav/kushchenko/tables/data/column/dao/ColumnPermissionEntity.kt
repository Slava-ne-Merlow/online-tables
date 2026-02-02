package de.vyacheslav.kushchenko.tables.data.column.dao

import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.data.column.model.ColumnPermission
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.io.Serializable
import java.util.UUID

@Entity
@Table(name = "column_permissions")
data class ColumnPermissionEntity(

    @EmbeddedId
    val id: ColumnPermissionId,

    @Column(nullable = false)
    val access: ColumnAccess,
    )  {
    @Embeddable
    data class ColumnPermissionId(
        @Column(name = "column_id")
        val columnId: UUID,
        @Column(name = "user_id")
        val userId: UUID, ): Serializable

    companion object : EntityConverter<ColumnPermission, ColumnPermissionEntity> {
        override fun ColumnPermissionEntity.asModel(): ColumnPermission = ColumnPermission(
            id.columnId, id.userId, access
        )

        override fun ColumnPermission.asEntity(): ColumnPermissionEntity = ColumnPermissionEntity(
            id = ColumnPermissionId(columnId, userId),
            access
        )
    }
}