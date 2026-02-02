package de.vyacheslav.kushchenko.tables.data.user.repository

import de.vyacheslav.kushchenko.tables.data.user.dao.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.rest.core.annotation.RepositoryRestResource
import java.util.*

@RepositoryRestResource(exported = false)
interface UserRepository : JpaRepository<UserEntity, UUID> {

    fun findByEmail(username: String): Optional<UserEntity>

    fun existsByEmail(username: String): Boolean

}
