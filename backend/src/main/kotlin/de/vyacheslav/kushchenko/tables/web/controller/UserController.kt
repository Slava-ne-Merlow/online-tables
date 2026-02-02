package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.UsersApi
import de.vyacheslav.kushchenko.tables.api.model.RegisterUserRequest
import de.vyacheslav.kushchenko.tables.api.model.UserDto
import de.vyacheslav.kushchenko.tables.api.model.UserUpdateRequest
import de.vyacheslav.kushchenko.tables.data.user.model.toDto
import de.vyacheslav.kushchenko.tables.service.UserService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import de.vyacheslav.kushchenko.tables.web.security.annotation.IsAdmin
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component

@Component
class UserController(
    private val userService: UserService,
) : UsersApi {
    @Authorized
    override fun getMe(): ResponseEntity<UserDto> {
        val logger = LoggerFactory.getLogger(UserController::class.java)
        val user = getRequestUser().toDto().ok()
        logger.warn(user.toString())

        return getRequestUser().toDto().ok()
    }

    @Authorized
    override fun updateMe(request: UserUpdateRequest): ResponseEntity<UserDto> =
        userService.update(getRequestUser().id!!, request).toDto().ok()

}



