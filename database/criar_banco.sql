-- =============================================================
-- Projeto: SITE-FINDY - Plataforma de conexao entre prestadores
--          de servico e clientes
-- Banco:   PostgreSQL
-- Data:    2026-09-07
--
-- Este script cria o esquema completo do banco e popula as
-- tabelas com dados de exemplo. Pode ser executado repetidas
-- vezes em um banco vazio (os DROP no inicio garantem isso).
-- =============================================================

-- -------------------------------------------------------------
-- Remocao das tabelas, em ordem inversa de dependencia,
-- para permitir rodar este script mais de uma vez.
-- -------------------------------------------------------------
DROP TABLE IF EXISTS avaliacoes;
DROP TABLE IF EXISTS solicitacoes;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

-- -------------------------------------------------------------
-- Tabela de pessoas. Nao existe tabela separada de cliente ou
-- de prestador: o papel de cada pessoa e definido pelo que ela
-- faz (quem cadastra servico atua como prestador, quem envia
-- solicitacao atua como cliente). A mesma conta faz as duas.
-- -------------------------------------------------------------
CREATE TABLE usuarios (
    id             SERIAL         CONSTRAINT pk_usuarios PRIMARY KEY,
    nome           VARCHAR(100)   NOT NULL,
    email          VARCHAR(150)   NOT NULL,
    senha          VARCHAR(255)   NOT NULL, -- guarda hash BCrypt, nunca texto puro
    telefone       VARCHAR(20)    NULL,
    cidade         VARCHAR(100)   NOT NULL,
    estado         CHAR(2)        NOT NULL,
    foto           VARCHAR(255)   NULL,     -- caminho do arquivo em disco, nunca a imagem
    data_cadastro  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

-- -------------------------------------------------------------
-- Categorias de servico. Tabela de apoio, preenchida uma vez.
-- -------------------------------------------------------------
CREATE TABLE categorias (
    id         SERIAL        CONSTRAINT pk_categorias PRIMARY KEY,
    nome       VARCHAR(80)   NOT NULL,
    descricao  VARCHAR(255)  NULL,
    CONSTRAINT uq_categorias_nome UNIQUE (nome)
);

-- -------------------------------------------------------------
-- Servicos oferecidos por um usuario (atuando como prestador),
-- classificados em uma categoria.
-- -------------------------------------------------------------
CREATE TABLE servicos (
    id             SERIAL        CONSTRAINT pk_servicos PRIMARY KEY,
    usuario_id     INTEGER       NOT NULL,
    categoria_id   INTEGER       NOT NULL,
    titulo         VARCHAR(120)  NOT NULL,
    descricao      TEXT          NULL,
    ativo          BOOLEAN       NOT NULL DEFAULT true,
    data_cadastro  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT fk_servicos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_servicos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE RESTRICT
);

-- -------------------------------------------------------------
-- Solicitacoes de orcamento feitas por um usuario (atuando como
-- cliente) sobre um servico. O prestador NAO tem coluna propria
-- aqui: e alcancado via solicitacoes.servico_id -> servicos.id
-- -> servicos.usuario_id. Nao criar prestador_id nesta tabela.
-- -------------------------------------------------------------
CREATE TABLE solicitacoes (
    id                SERIAL       CONSTRAINT pk_solicitacoes PRIMARY KEY,
    cliente_id        INTEGER      NOT NULL,
    servico_id        INTEGER      NOT NULL,
    mensagem          TEXT         NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
    data_solicitacao  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_solicitacoes_cliente
        FOREIGN KEY (cliente_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_servico
        FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE,
    -- impede qualquer status fora do fluxo PENDENTE/ACEITA/RECUSADA/CONCLUIDA
    CONSTRAINT ck_solicitacoes_status
        CHECK (status IN ('PENDENTE', 'ACEITA', 'RECUSADA', 'CONCLUIDA'))
);

-- -------------------------------------------------------------
-- Avaliacao que um usuario (avaliador) faz de outro usuario
-- (avaliado), vinculada a uma solicitacao especifica.
-- -------------------------------------------------------------
CREATE TABLE avaliacoes (
    id              SERIAL       CONSTRAINT pk_avaliacoes PRIMARY KEY,
    avaliador_id    INTEGER      NOT NULL,
    avaliado_id     INTEGER      NOT NULL,
    solicitacao_id  INTEGER      NOT NULL,
    nota            INTEGER      NOT NULL,
    comentario      TEXT         NULL,
    data_avaliacao  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_avaliacoes_avaliador
        FOREIGN KEY (avaliador_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_avaliacoes_avaliado
        FOREIGN KEY (avaliado_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_avaliacoes_solicitacao
        FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes (id) ON DELETE CASCADE,
    -- uma solicitacao gera no maximo uma avaliacao
    CONSTRAINT uq_avaliacoes_solicitacao UNIQUE (solicitacao_id),
    -- nota so pode ir de 0 a 5
    CONSTRAINT ck_avaliacoes_nota CHECK (nota BETWEEN 0 AND 5),
    -- ninguem pode avaliar a si mesmo
    CONSTRAINT ck_avaliacoes_avaliador_avaliado CHECK (avaliador_id <> avaliado_id)
);

-- -------------------------------------------------------------
-- Indices exigidos pela especificacao
-- -------------------------------------------------------------
CREATE INDEX idx_servicos_usuario_id     ON servicos (usuario_id);
CREATE INDEX idx_servicos_categoria_id   ON servicos (categoria_id);
CREATE INDEX idx_servicos_ativo          ON servicos (ativo);
CREATE INDEX idx_solicitacoes_cliente_id ON solicitacoes (cliente_id);
CREATE INDEX idx_solicitacoes_servico_id ON solicitacoes (servico_id);
CREATE INDEX idx_solicitacoes_status     ON solicitacoes (status);
CREATE INDEX idx_avaliacoes_avaliador_id ON avaliacoes (avaliador_id);
CREATE INDEX idx_avaliacoes_avaliado_id  ON avaliacoes (avaliado_id);
CREATE INDEX idx_usuarios_cidade         ON usuarios (cidade);

-- =============================================================
-- DADOS DE EXEMPLO
-- Os valores da coluna "senha" sao apenas exemplos no formato de
-- hash BCrypt, para ilustrar que o texto puro nunca e gravado.
-- Nao correspondem a uma senha real utilizavel para login.
-- =============================================================

-- 6 usuarios
INSERT INTO usuarios (nome, email, senha, telefone, cidade, estado, foto) VALUES
('Ana Souza',      'ana@email.com',    '$2a$10$exemploHashBCrypt.ana.0000000000000000000000', '11988880001', 'Sao Paulo',       'SP', NULL),
('Bruno Lima',     'bruno@email.com',  '$2a$10$exemploHashBCrypt.bru.0000000000000000000000', '11988880002', 'Sao Paulo',       'SP', NULL),
('Carla Mendes',   'carla@email.com',  '$2a$10$exemploHashBCrypt.car.0000000000000000000000', '19988880003', 'Campinas',        'SP', NULL),
('Diego Alves',    'diego@email.com',  '$2a$10$exemploHashBCrypt.die.0000000000000000000000', '21988880004', 'Rio de Janeiro',  'RJ', NULL),
('Elisa Ferreira', 'elisa@email.com',  '$2a$10$exemploHashBCrypt.eli.0000000000000000000000', '31988880005', 'Belo Horizonte',  'MG', NULL),
('Fabio Rocha',    'fabio@email.com',  '$2a$10$exemploHashBCrypt.fab.0000000000000000000000', '41988880006', 'Curitiba',        'PR', NULL);

-- 5 categorias
INSERT INTO categorias (nome, descricao) VALUES
('Jardinagem',                    'Manutencao, poda e paisagismo de jardins'),
('Pintura',                       'Pintura residencial e comercial, interna e externa'),
('Limpeza',                       'Limpeza domestica, comercial e pos-obra'),
('Eletrica',                      'Instalacao e reparo de sistemas eletricos'),
('Tecnologia da Informacao',      'Manutencao de computadores, criacao de sites e suporte tecnico');

-- 8 servicos
INSERT INTO servicos (usuario_id, categoria_id, titulo, descricao, ativo) VALUES
(1, 1, 'Manutencao de jardins residenciais',       'Poda, adubacao e cuidado geral de jardins',              true),
(1, 3, 'Limpeza pos-obra',                         'Limpeza pesada apos reforma ou construcao',              true),
(2, 4, 'Instalacao e reparo eletrico',             'Instalacao de tomadas, disjuntores e fiacao',            true),
(3, 2, 'Pintura interna e externa',                'Pintura de paredes, muros e fachadas',                   true),
(4, 5, 'Criacao de sites institucionais',          'Desenvolvimento de sites para pequenas empresas',        true),
(4, 5, 'Suporte tecnico remoto',                   'Atendimento remoto para problemas de software',          true),
(5, 1, 'Poda e paisagismo',                        'Projetos de paisagismo e poda de arvores',               true),
(6, 5, 'Manutencao de computadores e notebooks',   'Formatacao, limpeza e troca de pecas',                   false);

-- 6 solicitacoes, cobrindo os quatro status possiveis
INSERT INTO solicitacoes (cliente_id, servico_id, mensagem, status) VALUES
(2, 1, 'Preciso de manutencao no jardim da frente.',        'CONCLUIDA'),
(3, 3, 'Tomada queimada na cozinha, pode verificar?',       'CONCLUIDA'),
(1, 5, 'Quero um site simples para minha loja.',            'CONCLUIDA'),
(5, 4, 'Gostaria de orcamento para pintar a sala.',         'ACEITA'),
(6, 6, 'Meu notebook nao liga mais.',                       'RECUSADA'),
(4, 7, 'Preciso de um paisagista para o quintal.',          'PENDENTE');

-- 3 avaliacoes, uma para cada solicitacao ja concluida
INSERT INTO avaliacoes (avaliador_id, avaliado_id, solicitacao_id, nota, comentario) VALUES
(2, 1, 1, 5, 'Servico excelente, jardim ficou impecavel.'),
(3, 2, 2, 4, 'Resolveu o problema rapido, so demorou um pouco para chegar.'),
(1, 4, 3, 5, 'Site ficou otimo e dentro do prazo combinado.');
