package de.vyacheslav.kushchenko.tables.data.page.dao

import de.vyacheslav.kushchenko.tables.data.page.model.Page
import de.vyacheslav.kushchenko.tables.data.page.model.PageSide
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.*

@Entity
@Table(name = "pages")
data class PageEntity(

    @Id
    @GeneratedValue
    val id: UUID? = null,

    val name: String,

    @Column(name = "is_archived", nullable = false)
    val isArchived: Boolean,

    @Column(name = "position", nullable = false)
    val position: Int,

    ) {
    companion object : EntityConverter<Page, PageEntity> {
        override fun PageEntity.asModel(): Page = Page(
            id = id!!,
            name = name,
            isArchived = isArchived,
            position = position,
        )
        override fun Page.asEntity(): PageEntity = PageEntity(
            id = id,
            name = name,
            isArchived = isArchived,
            position = position,
        )
    }
}
