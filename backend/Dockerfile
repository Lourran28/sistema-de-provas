FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace

COPY pom.xml ./
RUN mvn --batch-mode --quiet -DskipTests dependency:go-offline

COPY src ./src
RUN mvn --batch-mode --quiet -DskipTests package

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
RUN addgroup -S provas && adduser -S provas -G provas

COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar app.jar

USER provas
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
