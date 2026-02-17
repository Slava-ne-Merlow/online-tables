package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.*
import de.vyacheslav.kushchenko.tables.data.page.dao.PageEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.page.dao.PageEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.page.model.Page
import de.vyacheslav.kushchenko.tables.data.page.model.toDto
import de.vyacheslav.kushchenko.tables.data.page.repository.PageRepository
import de.vyacheslav.kushchenko.tables.data.user.enum.UserRole
import de.vyacheslav.kushchenko.tables.data.user.model.User
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import jakarta.transaction.Transactional
import org.apache.poi.ss.util.CellRangeAddress
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.util.*
import de.vyacheslav.kushchenko.tables.api.model.Page as PageDto

@Service
class PageService(
    private val pageRepository: PageRepository,
    private val pagePermissionService: PagePermissionService,
    private val pageSideService: PageSideService,
    private val rightToLeftLinkService: RightToLeftLinkService,
    private val cellService: CellService,
    private val columnPermissionService: ColumnPermissionService,
    private val columnService: ColumnService,
    private val selectorOptionService: SelectorOptionService
) {
    data class ExportedPageFile(
        val filename: String,
        val bytes: ByteArray
    )

    fun getAll() = pageRepository.findAll().map { it.asModel() }

    fun getPages(user: User): List<PageDto> {
        val pages = when (user.role) {
            UserRole.ADMIN -> {
                pageRepository.findAll().map { it.asModel() }
            }

            UserRole.USER -> {
                val pagePermissions = pagePermissionService.getPagesByUserId(user.id!!)
                pagePermissions.map { it ->
                    val page = pageRepository.findPageEntityById(it.pageId)
                        ?: throw NotFoundException("Page ${it.pageId} not found")
                    page.asModel()
                }
            }
        }

        return pages.map { it -> it.toDto(pagePermissionService.getAccessByUserAndPageId(user, it.id!!)) }
    }

    fun getPage(pageId: UUID, user: User): PageDto {
        val page = pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")
        return page.asModel().toDto(pagePermissionService.getAccessByUserAndPageId(user, pageId))
    }

    @Transactional
    fun addPage(name: String): Page {
        val newPage = Page(name = name, isArchived = false)

        val savedPage = pageRepository.save(newPage.asEntity())

        pageSideService.addSidesByPageId(savedPage.id!!)

        return savedPage.asModel()
    }

    @Transactional
    fun duplicatePage(pageId: UUID): Page {
        val source = pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")

        val newName = if (source.name.isBlank()) "Копия" else "Копия ${source.name}"
        val newPage = addPage(newName)

        val leftColumns = columnService.getColumns(pageId, Side.LEFT).sortedBy { it.position }
        val rightColumns = columnService.getColumns(pageId, Side.RIGHT).sortedBy { it.position }

        fun copyColumn(column: de.vyacheslav.kushchenko.tables.data.column.model.Column, side: Side) {
            val options = if (column.type.name == "SELECTOR") {
                selectorOptionService.getSelectorOptions(column.id!!)
                    .sortedBy { it.sortOrder }
                    .map { ColumnCreateRequestOptionsInner(label = it.label, sortOrder = it.sortOrder) }
            } else {
                null
            }

            columnService.createColumn(
                pageId = newPage.id!!,
                side = side,
                columnType = column.type,
                name = column.name,
                position = column.position,
                options = options
            )
        }

        leftColumns.forEach { copyColumn(it, Side.LEFT) }
        rightColumns.forEach { copyColumn(it, Side.RIGHT) }

        return newPage
    }

    fun getGrid(pageId: UUID, user: User): PageGrid {

        val rows = mutableListOf<LeftRow>()

        val leftSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.LEFT)
        val rightSide = pageSideService.getSideIdByPageIdAndSide(pageId, Side.RIGHT)
        rightToLeftLinkService.findLeftRowsByPageId(pageId).forEach { leftRowId ->
            val rightIds = rightToLeftLinkService.findLinksByLeftRowId(pageId, leftRowId).map { it.rightRowId }
            rows.add(
                LeftRow(
                    leftRowId = leftRowId,
                    dataLeft = cellService.getRowBySideIdAndRowId(leftSide.id!!, leftRowId),
                    rights = rightIds.map { rightId ->
                        RightRow(
                            rightRowId = rightId,
                            dataRight = cellService.getRowBySideIdAndRowId(rightSide.id!!, rightId)
                        )
                    }
                ))
        }
        return PageGrid(
            legend = columnPermissionService.getLegend(pageId, user),
            rows = rows,

            )
    }

    fun getGridPublic(pageId: UUID): PageGrid {
        val publicUser = User(
            id = null,
            email = "public@local",
            name = "Public",
            role = UserRole.ADMIN,
            password = null
        )
        val grid = getGrid(pageId, publicUser)

        val gridLegendLeft = grid.legend.left.map { it ->
            it.copy(access = ColumnAccess.READ)
        }
        val gridLegendRight = grid.legend.right.map { it ->
            it.copy(access = ColumnAccess.READ)
        }

        return grid.copy(
            legend = PageLegend(
                left = gridLegendLeft,
                right = gridLegendRight,
            )
        )
    }

    fun exportPageExcel(pageId: UUID, user: User): ExportedPageFile {
        val page = pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")
        val grid = getGrid(pageId, user)

        val leftColumns = grid.legend.left
        val rightColumns = grid.legend.right

        val out = ByteArrayOutputStream()
        val filename = "${sanitizeFilename(page.name)}.xlsx"

        XSSFWorkbook().use { workbook ->
            val sheet = workbook.createSheet("Page")
            var rowIndex = 0

            val headerRow = sheet.createRow(rowIndex++)
            (leftColumns + rightColumns).forEachIndexed { index, col ->
                headerRow.createCell(index).setCellValue(col.name)
            }

            for (leftRow in grid.rows) {
                val leftValues = leftColumns.map { col ->
                    cellValueToString(leftRow.dataLeft?.get(col.key))
                }

                val rights = leftRow.rights
                val startRow = rowIndex
                val rowCount = if (rights.isEmpty()) 1 else rights.size

                for (i in 0 until rowCount) {
                    val row = sheet.createRow(rowIndex++)

                    if (i == 0) {
                        leftValues.forEachIndexed { colIndex, value ->
                            row.createCell(colIndex).setCellValue(value)
                        }
                    }

                    val rightData = rights.getOrNull(i)?.dataRight
                    rightColumns.forEachIndexed { index, col ->
                        val value = cellValueToString(rightData?.get(col.key))
                        row.createCell(leftColumns.size + index).setCellValue(value)
                    }
                }

                if (rowCount > 1) {
                    val endRow = rowIndex - 1
                    for (colIndex in leftColumns.indices) {
                        sheet.addMergedRegion(CellRangeAddress(startRow, endRow, colIndex, colIndex))
                    }
                }
            }

            workbook.write(out)
        }

        return ExportedPageFile(filename = filename, bytes = out.toByteArray())
    }

    private fun cellValueToString(cell: Any?): String {
        if (cell == null) return ""
        if (cell !is Map<*, *>) return cell.toString()

        val value = cell["value"]
        return when (value) {
            is Map<*, *> -> value["label"]?.toString()
                ?: value["value"]?.toString()
                ?: ""

            null -> ""
            else -> value.toString()
        }
    }

    private fun sanitizeFilename(name: String): String {
        val trimmed = name.trim()
        if (trimmed.isBlank()) return "page"
        return trimmed
            .replace(Regex("[\\\\/\\r\\n\\t\\u0000]"), "_")
            .replace(Regex("[<>:\"|?*]"), "_")
            .take(120)
    }

    @Transactional
    fun renamePage(pageId: UUID, name: String): Page {
        val page = pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")
        val newPage = page.copy(name = name)
        return pageRepository.save(newPage).asModel()
    }

    @Transactional
    fun deletePage(pageId: UUID): Page {
        val page = pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")
        pageRepository.delete(page)
        return page.asModel()
    }

    @Transactional
    fun togglePage(pageId: UUID): Page {
        val page = pageRepository.findPageEntityById(pageId)
            ?: throw NotFoundException("Page $pageId not found")

        val newPage = page.copy(isArchived = !page.isArchived)

        return pageRepository.save(newPage).asModel()
    }
}
