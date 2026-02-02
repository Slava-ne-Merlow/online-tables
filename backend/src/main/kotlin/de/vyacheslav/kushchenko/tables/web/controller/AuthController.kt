package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.AuthApi
import de.vyacheslav.kushchenko.tables.api.model.ChangePasswordRequest
import de.vyacheslav.kushchenko.tables.api.model.RegisterRequest
import de.vyacheslav.kushchenko.tables.api.model.RegisterUserRequest
import de.vyacheslav.kushchenko.tables.api.model.SignInRequest
import de.vyacheslav.kushchenko.tables.data.user.model.toDto
import de.vyacheslav.kushchenko.tables.service.AuthenticationService
import de.vyacheslav.kushchenko.tables.util.getRequestUser
import de.vyacheslav.kushchenko.tables.util.ok
import de.vyacheslav.kushchenko.tables.web.security.annotation.Authorized
import de.vyacheslav.kushchenko.tables.web.security.annotation.IsAdmin
import org.springframework.stereotype.Component

@Component
class AuthController(private val authenticationService: AuthenticationService) : AuthApi {
    override fun register(request: RegisterRequest) = authenticationService.register(
        email = request.email, password = request.password, name = request.name
    ).toDto().ok()

    override fun signIn(request: SignInRequest) =
        authenticationService.signIn(email = request.email, password = request.password).ok()

    @Authorized
    override fun changePassword(
        request: ChangePasswordRequest
    ) = authenticationService.changePassword(getRequestUser(), request.oldPassword, request.newPassword).ok()

    @IsAdmin
    override fun registerUser(registerUserRequest: RegisterUserRequest) =
        authenticationService.registerUser(
            registerUserRequest.email,
            registerUserRequest.name,
            registerUserRequest.access
        ).toDto().ok()

}
