package de.vyacheslav.kushchenko.tables.infrastructure.mail

interface MailProvider {
    fun sendText(to: String, subject: String, body: String, bcc: String? = null)
}