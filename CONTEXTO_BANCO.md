# CONTEXTO_BANCO.md

Arquivo de referencia do banco de dados. Deve ficar na raiz do repositorio.

Quem consulta este arquivo: qualquer pessoa ou agente que va escrever codigo que
toque o banco — classes de modelo, DAO, service, endpoints da API ou consumo no
frontend. Antes de escrever qualquer consulta, conferir aqui os nomes, os tipos e
os caminhos de navegacao.

Se o codigo divergir deste arquivo, o arquivo esta certo e o codigo esta errado.
Se o modelo mudar, atualizar este arquivo na mesma alteracao.

---

## 1. Stack

- Linguagem: Java
- Banco: PostgreSQL
- Acesso ao banco: JDBC puro com padrao DAO. Sem ORM, sem Hibernate, sem JPA.
- Camadas: `model`, `dao`, `service`, `view`

Estrutura de pastas:

```
src/
  model/       classes que espelham as tabelas, so atributos e get/set
  dao/         classes que executam SQL, uma por tabela
  service/     regras de negocio, orquestra os DAO
  view/        interface com o usuario (ou controller da API)
  util/        Conexao.java e utilitarios
```

Regra das camadas:

- `view` nunca chama `dao` direto. Sempre passa por `service`.
- `dao` nunca contem regra de negocio. So SQL.
- `model` nao contem SQL nem logica.

---

## 2. Conexao

Driver: `org.postgresql.Driver`
Formato da URL: `jdbc:postgresql://HOST:PORTA/NOME_DO_BANCO`

Exemplo local: `jdbc:postgresql://localhost:5432/plataforma_servicos`

Existe uma unica classe responsavel por abrir conexao: `src/util/Conexao.java`.
Nenhum outro arquivo pode chamar `DriverManager.getConnection` diretamente.

Credenciais nao ficam no codigo. Ficam em arquivo de configuracao fora do
controle de versao.

---

## 3. Padrao de nomes

| Onde | Padrao | Exemplo |
|---|---|---|
| Tabela | plural, minusculo, underline | `solicitacoes` |
| Coluna | minusculo, underline | `data_solicitacao` |
| Classe de modelo | singular, PascalCase | `Solicitacao` |
| Atributo Java | camelCase | `dataSolicitacao` |
| Classe DAO | `NomeDAO` | `SolicitacaoDAO` |
| Chave estrangeira | `entidade_id` | `servico_id` |

A conversao entre `data_solicitacao` e `dataSolicitacao` e manual, feita no DAO.
Nao existe mapeamento automatico.

---

## 4. Esquema completo

Cinco tabelas. Nao existem outras. Nao criar tabela, coluna, view ou trigger que
nao esteja aqui.

### usuarios

Uma unica tabela de pessoas. Nao existe tabela de cliente nem de prestador.
O papel e definido pelo que a pessoa faz: quem cadastra servico atua como
prestador, quem envia solicitacao atua como cliente. A mesma conta faz as duas.

| Coluna | Tipo PostgreSQL | Nulo | Tipo Java |
|---|---|---|---|
| id | SERIAL PK | nao | int |
| nome | VARCHAR(100) | nao | String |
| email | VARCHAR(150) UNIQUE | nao | String |
| senha | VARCHAR(255) | nao | String |
| telefone | VARCHAR(20) | sim | String |
| cidade | VARCHAR(100) | nao | String |
| estado | CHAR(2) | nao | String |
| foto | VARCHAR(255) | sim | String |
| data_cadastro | TIMESTAMPTZ | nao | OffsetDateTime |

`senha` guarda hash BCrypt. Nunca gravar texto puro, nunca devolver esse campo
em resposta de API.
`foto` guarda o caminho do arquivo em disco, nao a imagem.

### categorias

| Coluna | Tipo PostgreSQL | Nulo | Tipo Java |
|---|---|---|---|
| id | SERIAL PK | nao | int |
| nome | VARCHAR(80) UNIQUE | nao | String |
| descricao | VARCHAR(255) | sim | String |

Tabela de apoio. Preenchida uma vez, raramente muda.

### servicos

| Coluna | Tipo PostgreSQL | Nulo | Tipo Java |
|---|---|---|---|
| id | SERIAL PK | nao | int |
| usuario_id | INTEGER FK usuarios(id) | nao | int |
| categoria_id | INTEGER FK categorias(id) | nao | int |
| titulo | VARCHAR(120) | nao | String |
| descricao | TEXT | sim | String |
| ativo | BOOLEAN DEFAULT true | nao | boolean |
| data_cadastro | TIMESTAMPTZ | nao | OffsetDateTime |

`usuario_id` e o dono do servico, ou seja, o prestador.
`ativo` em false esconde o servico da busca sem apagar o registro.

### solicitacoes

| Coluna | Tipo PostgreSQL | Nulo | Tipo Java |
|---|---|---|---|
| id | SERIAL PK | nao | int |
| cliente_id | INTEGER FK usuarios(id) | nao | int |
| servico_id | INTEGER FK servicos(id) | nao | int |
| mensagem | TEXT | sim | String |
| status | VARCHAR(20) DEFAULT 'PENDENTE' | nao | String |
| data_solicitacao | TIMESTAMPTZ | nao | OffsetDateTime |

Valores aceitos em `status`, garantidos por CHECK no banco:

```
PENDENTE  ACEITA  RECUSADA  CONCLUIDA
```

Sempre em maiusculo, sem acento. Qualquer outro valor faz o INSERT falhar.

### avaliacoes

| Coluna | Tipo PostgreSQL | Nulo | Tipo Java |
|---|---|---|---|
| id | SERIAL PK | nao | int |
| avaliador_id | INTEGER FK usuarios(id) | nao | int |
| avaliado_id | INTEGER FK usuarios(id) | nao | int |
| solicitacao_id | INTEGER FK solicitacoes(id) UNIQUE | nao | int |
| nota | INTEGER | nao | int |
| comentario | TEXT | sim | String |
| data_avaliacao | TIMESTAMPTZ | nao | OffsetDateTime |

Restricoes do banco:

- `solicitacao_id` e UNIQUE. Uma solicitacao gera no maximo uma avaliacao.
- `nota` aceita apenas de 0 a 5.
- `avaliador_id` nao pode ser igual a `avaliado_id`.

---

## 5. Relacionamentos e caminhos de navegacao

```
usuarios     1 -- N  servicos       (servicos.usuario_id)
categorias   1 -- N  servicos       (servicos.categoria_id)
usuarios     1 -- N  solicitacoes   (solicitacoes.cliente_id)
servicos     1 -- N  solicitacoes   (solicitacoes.servico_id)
usuarios     1 -- N  avaliacoes     (avaliacoes.avaliador_id)
usuarios     1 -- N  avaliacoes     (avaliacoes.avaliado_id)
solicitacoes 1 -- 1  avaliacoes     (avaliacoes.solicitacao_id)
```

**Ponto que mais gera erro:** `solicitacoes` NAO tem coluna do prestador.
Quem recebe a solicitacao e alcancado por este caminho:

```
solicitacoes.servico_id  ->  servicos.id
servicos.usuario_id      ->  usuarios.id   (este e o prestador)
```

Nao criar `prestador_id` em `solicitacoes`. Se o codigo precisar do prestador,
fazer JOIN.

---

## 6. Regras que ficam no Java, nunca no banco

O banco nao consegue verificar estas. O `service` e responsavel por elas.

1. Um usuario nao pode solicitar o proprio servico.
   Comparar `solicitacoes.cliente_id` com `servicos.usuario_id` antes do INSERT.
2. So pode avaliar quem participou da solicitacao, e apenas se o status for
   `CONCLUIDA`.
3. `avaliador_id` e `avaliado_id` precisam ser os dois participantes daquela
   solicitacao especifica.
4. A senha vira hash BCrypt antes de chegar ao DAO.
5. Mudanca de status segue esta ordem, sem pular:
   `PENDENTE -> ACEITA -> CONCLUIDA` ou `PENDENTE -> RECUSADA`.
   Nao existe volta.
6. A media de notas e calculada com `AVG` na consulta. Nunca gravar em coluna.

---

## 7. Consultas prontas

Usar estas como base. Sempre com `PreparedStatement` e `?`, nunca concatenando
texto.

**Buscar servicos ativos por categoria e cidade**

```sql
SELECT s.id, s.titulo, s.descricao,
       u.id AS prestador_id, u.nome AS prestador_nome, u.cidade, u.foto,
       c.nome AS categoria
FROM servicos s
JOIN usuarios   u ON u.id = s.usuario_id
JOIN categorias c ON c.id = s.categoria_id
WHERE s.ativo = true
  AND c.id = ?
  AND u.cidade ILIKE ?
ORDER BY s.data_cadastro DESC;
```

`ILIKE` ignora maiusculas e minusculas.

**Servicos cadastrados por um usuario**

```sql
SELECT s.id, s.titulo, s.ativo, c.nome AS categoria
FROM servicos s
JOIN categorias c ON c.id = s.categoria_id
WHERE s.usuario_id = ?
ORDER BY s.data_cadastro DESC;
```

**Solicitacoes recebidas por um prestador** (usa o caminho da secao 5)

```sql
SELECT sol.id, sol.mensagem, sol.status, sol.data_solicitacao,
       s.titulo AS servico,
       cli.nome AS cliente_nome, cli.telefone
FROM solicitacoes sol
JOIN servicos s   ON s.id  = sol.servico_id
JOIN usuarios cli ON cli.id = sol.cliente_id
WHERE s.usuario_id = ?
ORDER BY sol.data_solicitacao DESC;
```

**Solicitacoes enviadas por um cliente**

```sql
SELECT sol.id, sol.status, sol.data_solicitacao,
       s.titulo AS servico,
       pre.nome AS prestador_nome
FROM solicitacoes sol
JOIN servicos s   ON s.id  = sol.servico_id
JOIN usuarios pre ON pre.id = s.usuario_id
WHERE sol.cliente_id = ?
ORDER BY sol.data_solicitacao DESC;
```

**Media de notas e total de avaliacoes de um usuario**

```sql
SELECT COALESCE(ROUND(AVG(nota)::numeric, 1), 0) AS media,
       COUNT(*) AS total
FROM avaliacoes
WHERE avaliado_id = ?;
```

`COALESCE` evita retornar nulo para quem ainda nao foi avaliado.

**Avaliacoes recebidas por um usuario**

```sql
SELECT a.nota, a.comentario, a.data_avaliacao,
       av.nome AS avaliador_nome
FROM avaliacoes a
JOIN usuarios av ON av.id = a.avaliador_id
WHERE a.avaliado_id = ?
ORDER BY a.data_avaliacao DESC;
```

**Mudar o status de uma solicitacao**

```sql
UPDATE solicitacoes
SET status = ?
WHERE id = ? AND status = ?;
```

O terceiro `?` e o status anterior esperado. Se outra pessoa ja mudou, o UPDATE
afeta zero linhas e o service trata isso como conflito.

**Inserir e recuperar o id gerado**

```sql
INSERT INTO usuarios (nome, email, senha, telefone, cidade, estado, foto)
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING id;
```

`RETURNING id` e do PostgreSQL e evita precisar de `getGeneratedKeys`.

---

## 8. Contrato dos DAO

Metodos minimos por DAO. Manter estes nomes.

```
UsuarioDAO
  int      inserir(Usuario u)
  Usuario  buscarPorId(int id)
  Usuario  buscarPorEmail(String email)
  boolean  atualizar(Usuario u)
  boolean  emailJaExiste(String email)

CategoriaDAO
  List<Categoria> listarTodas()
  Categoria       buscarPorId(int id)

ServicoDAO
  int            inserir(Servico s)
  List<Servico>  buscar(int categoriaId, String cidade)
  List<Servico>  listarPorUsuario(int usuarioId)
  boolean        alterarAtivo(int id, boolean ativo)
  Servico        buscarPorId(int id)                          -- adicional: usado para
                                                                  validar o dono do servico
                                                                  antes de aceitar/mudar status
                                                                  de uma solicitacao

SolicitacaoDAO
  int                inserir(Solicitacao s)
  List<Solicitacao>  listarRecebidas(int prestadorId)
  List<Solicitacao>  listarEnviadas(int clienteId)
  boolean            mudarStatus(int id, String de, String para)
  Solicitacao        buscarPorId(int id)                      -- adicional: usado para
                                                                  validar participantes antes
                                                                  de aceitar uma avaliacao

AvaliacaoDAO
  int              inserir(Avaliacao a)
  List<Avaliacao>  listarPorAvaliado(int usuarioId)
  double           mediaDe(int usuarioId)
  boolean          jaAvaliou(int solicitacaoId)
```

Todo DAO usa `try-with-resources` para fechar `Connection`, `PreparedStatement`
e `ResultSet`.

---

## 9. Se o projeto virar API REST

Mapeamento sugerido. Manter os nomes de recurso no plural, iguais aos das tabelas.

```
POST   /usuarios                  cadastro
POST   /login                     autenticacao
GET    /usuarios/{id}             perfil publico (sem o campo senha)
GET    /categorias                lista fixa
GET    /servicos?categoria=&cidade=   busca
POST   /servicos                  cadastrar servico
PATCH  /servicos/{id}             ativar ou desativar
POST   /solicitacoes              enviar solicitacao
GET    /solicitacoes/recebidas    do usuario autenticado
GET    /solicitacoes/enviadas     do usuario autenticado
PATCH  /solicitacoes/{id}/status  aceitar, recusar, concluir
POST   /avaliacoes                avaliar
GET    /usuarios/{id}/avaliacoes  avaliacoes recebidas
```

O campo `senha` nunca aparece em nenhuma resposta.
O `id` do usuario autenticado vem da sessao ou do token, nunca do corpo da
requisicao enviada pelo frontend.

---

## 10. Erros a evitar

- Concatenar texto para montar SQL. Sempre `PreparedStatement` com `?`.
- Criar `prestador_id` em `solicitacoes`.
- Gravar media de nota em coluna.
- Guardar a imagem dentro do banco em vez do caminho.
- Devolver `senha` em consulta ou em resposta de API.
- Escrever status em minusculo ou com acento.
- Usar `SELECT *`. Listar as colunas necessarias.
- Deixar `Connection` aberta.
- Confiar em id de usuario enviado pelo frontend para decidir permissao.

---

## 11. Checklist antes de dar commit

- [ ] Nomes de coluna batem exatamente com a secao 4
- [ ] Toda consulta usa `PreparedStatement`
- [ ] Nenhuma regra da secao 6 ficou de fora do `service`
- [ ] `try-with-resources` em todo acesso ao banco
- [ ] Nenhuma senha aparece em log ou em retorno
- [ ] Este arquivo continua correspondendo ao codigo
