package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.data.page.dao.PageSideEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.page.dao.PageSideEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.page.model.PageSide
import de.vyacheslav.kushchenko.tables.data.page.repository.PageSideRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PageSideService(
    private val pageSideRepository: PageSideRepository,
    private val rightToLeftLinkService: RightToLeftLinkService,
) {
    fun getSideIdByPageIdAndSide(pageId: UUID, side: Side): PageSide {
        val pageSide = pageSideRepository.findByPageIdAndSide(pageId, side)
            ?: throw NotFoundException("PageSide with pageId: $pageId and side: $side not found")

        return pageSide.asModel()
    }

    fun getRowIdsBySideId(sideId: UUID): List<UUID> {
        val side = pageSideRepository.findById(sideId)
            .orElseThrow { NotFoundException("PageSide with sideId: $sideId not found") }

        val ids = when (side.side) {
            Side.LEFT -> {
                rightToLeftLinkService.findLeftRowsByPageId(side.pageId)
            }
            Side.RIGHT -> {
                rightToLeftLinkService.findRightRowsByPageId(side.pageId)
            }
        }

        return ids
    }

    @Transactional
    fun addSidesByPageId(pageId: UUID) {
        val newLeftSide = PageSide(
            pageId = pageId,
            side = Side.LEFT,
        )
        val newRightSide = PageSide(
            pageId = pageId,
            side = Side.RIGHT,
        )

        pageSideRepository.save(newLeftSide.asEntity())
        pageSideRepository.save(newRightSide.asEntity())


    }

}