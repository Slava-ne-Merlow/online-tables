package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.PageLegend
import de.vyacheslav.kushchenko.tables.api.model.UserAccess
import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnPermissionEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.column.dao.ColumnPermissionEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.user.model.User
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.api.model.ColumnAccess as ColumnAccessDto
import de.vyacheslav.kushchenko.tables.data.column.model.ColumnPermission
import de.vyacheslav.kushchenko.tables.data.column.model.toDto
import de.vyacheslav.kushchenko.tables.data.column.repository.ColumnPermissionRepository
import de.vyacheslav.kushchenko.tables.data.page.dao.PagePermissionEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.page.dao.PagePermissionEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.page.model.PagePermission
import de.vyacheslav.kushchenko.tables.data.user.enum.UserRole
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import io.sentry.Breadcrumb.user
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class ColumnPermissionService(
    private val columnPermissionRepository: ColumnPermissionRepository,
    private val userService: UserService,
    private val pagePermissionService: PagePermissionService,
    private val columnService: ColumnService

) {
    fun getPermissionsByUserAndColumnId(user: User, columnId: UUID): ColumnAccess {
        if (user.role == UserRole.ADMIN) return ColumnAccess.WRITE
        val permission = columnPermissionRepository.findByIdUserIdAndIdColumnId(user.id!!, columnId)
            ?: throw NotFoundException("Permission with userId ${user.id} and columnId $columnId not found")


        return when (permission.access) {
            ColumnAccess.NO -> ColumnAccess.NO
            ColumnAccess.READ -> ColumnAccess.READ
            ColumnAccess.WRITE -> ColumnAccess.WRITE
        }
    }


    fun canRead(pageId: UUID, columnId: UUID, userId: UUID): Boolean {
        val user = userService.getById(userId)
        if (user.role == UserRole.ADMIN) return true

        val pageAccess = pagePermissionService.getAccessByUserAndPageId(user, pageId)

        val columnAccess = columnPermissionRepository.findByIdUserIdAndIdColumnId(userId, columnId) ?: return true

        return when (pageAccess) {
            PageAccess.NO -> false
            PageAccess.READ -> columnAccess.access != ColumnAccess.NO
            PageAccess.WRITE -> columnAccess.access != ColumnAccess.NO
            PageAccess.MANAGE -> columnAccess.access != ColumnAccess.NO

        }

    }

    fun canWrite(pageId: UUID, columnKey: String, userId: UUID): Boolean {
        val user = userService.getById(userId)
        if (user.role == UserRole.ADMIN) return true

        val pageAccess = pagePermissionService.getAccessByUserAndPageId(user, pageId)

        val columnId = columnService.getColumnByColumnKey(columnKey).id!!

        val columnAccess = columnPermissionRepository.findByIdUserIdAndIdColumnId(userId, columnId) ?: return false

        return when (pageAccess) {
            PageAccess.NO -> false
            PageAccess.READ -> false
            PageAccess.WRITE -> columnAccess.access == ColumnAccess.WRITE
            PageAccess.MANAGE -> columnAccess.access == ColumnAccess.WRITE

        }

    }

    @Transactional
    fun savePermission(columnId: UUID, userId: UUID, access: ColumnAccess): ColumnPermission {
        val newPerm = ColumnPermission(
            userId = userId,
            columnId = columnId,
            access = access
        )
        return columnPermissionRepository.save(newPerm.asEntity()).asModel()
    }

    @Transactional
    fun updatePermission(columnId: UUID, userId: UUID, access: ColumnAccess): ColumnPermission {
        val perm = columnPermissionRepository.findByIdUserIdAndIdColumnId(userId, columnId)!!.copy(access = access)
        return columnPermissionRepository.save(perm).asModel()
    }

    fun getLegend(pageId: UUID, user: User): PageLegend {
        val left = columnService.getColumns(pageId, Side.LEFT).sortedBy { it.position }
        val right = columnService.getColumns(pageId, Side.RIGHT).sortedBy { it.position }
        val accessByColumnId = getAccessByUserAndColumnIds(user, (left + right).mapNotNull { it.id })

        return PageLegend(
            left = left.map { column ->
                val access = accessByColumnId[column.id!!]
                    ?: throw NotFoundException("Permission with userId ${user.id} and columnId ${column.id} not found")
                column.toDto(access)
            }.filter { it.access != ColumnAccessDto.NO },
            right = right.map { column ->
                val access = accessByColumnId[column.id!!]
                    ?: throw NotFoundException("Permission with userId ${user.id} and columnId ${column.id} not found")
                column.toDto(access)
            }.filter { it.access != ColumnAccessDto.NO }
        )
    }

    private fun getAccessByUserAndColumnIds(user: User, columnIds: List<UUID>): Map<UUID, ColumnAccess> {
        if (columnIds.isEmpty()) return emptyMap()
        if (user.role == UserRole.ADMIN) {
            return columnIds.associateWith { ColumnAccess.WRITE }
        }

        val permissions = columnPermissionRepository.findAllByIdUserIdAndIdColumnIdIn(user.id!!, columnIds)
        val accessByColumnId = permissions.associate { it.id.columnId to it.access }
        val missingColumnId = columnIds.firstOrNull { !accessByColumnId.containsKey(it) }
        if (missingColumnId != null) {
            throw NotFoundException("Permission with userId ${user.id} and columnId $missingColumnId not found")
        }

        return accessByColumnId
    }


}
