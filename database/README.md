# PostgreSQL local do Findy

A configuração fica em `compose.yaml`, na raiz do projeto. Execute os comandos
nessa pasta, com Docker Desktop aberto. O serviço usa a imagem oficial PostgreSQL 17.

## Nesta máquina

O `.env` foi preparado com a configuração do banco que já existia na porta 5433.
Seu volume foi reaproveitado. O container manual `findy-postgres` fica parado
após a transferência para Compose; use os comandos abaixo para gerenciar o banco.
Não inicie os dois containers ao mesmo tempo: eles usam o mesmo armazenamento.

```powershell
docker compose up -d --wait
docker compose ps
docker compose exec postgres psql -U postgres -d findy -c "SELECT current_database(), version();"
```

Para parar e iniciar sem remover containers:

```powershell
docker compose stop
docker compose start --wait
```

## Em outra máquina, com banco novo

Copie `.env.example` para `.env`, defina uma senha local e crie o volume:

```powershell
Copy-Item .env.example .env
# Edite POSTGRES_PASSWORD no .env antes de iniciar.
docker volume create findy_postgres_data
docker compose up -d --wait
```

## Conexão

- Host: `localhost`
- Porta: `5433` (ou `POSTGRES_PORT` do `.env`)
- Banco: `findy`
- Usuário: `postgres`
- Senha: `POSTGRES_PASSWORD` do `.env`, que não deve ser enviado ao Git.
- JDBC: `jdbc:postgresql://localhost:5433/findy`

O usuário `postgres` é o administrador local do banco,
separado da futura conta administradora do site.

## Iniciar o Spring Boot conectado ao banco

Na raiz do projeto, com Java 21 instalado:

```powershell
docker compose up -d --wait
.\backend\plataformaservicos\start-local.ps1
```

O script lê as variáveis PostgreSQL do `.env`, disponibiliza-as para o Java e
inicia o backend pelo Maven Wrapper. Ele aceita valores simples ou entre aspas;
use valores literais, sem interpolação de variáveis ou comentários na mesma linha.
O Spring Boot recebe essas variáveis pelo `application.properties`, sem senha no código.
O primeiro início pode precisar baixar o Maven e as dependências.
Para encerrar, pressione Ctrl+C no terminal.

Uma conexão bem-sucedida aparece no log como `HikariPool-1 - Start completed`;
o servidor inicia normalmente na porta 8080. Ainda não há endpoints próprios:
abrir essa porta no navegador pode retornar 404. As tabelas serão criadas por
migrations na próxima etapa; `ddl-auto=validate` evita alterações automáticas do schema.

Os dados ficam em um volume externo, preservado mesmo com `docker compose down`.
Isso não substitui backup. Em um volume já inicializado, editar senha, usuário ou
nome do banco no `.env` não altera os registros existentes: mudanças precisam ser
feitas no PostgreSQL e depois refletidas na configuração.

Referências: [imagem oficial](https://hub.docker.com/_/postgres) e
[volumes no Compose](https://docs.docker.com/reference/compose-file/volumes/).
