package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.UserAccess
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.data.page.dao.PagePermissionEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.page.model.PagePermission
import de.vyacheslav.kushchenko.tables.data.page.dao.PagePermissionEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.data.page.repository.PagePermissionRepository
import de.vyacheslav.kushchenko.tables.data.user.enum.UserRole
import de.vyacheslav.kushchenko.tables.data.user.model.User
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PagePermissionService(
    private val pagePermissionRepository: PagePermissionRepository,
    private val userService: UserService,
) {
    fun getPagesByUserId(userId: UUID) =
        pagePermissionRepository.findAllByIdUserId(userId).map { it.asModel() }.filter { it.access != PageAccess.NO }

    fun getAccessByUserAndPageId(user: User, pageId: UUID): PageAccess {
        if (user.role == UserRole.ADMIN) return PageAccess.MANAGE

        val access = pagePermissionRepository.findByIdPageIdAndIdUserId(pageId, user.id!!)
            ?: throw NotFoundException("Permission with userId ${user.id} and columnId $pageId not found")



        return access.access
    }


    fun canRead(pageId: UUID, userId: UUID): Boolean {
        val userRole = userService.getById(userId).role
        if (userRole == UserRole.ADMIN) return true

        val access = pagePermissionRepository.findByIdPageIdAndIdUserId(pageId, userId)
            ?: return false


        return when (access.access) {
            PageAccess.NO -> false
            PageAccess.READ -> true
            PageAccess.WRITE -> true
            PageAccess.MANAGE -> true

        }

    }

    fun canWrite(pageId: UUID, userId: UUID): Boolean {

        val userRole = userService.getById(userId).role
        if (userRole == UserRole.ADMIN) return true
        val access = pagePermissionRepository.findByIdPageIdAndIdUserId(pageId, userId)
            ?: return false


        return when (access.access) {
            PageAccess.NO -> false
            PageAccess.READ -> false
            PageAccess.WRITE -> true
            PageAccess.MANAGE -> true

        }

    }

    fun canManage(pageId: UUID, userId: UUID): Boolean {
        val userRole = userService.getById(userId).role
        if (userRole == UserRole.ADMIN) return true
        val access = pagePermissionRepository.findByIdPageIdAndIdUserId(pageId, userId)
            ?: return false


        return when (access.access) {
            PageAccess.NO -> false
            PageAccess.READ -> false
            PageAccess.WRITE -> false
            PageAccess.MANAGE -> true

        }

    }

    @Transactional
    fun savePermission(pageId: UUID, userId: UUID, access: PageAccess): PagePermission {
        val newPerm = PagePermission(
            userId = userId,
            pageId = pageId,
            access = access
        )
        return pagePermissionRepository.save(newPerm.asEntity()).asModel()
    }

    @Transactional
    fun updatePermission(pageId: UUID, userId: UUID, access: PageAccess): PagePermission {
        val perm = pagePermissionRepository.findByIdPageIdAndIdUserId(pageId, userId)!!.copy(access = access)
        return pagePermissionRepository.save(perm).asModel()
    }



}
