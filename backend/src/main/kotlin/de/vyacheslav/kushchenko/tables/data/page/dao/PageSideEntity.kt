package de.vyacheslav.kushchenko.tables.data.page.dao

import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.page.model.PageSide
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "page_sides")
data class PageSideEntity(

    @Id
    @GeneratedValue
    val id: UUID? = null,

    val pageId: UUID,

    @Enumerated(EnumType.STRING)
    val side: Side

    ) {
    companion object : EntityConverter<PageSide, PageSideEntity> {
        override fun PageSideEntity.asModel(): PageSide = PageSide(
            id!!, pageId, side
        )

        override fun PageSide.asEntity(): PageSideEntity = PageSideEntity(
            id, pageId, side

        )
    }
}
