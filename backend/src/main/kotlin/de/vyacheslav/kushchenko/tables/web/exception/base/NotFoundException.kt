package de.vyacheslav.kushchenko.tables.web.exception.base

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class NotFoundException(message: String = "Not found") : WebErrorException(message, 404)