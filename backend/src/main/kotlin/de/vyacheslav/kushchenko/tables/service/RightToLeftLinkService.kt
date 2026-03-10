package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.data.page.dao.RightToLeftLinkEntity
import de.vyacheslav.kushchenko.tables.data.page.dao.RightToLeftLinkEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.page.dao.RightToLeftLinkEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.page.model.RightToLeftLink
import de.vyacheslav.kushchenko.tables.data.page.repository.RightToLeftLinkRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class RightToLeftLinkService(
    private val rightToLeftLinkRepository: RightToLeftLinkRepository,
) {
    fun createLink(pageId: UUID): RightToLeftLink {
        val link = RightToLeftLink(
            pageId = pageId,
            leftRowId = UUID.randomUUID(),
            rightRowId = UUID.randomUUID(),
        )
        return rightToLeftLinkRepository.save(link.asEntity()).asModel()
    }

    fun creteLinkRightToLeft(pageId: UUID, leftRowId: UUID): RightToLeftLink {
        val link = RightToLeftLink(
            pageId = pageId,
            leftRowId = leftRowId,
            rightRowId = UUID.randomUUID(),
        )
        return rightToLeftLinkRepository.save(link.asEntity()).asModel()
    }

    fun linkRightToLeft(pageId: UUID, leftRowId: UUID, rightRowId: UUID): RightToLeftLink {
        val link = RightToLeftLink(
            pageId = pageId,
            leftRowId = leftRowId,
            rightRowId = rightRowId,
        )
        return rightToLeftLinkRepository.save(link.asEntity()).asModel()
    }

    fun updateLink(linkId: UUID, newLeftId: UUID): RightToLeftLink {
        val link = rightToLeftLinkRepository.findRightToLeftLinkEntitiesById(linkId)
            ?: throw NotFoundException("Link with id $linkId not found")

        val newLink = link.copy(leftRowId = newLeftId)

        return rightToLeftLinkRepository.save(newLink).asModel()
    }

    fun findLinkByRightRowId(pageId: UUID, rightRowId: UUID): RightToLeftLink {
        val link = rightToLeftLinkRepository.findRightToLeftLinkEntitiesByPageIdAndRightRowId(pageId, rightRowId)
            ?: throw NotFoundException("Right row with id $rightRowId not found")
        return link.asModel()
    }

    fun findLinksByLeftRowId(pageId: UUID, leftRowId: UUID): List<RightToLeftLink> {
        val links = rightToLeftLinkRepository.findRightToLeftLinkEntitiesByPageIdAndLeftRowId(pageId, leftRowId)
            .ifEmpty { throw NotFoundException("Right row connected to left row with id $leftRowId not found") }
        return links.map { it.asModel() }
    }

    fun findLinksByPageIdOrdered(pageId: UUID): List<RightToLeftLink> =
        rightToLeftLinkRepository.findAllByPageIdOrderByCreatedAtAsc(pageId).map { it.asModel() }

    fun findLeftRowsByPageId(pageId: UUID) =
        rightToLeftLinkRepository.findAllByPageIdOrderByCreatedAtAsc(pageId).map { it.asModel().leftRowId }
            .distinct()

    fun findRightRowsByPageId(pageId: UUID) =
        rightToLeftLinkRepository.findAllByPageId(pageId).map { it.asModel().rightRowId }.distinct()

    fun deleteLinkByRightRowId(rightRowId: UUID) =
        rightToLeftLinkRepository.deleteByRightRowId(rightRowId)

    fun deleteAllLinksByLeftRowId(leftRowId: UUID) =
        rightToLeftLinkRepository.deleteAllByLeftRowId(leftRowId)

}
