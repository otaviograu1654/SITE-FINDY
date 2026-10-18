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
O servidor inicia normalmente na porta 8080. As telas são copiadas de
`frontend/pages` pelo Maven e servidas pelo próprio backend.
Abra `http://localhost:8080/login.html`. Depois de alterar HTML/JavaScript,
reinicie o backend para atualizar a cópia dos arquivos. `ddl-auto=validate`
evita alterações automáticas da estrutura do banco.

## Usar os perfis reais

1. Crie sua conta em `/login.html` e entre com e-mail e senha.
2. Em `/minha-conta.html`, salve nome, telefone, cidade, UF e selecione a foto do computador ou galeria.
3. Abra "Perfil profissional", preencha descrição, experiência e região e envie.
4. O perfil começa PENDENTE. Você pode editar, desativar, reativar e reenviar
   após recusa. Alterações profissionais e reativação exigem nova análise.
5. A página pública `/perfil-prestador.html?id=ID` só apresenta perfis aprovados,
   ativos e de contas ativas. O dono acompanha a situação sem precisar publicar.

Desativar o perfil profissional não desativa a conta. A mesma pessoa continua
podendo contratar serviços. A foto pode ser selecionada na Minha Conta e salva
junto dos dados pessoais. Links de imagens que já estavam cadastrados continuam válidos.

## Foto do computador ou galeria

Execute `fotos_usuarios.sql` depois de criar a tabela `usuarios`. Nesta máquina,
a tabela de fotos já foi criada no banco local. Antes de publicar esta alteração,
execute o mesmo arquivo no SQL Editor do Neon; o código não cria tabelas automaticamente.

Na Minha Conta, use **Escolher foto**, confira a prévia e clique em **Salvar meus dados**.
São aceitos JPG e PNG de até 2 MB e até 4096 pixels em cada dimensão. O backend
confere o conteúdo e grava uma versão com no máximo 512 pixels no maior lado,
sem os metadados originais. Cada conta tem uma foto, substituída nos próximos envios.

A imagem fica em `fotos_usuarios` no PostgreSQL, e `usuarios.foto` guarda seu
endereço público. Isso preserva a foto quando a hospedagem reinicia.
`POST /fotos/me` recebe multipart com o campo `foto` e exige sessão;
`GET /fotos/{id}` retorna a imagem de uma conta ativa. Não é necessário serviço externo.

Testes do cliente da API: `node --test frontend/tests/api.test.cjs`.

Rotas novas: `GET/PUT /prestadores/me`, `PATCH /prestadores/me/ativacao`
com corpo `{"ativo":true}` ou `{"ativo":false}`, e `GET /prestadores/{id}`.
Permissões, aprovação e dono do perfil são conferidos no servidor.

O Live Server é aceito em `http://localhost:5501` e `http://127.0.0.1:5501`,
usando o mesmo hostname do backend para manter os cookies. A opção recomendada
é abrir as telas na própria porta 8080. Não abra por `file://`.

`PerfilPrestadorTests` testa as regras usando o PostgreSQL local e rollback
automático, sem deixar contas e perfis temporários no banco. Para rodar `mvnw test`,
configure as variáveis PostgreSQL do `.env` no ambiente do terminal ou da IDE.

Se o VS Code continuar marcando `PerfilDTO.java` após uma compilação bem-sucedida,
abra Ctrl+Shift+P, execute `Java: Clean Java Language Server Workspace` e permita
reiniciar o servidor Java. Isso atualiza os diagnósticos do editor.

Os dados ficam em um volume externo, preservado mesmo com `docker compose down`.
Isso não substitui backup. Em um volume já inicializado, editar senha, usuário ou
nome do banco no `.env` não altera os registros existentes: mudanças precisam ser
feitas no PostgreSQL e depois refletidas na configuração.

Referências: [imagem oficial](https://hub.docker.com/_/postgres) e
[volumes no Compose](https://docs.docker.com/reference/compose-file/volumes/).

## Dados de demonstração e painel administrativo

O painel `/admin.html` permite analisar e editar cadastros. Entre com a sua conta
ADMIN pelo login normal. A vitrine `/categoria.html` consulta `/servicos` no banco,
com busca e paginação; os links abrem o perfil público pelo ID do prestador.

`dados_demonstracao.sql` importa 84 profissionais e 84 serviços, distribuídos em
sete categorias. Os exemplos ficam identificados como demonstração, sem avaliações
inventadas e com preço a combinar. As contas fictícias usam e-mails terminados em
`@example.invalid` e senhas aleatórias, sem uma senha padrão para entrar nelas.
O administrador pode editar esses cadastros pelo painel.

O SQL já foi executado nesta máquina. Para importar em outro banco, primeiro crie
as seis tabelas, carregue `categorias.sql`, cadastre sua conta pelo site e promova
somente essa conta a ADMIN. Depois, na raiz do projeto, com o Compose rodando:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 .\database\dados_demonstracao.sql | docker compose exec -T postgres psql -U postgres -d findy --set=ON_ERROR_STOP=1
```

O arquivo possui sua própria transação. Pode executá-lo novamente: registros já
importados são preservados, sem duplicar os exemplos ou substituir contas reais.
Se estiver usando apenas o container manual `findy-postgres`, substitua
`docker compose exec -T postgres` por `docker exec -i findy-postgres`.
Não inicie os dois containers simultaneamente.

Os exemplos originais estão preservados em `profissionais_demonstracao.json`.
Para regenerar o SQL após editar esse JSON, execute
`node database/gerar_demonstracao.cjs` (requer Node.js). Isso só gera o arquivo;
não atualiza registros que já foram importados. O frontend não usa esse JSON.
