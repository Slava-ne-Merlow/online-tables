package de.vyacheslav.kushchenko.tables.util

import java.time.OffsetDateTime

fun getCurrentMonth() = OffsetDateTime.now()
    .withDayOfMonth(1)
    .withHour(0)
    .withMinute(0)
    .withSecond(0)
    .withNano(0)


