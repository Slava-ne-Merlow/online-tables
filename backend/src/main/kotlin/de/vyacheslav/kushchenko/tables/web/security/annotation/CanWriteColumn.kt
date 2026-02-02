package de.vyacheslav.kushchenko.tables.web.security.annotation

import org.springframework.security.access.prepost.PreAuthorize

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@PreAuthorize("@columnPermissionService.canWrite(#pageId, #columnKey, principal.id)")
annotation class CanWriteColumn