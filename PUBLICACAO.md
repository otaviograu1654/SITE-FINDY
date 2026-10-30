# Publicar o Findy: Render + Neon

O Render executa o Java e serve as telas do mesmo JAR. O Neon guarda os dados.
Vocês acessam o mesmo link, sem precisar deixar seus computadores ligados.
Os arquivos estão preparados; a publicação só acontece após configurar as contas
e credenciais nos passos abaixo. Não coloque senhas no GitHub.

Validação realizada: build da imagem Docker e inicialização com limite de 512 MB;
telas, arquivos estáticos e consulta da API ao PostgreSQL local passaram.
A conexão real com o Neon será validada após cadastrar as credenciais no Render.

## 1. Conferir o banco do Neon

No SQL Editor do Neon, execute:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT nome FROM categorias ORDER BY nome;
```

Devem existir usuarios, prestadores, categorias, servicos, solicitacoes e avaliacoes,
além das sete categorias. Se você já executou os SQL, não precisa repetir a criação.
Não é necessário importar `dados_demonstracao.sql`. Seu banco Docker fica separado.

Para as funcionalidades novas, execute também `database/recuperacao_senha.sql`
(somente se a tabela ainda não existir) e `database/fotos_usuarios.sql` no SQL Editor.
O segundo arquivo cria a tabela das fotos selecionadas no computador ou galeria;
ele pode ser executado novamente sem apagar dados. Faça isso antes do deploy do upload.
As imagens ficam no PostgreSQL, não no disco temporário do Render.

## 2. Guardar a conexão do Neon

Abra Connect no projeto/branch/database em que você executou os SQL.
Anote Host, Database, Role (usuário) e Password. O banco pode se chamar `neondb`;
use o nome exibido no painel, não suponha que ele se chama `findy`.

Você cadastrará estas três variáveis no Render:

| Variável | Exemplo — substitua pelos seus dados |
| --- | --- |
| JDBC_DATABASE_URL | `jdbc:postgresql://ep-SEU-HOST.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require` |
| POSTGRES_USER | `neondb_owner` |
| POSTGRES_PASSWORD | A senha mostrada no Neon |

Use o hostname inteiro fornecido pelo Neon (inclusive `-pooler`, se estiver presente).
Não use localhost nem a porta local 5433. A URL JDBC começa com
`jdbc:postgresql://`, contém o banco e `?sslmode=require`, e não contém usuário/senha.
Se Connect mostrar `postgresql://usuario:senha@host/banco?...`, não cole essa string
diretamente: monte a versão JDBC seguindo a tabela, com usuário e senha separados.

## 3. Enviar a versão atual ao GitHub

Na raiz do projeto:

```powershell
git status
git add .
git diff --cached --stat
```

Confira a lista antes de continuar: não envie senhas, `.env`, logs ou arquivos pessoais.
O `.env` é ignorado pelo Git; `.env.example` pode ser enviado. Se algum arquivo
indevido estiver na lista, retire-o com `git restore --staged caminho-do-arquivo`.
É necessário enviar também as fontes atuais de backend e frontend, não só o Dockerfile.

```powershell
git commit -m "Prepara Findy para Render e Neon"
git push
git branch --show-current
```

Anote a branch exibida. Se for a primeira publicação de uma branch e o Git pedir:
`git push -u origin NOME_DA_BRANCH`, substituindo pelo nome real.

## 4. Criar a hospedagem no Render

1. Entre em https://render.com e conecte sua conta GitHub.
2. Selecione **New > Blueprint** e escolha o repositório do Findy.
3. Escolha a branch enviada no passo anterior, com o arquivo `render.yaml` na raiz.
4. O Render lerá a configuração do serviço `findy`: Docker, plano Free e health check.
5. Preencha as três variáveis solicitadas com os dados do passo 2.
6. Confirme que o plano está **Free** e inicie a publicação (Deploy/Apply).
7. Acompanhe os logs até o serviço aparecer como **Live**.

Não crie um banco PostgreSQL no Render: o banco já está no Neon. Não configure
Root Directory como `backend`: o build precisa enxergar também `frontend/pages`.
Não preencha Docker Command: o Dockerfile já inicia o Java.

O build baixa Java/Maven, compila o projeto e empacota as telas. Ele não executa
os testes de integração nem cria tabelas; o backend valida as tabelas ao iniciar.
No perfil `prod`, a sessão usa cookie seguro, por isso acesse o endereço HTTPS.

## 5. Abrir o site e criar o administrador

Abra o endereço HTTPS exibido no Render e acrescente `/index.html`. Exemplo:
`https://NOME-DO-SERVICO.onrender.com/index.html` (use o endereço real do painel).

1. Acesse `/login.html` nesse endereço e crie sua conta.
2. No SQL Editor do Neon, confira se ela está no banco:

```sql
SELECT id, nome, email, papel FROM usuarios;
```

3. Promova somente sua conta, substituindo o e-mail do exemplo pelo cadastrado:

```sql
UPDATE usuarios
SET papel = 'ADMIN'
WHERE LOWER(email) = LOWER('seu-email@exemplo.com');
```

4. Confira se a atualização afetou uma conta. Saia e entre novamente no site.
5. Abra `/admin.html`. Seu amigo deve criar uma conta própria pelo mesmo site;
   ela continua como USUARIO. Não compartilhe sua senha de administrador.

O banco novo não recebe sua conta ADMIN local automaticamente. Categorias podem
ficar sem cards até existir um prestador aprovado com serviço ativo: cadastre ofertas em Meus serviços para que apareçam no catálogo.

## 6. Conferir juntos

- Seu amigo abre o mesmo link e cria uma conta.
- Você atualiza o painel administrativo e confere o cadastro.
- Ele preenche o perfil profissional; você analisa e aprova pelo painel.
- Depois de aprovado, o perfil público pode ser aberto pelo ID do prestador.
- Mudanças em dados aparecem ao atualizar a página; não há atualização em tempo real.

Para alterar telas/código, trabalhem pelo Git. Alterações locais só chegam ao site
após commit, push para a branch conectada e uma publicação bem-sucedida no Render.
Se a atualização automática estiver desabilitada, use Manual Deploy no painel.
Após reinício/publicação, as sessões atuais podem encerrar; basta fazer login novamente.

O `.env` e o Docker local continuam disponíveis para desenvolver sem alterar o banco
compartilhado. O Render usa suas próprias variáveis, não lê o `.env` do seu computador.

## Se não iniciar

- **Falha de senha/conexão:** confira as três variáveis em Environment no Render,
  o hostname, a porta 5432, o banco e `sslmode=require`. Salve e publique novamente.
- **Tabela ausente:** execute o SQL que falta no mesmo banco/branch do Neon usado
  pela conexão do Render; não recrie tabelas que já existem.
- **Arquivo não encontrado no build:** confira se enviou todos os fontes, se o
  Dockerfile está na raiz e se o contexto do build é a raiz do repositório.
- **Erro 502/deploy falhou:** leia os logs do Render antes de alterar configurações.
  Envie a mensagem do erro, ocultando qualquer credencial.
- **Primeiro acesso lento:** no plano Free, o Render suspende o serviço após
  15 minutos sem acessos. Ao abrir novamente, ele pode levar cerca de um minuto.

Os planos gratuitos têm limites de uso; mantenha a seleção Free nos dois serviços.
Não publique credenciais nem use o banco compartilhado para testes que apagam dados.

Referências: [Render Docker](https://render.com/docs/docker),
[Blueprint](https://render.com/docs/blueprint-spec),
[limites Free](https://render.com/docs/free),
[conexão Neon](https://neon.com/docs/get-started/connect-neon).

## Atualização: cadastro profissional guiado

Antes de publicar esta versão, execute `database/cadastro_profissional.sql` no
Neon conectado à aplicação. Ele preserva os dados e acrescenta bairro,
habilidades, opção de iniciante e histórico de análise. Veja
[documentação da entrega](CADASTRO_PROFISSIONAL.md). Configure também
BREVO_API_KEY, EMAIL_FROM e APP_URL no Render para recuperação de senha.
