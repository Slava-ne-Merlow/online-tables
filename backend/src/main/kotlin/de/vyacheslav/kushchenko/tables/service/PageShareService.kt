package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.data.page.dao.PageShareEntity
import de.vyacheslav.kushchenko.tables.data.page.repository.PageRepository
import de.vyacheslav.kushchenko.tables.data.page.repository.PageShareRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PageShareService(
    private val pageShareRepository: PageShareRepository,
    private val pageRepository: PageRepository
) {
    @Transactional
    fun getOrCreate(pageId: UUID): PageShareEntity {
        pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")

        val existing = pageShareRepository.findByPageId(pageId)
        if (existing != null) return existing

        val created = PageShareEntity(
            pageId = pageId,
            token = UUID.randomUUID()
        )
        return pageShareRepository.save(created)
    }

    fun getPageIdByToken(token: UUID): UUID {
        val share = pageShareRepository.findByToken(token)
            ?: throw NotFoundException("Share $token not found")
        return share.pageId
    }
}
