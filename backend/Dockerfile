FROM gradle:jdk17 AS cache

WORKDIR /app

COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./

RUN gradle dependencies --no-daemon --stacktrace

FROM gradle:jdk17 AS builder

WORKDIR /app

COPY --from=cache /app/.gradle ./.gradle
COPY --from=cache /app .

COPY src src
COPY mail mail

RUN gradle bootJar -x test --no-daemon --stacktrace

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app
COPY --from=builder /app/build/libs/*.jar ./app.jar
COPY --from=builder /app/mail ./mail

CMD ["java", "-jar", "app.jar"]
