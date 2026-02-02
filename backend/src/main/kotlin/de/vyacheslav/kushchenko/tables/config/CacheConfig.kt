package de.vyacheslav.kushchenko.tables.config

import com.github.benmanes.caffeine.cache.Caffeine
import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.caffeine.CaffeineCacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.util.concurrent.TimeUnit


@EnableCaching
@Configuration
class CacheConfig {

    @Bean
    fun cacheManager(): CacheManager {
        val manager = CaffeineCacheManager()

        val caffeineSupplier = { Caffeine.newBuilder().maximumSize(1000) }

        manager.setCaffeine(caffeineSupplier())
        manager.registerCustomCache(
            "books-scored", caffeineSupplier().expireAfterWrite(15, TimeUnit.SECONDS).build()
        ) // todo: подумать на временем кеширования
        manager.registerCustomCache("books-trends", caffeineSupplier().expireAfterWrite(15, TimeUnit.SECONDS).build())

        return manager
    }

}