package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.NotFoundException
import de.vyacheslav.kushchenko.tables.api.model.ColumnCreateRequestOptionsInner
import de.vyacheslav.kushchenko.tables.data.column.dao.SelectorOptionEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.column.dao.SelectorOptionEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.column.model.SelectorOption
import de.vyacheslav.kushchenko.tables.data.column.repository.SelectorOptionRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.InvalidBodyException
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SelectorOptionService(
    val selectorOptionRepository: SelectorOptionRepository,
) {
    fun getSelectorOptions(columnId: UUID): List<SelectorOption> {
        val options = selectorOptionRepository.findAllByColumnIdOrderBySortOrderAsc(columnId)

        return options.map { it.asModel() }
    }

    @Transactional
    fun addSelectorOption(columnId: UUID, label: String): SelectorOption {
        val newOption = SelectorOption(
            label = label,
            value = UUID.randomUUID().toString(),
            columnId = columnId,
            sortOrder = nextPosition(columnId)
        )

        return selectorOptionRepository.save(newOption.asEntity()).asModel()
    }

    @Transactional
    fun updateOption(optionId: UUID, label: String): SelectorOption {
        val oldOption = selectorOptionRepository.findSelectorOptionEntityById(optionId)
            ?: throw NotFoundException("SelectorOption with id $optionId not found")
        val newOption = oldOption.copy(label = label)

        return selectorOptionRepository.save(newOption).asModel()
    }

    @Transactional
    fun deleteOption(optionId: UUID): SelectorOption =
        selectorOptionRepository.deleteSelectorOptionEntityById(optionId).asModel()

    fun getOptionById(id: UUID): SelectorOption {
        val option = selectorOptionRepository.findSelectorOptionEntityById(id)
            ?: throw NotFoundException("SelectorOption with id $id not found")
        return option.asModel()
    }

    fun nextPosition(columnId: UUID): Int {
        val lis = selectorOptionRepository.findAllByColumnIdOrderBySortOrderAsc(columnId)
        if (lis.isEmpty()) return 1

        return lis.maxBy { it.sortOrder }.sortOrder + 1
    }

    @Transactional
    fun addDefaultOption(columnId: UUID): SelectorOption {
        val option = SelectorOption(
            columnId = columnId,
            label = "Default option",
            value = UUID.randomUUID().toString(),
            sortOrder = 1
        )
        return selectorOptionRepository.save(option.asEntity()).asModel()
    }

    @Transactional
    fun addOptionsToColumn(columnId: UUID, options: List<ColumnCreateRequestOptionsInner>) {
        options.forEach { it ->
            val option = SelectorOption(
                columnId = columnId,
                label = it.label,
                value = UUID.randomUUID().toString(),
                sortOrder = it.sortOrder,
            )
            selectorOptionRepository.save(option.asEntity())
        }
    }

    @Transactional
    fun updateOptionsOrder(columnId: UUID, list: List<UUID>): List<SelectorOption> {
        val existingOptions = selectorOptionRepository.findAllByColumnIdOrderBySortOrderAsc(columnId)
        val existingIds = existingOptions.mapNotNull { it.id }

        if (list.size != existingIds.size || list.toSet().size != list.size || list.toSet() != existingIds.toSet()) {
            throw InvalidBodyException("Selector option ids do not match existing options")
        }

        val optionsById = existingOptions.associateBy { it.id!! }
        list.forEachIndexed { ind, selectorOptionId ->
            val selectorOption = optionsById[selectorOptionId]
                ?: throw NotFoundException("SelectorOption with id $selectorOptionId not found")
            if (selectorOption.sortOrder != ind + 1) {
                selectorOptionRepository.save(selectorOption.copy(sortOrder = ind + 1))
            }
        }

        return getSelectorOptions(columnId)
    }
}
