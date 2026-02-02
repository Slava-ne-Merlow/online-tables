package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.AccessApi
import de.vyacheslav.kushchenko.tables.api.model.UpdateUserAccessRequest
import de.vyacheslav.kushchenko.tables.api.model.UserAccess
import de.vyacheslav.kushchenko.tables.data.user.model.toDto
import de.vyacheslav.kushchenko.tables.service.PermissionService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import de.vyacheslav.kushchenko.tables.web.security.annotation.IsAdmin
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component

@Component
class AccessController(
    private val permissionService: PermissionService,
) : AccessApi {
    @Authorized
    override fun getAccessMe(): ResponseEntity<UserAccess> {
        val access = permissionService.getPermissionsMe(getRequestUser().id!!)

        return UserAccess(
            user = getRequestUser().toDto(),
            access = access
        ).ok()
    }

    @IsAdmin
    override fun getUserAccess() =
        permissionService.getUsersWithAccess().ok()

    @IsAdmin
    override fun updateUserAccess(updateUserAccessRequest: UpdateUserAccessRequest) =
        permissionService.updateUserAccess(updateUserAccessRequest.userId, updateUserAccessRequest.access).ok()

}
