FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace/app
COPY pom.xml .
COPY src src
RUN apk add --no-cache maven && mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S tripsync && adduser -S tripsync -G tripsync
USER tripsync:tripsync
COPY --from=build /workspace/app/target/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
