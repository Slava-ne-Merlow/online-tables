package de.vyacheslav.kushchenko.tables.data.file.model

data class FileMetadata(
    val filename: String,
    val contentType: String,
    val contentLength: Long
)
