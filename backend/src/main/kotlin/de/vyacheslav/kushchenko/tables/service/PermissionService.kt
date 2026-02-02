package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.AccessDto
import de.vyacheslav.kushchenko.tables.api.model.ColumnAccessDto
import de.vyacheslav.kushchenko.tables.api.model.PageAccessDto
import de.vyacheslav.kushchenko.tables.api.model.UserAccess
import de.vyacheslav.kushchenko.tables.api.model.PageAccess as PageAccessEnum
import de.vyacheslav.kushchenko.tables.api.model.ColumnAccess as ColumnAccessEnum
import de.vyacheslav.kushchenko.tables.data.column.enum.ColumnAccess
import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.data.page.enum.Side
import de.vyacheslav.kushchenko.tables.data.user.enum.UserRole
import de.vyacheslav.kushchenko.tables.data.user.model.User
import de.vyacheslav.kushchenko.tables.data.user.model.toDto
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PermissionService(
    private val pagePermissionService: PagePermissionService,
    private val columnPermissionService: ColumnPermissionService,
    private val userService: UserService,
    private val pageService: PageService,
    private val columnService: ColumnService,
) {

    fun savePermission(
        user: User,
        access: List<AccessDto>
    ): User {
        access.forEach { accessDto ->
            pagePermissionService.savePermission(
                userId = user.id!!,
                pageId = accessDto.pageAccess.pageId,
                access = PageAccess.valueOf(accessDto.pageAccess.access.name)
            )


            accessDto.columnAccess.forEach { it ->
                columnPermissionService.savePermission(
                    userId = user.id,
                    columnId = it.columnId,
                    access = ColumnAccess.valueOf(it.access.name)
                )
            }
        }
        updateUsersPermissions()
        return user
    }

    fun updateUsersPermissions() {
        val users = userService.getAll().filter { it.role != UserRole.ADMIN }
        val pages = pageService.getAll()
        if (users.isEmpty()) return

        users.forEach { user ->
            pages.forEach { page ->
                try {
                    pagePermissionService.getAccessByUserAndPageId(user, page.id!!)


                } catch (ex: NotFoundException) {
                    pagePermissionService.savePermission(
                        userId = user.id!!,
                        pageId = page.id!!,
                        access = PageAccess.NO
                    )
                } finally {
                    val pageAccess = pagePermissionService.getAccessByUserAndPageId(user, page.id!!)

                    val columns =
                        columnService.getColumns(page.id, Side.LEFT) + columnService.getColumns(page.id, Side.RIGHT)

                    columns.forEach { column ->
                        try {
                            columnPermissionService.getPermissionsByUserAndColumnId(user, column.id!!)
                        } catch (ex: NotFoundException) {
                            columnPermissionService.savePermission(
                                userId = user.id!!,
                                columnId = column.id!!,
                                access = when (pageAccess) {
                                    PageAccess.NO -> ColumnAccess.NO
                                    PageAccess.READ -> ColumnAccess.READ
                                    PageAccess.WRITE -> ColumnAccess.READ
                                    PageAccess.MANAGE -> ColumnAccess.READ
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    fun getPermissionsMe(userId: UUID): List<AccessDto> {
        val pages = pagePermissionService.getPagesByUserId(userId).map { page ->
            val legend = columnPermissionService.getLegend(page.pageId, userService.getById(userId))


            val columns = legend.left + legend.right

            AccessDto(
                pageAccess = PageAccessDto(
                    pageId = page.pageId,
                    access = PageAccessEnum.valueOf(page.access.name)
                ),
                columnAccess = columns.map { it ->
                    ColumnAccessDto(
                        columnId = it.id,
                        access = it.access,
                    )

                }
            )
        }

        return pages

    }

    fun getUsersWithAccess(): List<UserAccess> {
        val pages = pageService.getAll()


        val userAccess = userService.getAll().filter { it.role != UserRole.ADMIN }.map { user ->
            val accessList = mutableListOf<AccessDto>()
            pages.forEach { page ->
                val pageAccess = PageAccessDto(
                    pageId = page.id!!,
                    access = PageAccessEnum.valueOf(pagePermissionService.getAccessByUserAndPageId(user, page.id).name)
                )

                val columnAccess = (columnService.getColumns(page.id, Side.LEFT) + columnService.getColumns(
                    page.id,
                    Side.RIGHT
                )).map { column ->
                    ColumnAccessDto(
                        columnId = column.id!!,
                        access = ColumnAccessEnum.valueOf(
                            columnPermissionService.getPermissionsByUserAndColumnId(
                                user,
                                column.id
                            ).name
                        )
                    )
                }

                val access = AccessDto(
                    pageAccess = pageAccess,
                    columnAccess = columnAccess
                )
                accessList.add(access)

            }

            return@map UserAccess(
                user = user.toDto(),
                access = accessList
            )

        }
        return userAccess
    }

    fun updateUserAccess(userId: UUID, access: List<AccessDto>): UserAccess {

        val user = userService.getById(userId)
        access.forEach { it ->


            pagePermissionService.updatePermission(
                it.pageAccess.pageId,
                userId,
                PageAccess.valueOf(it.pageAccess.access.name)
            )

            it.columnAccess.forEach { columnAccess ->
                columnPermissionService.updatePermission(columnAccess.columnId, userId, ColumnAccess.valueOf(columnAccess.access.name))
            }
        }
        return UserAccess(
            user = user.toDto(),
            access = getPermissionsMe(user.id!!)
        )
    }
}