package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.FilesApi
import de.vyacheslav.kushchenko.tables.api.model.DeleteFileResponse
import de.vyacheslav.kushchenko.tables.api.model.StoredFile
import de.vyacheslav.kushchenko.tables.service.FileService
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import org.springframework.core.io.Resource
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import org.springframework.http.MediaType
import java.util.UUID

@Component
class FileController (
    private val fileService: FileService,
) : FilesApi {
    @Authorized
    override fun saveFile(file: MultipartFile): ResponseEntity<StoredFile> {
        return fileService.save(file).ok()
    }

    override fun downloadFile(fileId: UUID): ResponseEntity<Resource> {
        val (resource, meta) = fileService.load(fileId)

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(meta.contentType))
            .header("Content-Disposition", """attachment; filename="${meta.filename}"""")
            .contentLength(meta.contentLength)
            .body(resource)
    }

}