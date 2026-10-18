# Compila o backend com as telas e monta a imagem Java usada para publicar o Findy.

# Execute o build na raiz: o Maven tambem empacota frontend/pages no JAR.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace/backend/plataformaservicos
COPY backend/plataformaservicos/pom.xml ./pom.xml
COPY backend/plataformaservicos/src ./src
COPY frontend/pages /workspace/frontend/pages
# Os testes de integracao precisam de PostgreSQL; sao executados separadamente.
RUN mvn -B -ntp -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/backend/plataformaservicos/target/plataformaservicos-0.0.1-SNAPSHOT.jar ./app.jar
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=10000 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
USER 10001:10001
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
