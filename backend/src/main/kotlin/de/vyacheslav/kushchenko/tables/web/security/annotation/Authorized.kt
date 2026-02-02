package de.vyacheslav.kushchenko.tables.web.security.annotation

import org.springframework.security.access.prepost.PreAuthorize

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@PreAuthorize("hasRole('ADMIN') || hasRole('USER')")
annotation class Authorized
