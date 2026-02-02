package de.vyacheslav.kushchenko.tables.web.exception.base

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class InvalidBodyException(message: String = "Invalid body") : WebErrorException(message, 400)