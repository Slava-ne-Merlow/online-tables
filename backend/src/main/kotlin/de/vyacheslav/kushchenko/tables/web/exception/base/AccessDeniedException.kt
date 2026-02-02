package de.vyacheslav.kushchenko.tables.web.exception.base

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class AccessDeniedException(message: String = "Forbidden") : WebErrorException(message, 403)