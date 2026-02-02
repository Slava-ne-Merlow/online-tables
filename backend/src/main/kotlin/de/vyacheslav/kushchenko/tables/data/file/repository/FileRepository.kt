package de.vyacheslav.kushchenko.tables.data.file.repository

import de.vyacheslav.kushchenko.tables.api.model.DeleteFileResponse
import de.vyacheslav.kushchenko.tables.data.file.dao.FileEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.http.ResponseEntity
import java.util.UUID

interface FileRepository : JpaRepository<FileEntity, UUID> {
    fun deleteFileEntitiesById(id: UUID) : FileEntity
    fun getFileEntityById(id: UUID): FileEntity?
}