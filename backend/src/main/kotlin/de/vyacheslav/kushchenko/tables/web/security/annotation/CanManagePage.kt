package de.vyacheslav.kushchenko.tables.web.security.annotation

import org.springframework.security.access.prepost.PreAuthorize

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@PreAuthorize("@pagePermissionService.canManage(#pageId, principal.id) || hasRole('ADMIN')")
annotation class CanManagePage