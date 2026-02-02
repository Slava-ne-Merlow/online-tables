package de.vyacheslav.kushchenko.tables.data.page.dao

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "page_shares")
data class PageShareEntity(
    @Id
    @Column(name = "page_id")
    val pageId: UUID,

    @Column(nullable = false, unique = true)
    val token: UUID,

    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
