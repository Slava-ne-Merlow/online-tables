package de.vyacheslav.kushchenko.tables.data.page.dao

import de.vyacheslav.kushchenko.tables.data.page.model.PageSide
import de.vyacheslav.kushchenko.tables.data.page.model.RightToLeftLink
import de.vyacheslav.kushchenko.tables.util.model.EntityConverter
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID
import kotlin.time.ExperimentalTime
import java.time.Instant


@Entity
@Table(name = "right_to_left_links")
data class RightToLeftLinkEntity @OptIn(ExperimentalTime::class) constructor(

    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(name = "page_id")
    val pageId: UUID,

    @Column(name = "left_row_id")
    val leftRowId: UUID,

    @Column(name = "right_row_id", unique = true)
    val rightRowId: UUID,

    @Column(name = "created_at")
    val createdAt: Instant = Instant.now(),
) {
    companion object : EntityConverter<RightToLeftLink, RightToLeftLinkEntity> {
        override fun RightToLeftLinkEntity.asModel(): RightToLeftLink = RightToLeftLink(
            id!!, pageId, leftRowId, rightRowId
        )

        override fun RightToLeftLink.asEntity(): RightToLeftLinkEntity = RightToLeftLinkEntity(
            id, pageId, leftRowId, rightRowId

        )

    }
}
