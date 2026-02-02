package de.vyacheslav.kushchenko.tables.web.exception.base

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class UnsupportedMediaTypeException(message: String = "Unsupported media type") : WebErrorException(message, 409)