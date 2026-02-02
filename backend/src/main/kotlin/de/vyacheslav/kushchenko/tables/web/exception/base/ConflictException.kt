package de.vyacheslav.kushchenko.tables.web.exception.base

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class ConflictException(message: String = "Conflict") : WebErrorException(message, 409)