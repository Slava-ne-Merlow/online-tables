package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.api.model.RegisterUserRequest
import de.vyacheslav.kushchenko.tables.api.model.UserUpdateRequest
import de.vyacheslav.kushchenko.tables.data.page.enum.PageAccess
import de.vyacheslav.kushchenko.tables.data.user.dao.UserEntity.Companion.asEntity
import de.vyacheslav.kushchenko.tables.data.user.dao.UserEntity.Companion.asModel
import de.vyacheslav.kushchenko.tables.data.user.enum.LevelCode
import de.vyacheslav.kushchenko.tables.data.user.enum.UserRole
import de.vyacheslav.kushchenko.tables.data.user.model.User
import de.vyacheslav.kushchenko.tables.data.user.repository.UserRepository
import de.vyacheslav.kushchenko.tables.web.exception.base.NotFoundException
import de.vyacheslav.kushchenko.tables.web.response.WebErrorException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
) {

    fun getAll() = userRepository.findAll().map { it.asModel() }

    fun getById(id: UUID): User {

        val user = userRepository.findById(id).orElseThrow { NotFoundException("User not found") }

        return user.asModel()
    }

    fun getByEmail(username: String): User {
        val user = userRepository.findByEmail(username).orElseThrow { NotFoundException("User not found") }

        return user.asModel()
    }

    fun existsByEmail(login: String) = userRepository.existsByEmail(login)


    fun update(userId: UUID, request: UserUpdateRequest): User {
        val user = getById(userId)
        val newUser = user.copy(name = request.name)
        userRepository.save(newUser.asEntity())

        return newUser
    }

    @Transactional
    fun delete(userId: UUID) {
        getById(userId)
        userRepository.deleteById(userId)
    }

}
