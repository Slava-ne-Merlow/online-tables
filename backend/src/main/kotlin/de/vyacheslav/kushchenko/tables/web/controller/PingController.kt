package de.vyacheslav.kushchenko.tables.web.controller

import de.vyacheslav.kushchenko.tables.api.PingApi
import de.vyacheslav.kushchenko.tables.api.model.StatusResponse
import de.vyacheslav.kushchenko.tables.util.ok
import org.springframework.stereotype.Component

@Component
class PingController : PingApi {

    override fun ping() = StatusResponse("АЛЕКСАНДР ШАХОВ Я ВАШ ФАНАТ").ok()

}
