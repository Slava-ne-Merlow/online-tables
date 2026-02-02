package de.vyacheslav.kushchenko.tables.util

import de.vyacheslav.kushchenko.tables.data.user.model.User
import org.springframework.security.core.context.SecurityContextHolder

fun getRequestUser(): User {
    val authentication = SecurityContextHolder.getContext().authentication
    return authentication.principal as User
}
