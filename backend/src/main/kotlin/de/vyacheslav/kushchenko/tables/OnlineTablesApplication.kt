package de.vyacheslav.kushchenko.tables

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.ConfigurableApplicationContext

@SpringBootApplication
class OnlineTablesApplication

fun main(args: Array<String>) {
    runApplication<OnlineTablesApplication>(*args)
}

fun run(
    args: Array<String>,
    init: SpringApplication.() -> Unit = {},
): ConfigurableApplicationContext {
    return runApplication<OnlineTablesApplication>(*args, init = init)
}
