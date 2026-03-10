package de.vyacheslav.kushchenko.tables.data.column.dao

import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.data.column.model.SelectorOption
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "selector_options")
data class SelectorOptionEntity(

    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(name = "column_id")
    val columnId: UUID,

    val label: String,

    val value: String,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int,

    ) {
        companion object : EntityConverter<SelectorOption, SelectorOptionEntity> {
        override fun SelectorOptionEntity.asModel(): SelectorOption = SelectorOption(
            id = id!!, columnId, label, value, sortOrder

        )

        override fun SelectorOption.asEntity(): SelectorOptionEntity = SelectorOptionEntity(
            id, columnId, label, value, sortOrder
        )
    }
}
