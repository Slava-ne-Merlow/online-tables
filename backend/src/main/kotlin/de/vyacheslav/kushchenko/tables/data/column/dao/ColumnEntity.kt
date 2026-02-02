package de.vyacheslav.kushchenko.tables.data.column.dao

import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnType
import de.vyacheslav.kushchenko.tables.data.column.model.Column as ColumnDto
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "columns")
data class ColumnEntity(

    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(name = "side_id")
    val sideId: UUID,

    val name: String,

    @Column(unique = true)
    val key: String,

    @Enumerated(EnumType.STRING)
    val type: ColumnType,

    @Column(unique = true)
    var position: Int,

    ) {
    companion object : EntityConverter<ColumnDto, ColumnEntity> {
        override fun ColumnEntity.asModel(): ColumnDto = ColumnDto(
            id = id!!,
            sideId,
            name,
            key,
            type,
            position,
        )

        override fun ColumnDto.asEntity(): ColumnEntity = ColumnEntity(
            id,
            sideId,
            name,
            key,
            type,
            position
            )
    }
}