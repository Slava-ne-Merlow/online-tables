package de.vyacheslav.kushchenko.tables.service

import de.vyacheslav.kushchenko.tables.data.mail.dao.MailOutboxEntity
import de.vyacheslav.kushchenko.tables.data.mail.repository.MailOutboxRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class MailOutboxService(
    private val repo: MailOutboxRepository,
    @Value("\${app.mail.bccAdmin:}") private val bccAdmin: String,
) {
    fun enqueueCredentialsEmail(toEmail: String, name: String, login: String, rawPassword: String) {
        val body = """
      Здравствуйте, $name!

      Для вас создан аккаунт в Online Tables.

      Логин: $login
      Пароль: $rawPassword
      
      Ссылка для доступа: http://192.168.10.227:3000
    """.trimIndent()

        repo.save(
            MailOutboxEntity(
                toEmail = toEmail,
                bccEmail = bccAdmin.ifBlank { null },
                subject = "Доступ в Online Tables",
                body = body
            )
        )
    }
}
