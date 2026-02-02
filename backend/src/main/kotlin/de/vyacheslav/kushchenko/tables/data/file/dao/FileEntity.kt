package de.vyacheslav.kushchenko.tables.data.file.dao

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID


@Entity
@Table(name = "files")
data class FileEntity(

    @Id
    @GeneratedValue
    val id: UUID? = null,

    @Column(name = "filename")
    val fileName: String,

    val storagePath: String,


    )
