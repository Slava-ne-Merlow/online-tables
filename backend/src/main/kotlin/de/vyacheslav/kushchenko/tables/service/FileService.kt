package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.StoredFile
import de.vyacheslav.kushchenko.tables.data.file.dao.FileEntity
import de.vyacheslav.kushchenko.tables.data.file.model.FileMetadata
import de.vyacheslav.kushchenko.tables.data.file.repository.FileRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.Instant
import java.util.UUID
import kotlin.io.path.*

@Service
class FileService(
    private val fileRepository: FileRepository,
    @Value("\${files.storage-root:./storage/files}")
    private val storageRootStr: String
) {

    private val storageRoot: Path by lazy { Paths.get(storageRootStr).toAbsolutePath().normalize() }

    @Transactional
    fun deleteFile(fileId: UUID) = fileRepository.deleteFileEntitiesById(fileId).id!!

    @Transactional
    fun save(file: MultipartFile): StoredFile {
        val fileId = UUID.randomUUID()
        val original = sanitizeFilename(file.originalFilename ?: "file")
        val subdir = fileId.toString()
        val relativePath = Paths.get(subdir, original).invariantSeparatorsPathString
        val target = storageRoot.resolve(relativePath).normalize()

        if (!target.startsWith(storageRoot)) {
            throw SecurityException("Resolved path escapes storage root")
        }

        try {
            target.parent?.createDirectories()
            file.transferTo(target.toFile())
        } catch (ex: IOException) {
            runCatching { if (target.exists()) target.deleteIfExists() }
            throw ex
        }

        val entity = fileRepository.save(
            FileEntity(
                fileName = original,
                storagePath = relativePath, // хранится как относительный путь от storageRoot
            )
        )

        return StoredFile(
            id = entity.id!!,
            filename = entity.fileName
        )
    }

    fun getFilenameBIid(fileId: UUID): String {
        val file = fileRepository.getFileEntityById(fileId)
            ?: throw NotFoundException("File with $fileId not found")

        return file.fileName
    }

    @Transactional(readOnly = true)
    fun load(fileId: UUID): Pair<Resource, FileMetadata> {
        val entity = fileRepository.findById(fileId)
            .orElseThrow { NoSuchElementException("File not found: $fileId") }

        val path = storageRoot.resolve(entity.storagePath).normalize()
        if (!path.startsWith(storageRoot) || !Files.exists(path)) {
            throw NoSuchElementException("Stored file missing: $fileId")
        }

        val resource: Resource = FileSystemResource(path)
        val contentType = Files.probeContentType(path) ?: MediaType.APPLICATION_OCTET_STREAM_VALUE
        val contentLength = Files.size(path)

        val metadata = FileMetadata(
            filename = entity.fileName,
            contentType = contentType,
            contentLength = contentLength
        )

        return resource to metadata
    }


    private fun sanitizeFilename(name: String): String {
        val base = name.substringAfterLast('/').substringAfterLast('\\')
        val cleaned = base.replace(Regex("""[^\w\-. +]"""), "_")
        return cleaned.ifBlank { "file_${Instant.now().epochSecond}" }
    }
}