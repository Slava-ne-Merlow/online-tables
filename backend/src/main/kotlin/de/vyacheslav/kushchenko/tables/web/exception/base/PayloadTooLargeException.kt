package de.vyacheslav.kushchenko.tables.web.exception.base

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class PayloadTooLargeException(message: String = "Payload is too large") : WebErrorException(message, 413)