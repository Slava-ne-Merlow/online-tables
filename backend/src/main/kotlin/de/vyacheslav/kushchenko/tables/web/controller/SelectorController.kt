package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.SelectorsApi
import de.vyacheslav.kushchenko.tables.api.model.SelectOptionCreate
import de.vyacheslav.kushchenko.tables.api.model.SelectorOption
import de.vyacheslav.kushchenko.tables.api.model.UpdateOptionRequest
import de.vyacheslav.kushchenko.tables.api.model.UpdateSelectorOptionsOrderRequest
import de.vyacheslav.kushchenko.tables.data.column.model.toDto
import de.vyacheslav.kushchenko.tables.service.SelectorOptionService
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanManagePage
import de.vyacheslav.kushchenko.tables.web.security.annotation.CanWritePage
import de.vyacheslav.kushchenko.tables.web.security.annotation.IsAdmin
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class SelectorController(
    private val selectorOptionService: SelectorOptionService
) : SelectorsApi {

    @CanWritePage
    override fun getSelectorOptions(pageId: UUID, columnId: UUID): ResponseEntity<List<SelectorOption>> =
        selectorOptionService.getSelectorOptions(columnId).map { it.toDto() }.ok()


    @CanManagePage
    override fun addSelectorOption(
        pageId: UUID,
        columnId: UUID,
        selectOptionCreate: SelectOptionCreate
    ): ResponseEntity<SelectorOption> =
        selectorOptionService.addSelectorOption(columnId, selectOptionCreate.label)
        .toDto()
        .ok()

    @CanManagePage
    override fun updateOption(
        pageId: UUID,
        optionId: UUID,
        updateOptionRequest: UpdateOptionRequest
    ): ResponseEntity<SelectorOption> =
        selectorOptionService.updateOption(optionId, updateOptionRequest.label).toDto().ok()

    @CanManagePage
    override fun deleteOption(pageId: UUID,optionId: UUID): ResponseEntity<SelectorOption> =
        selectorOptionService.deleteOption(optionId).toDto().ok()

    @CanManagePage
    override fun updateSelectorOptionsOrder(
        pageId: UUID,
        columnId: UUID,
        updateSelectorOptionsOrderRequest: UpdateSelectorOptionsOrderRequest
    ): ResponseEntity<List<SelectorOption>> {
        return selectorOptionService.updateOptionsOrder(columnId, updateSelectorOptionsOrderRequest.optionIds).map { it.toDto() }.ok()
    }
}