package de.vyacheslav.kushchenko.tables.web.request

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

class PasswordValidator : ConstraintValidator<Password, String> {
    override fun isValid(param: String, context: ConstraintValidatorContext): Boolean =
        param.any { it in DIGITS } && param.any { it in LOWERCASE_LETTERS } && param.any { it in UPPERCASE_LETTERS }

    companion object {
        @JvmStatic
        val DIGITS = '0'..'9'

        @JvmStatic
        val LOWERCASE_LETTERS = 'a'..'z'

        @JvmStatic
        val UPPERCASE_LETTERS = 'A'..'Z'
    }
}

@Constraint(validatedBy = [PasswordValidator::class])
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.PROPERTY, AnnotationTarget.FIELD)
annotation class Password(
    val message: String = "Password should have uppercase, lowercase letters and numbers",
    val groups: Array<KClass<out Any>> = [],
    val payload: Array<KClass<out Payload>> = []
)
