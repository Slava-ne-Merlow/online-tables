package de.vyacheslav.kushchenko.tables.data.auth.exception

import de.vyacheslav.kushchenko.tables.web.response.WebErrorException

class BadPasswordException(message: String = "Bad password") : WebErrorException(message, 400)