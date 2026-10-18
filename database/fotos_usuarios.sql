-- Guarda uma foto de perfil por conta, mantendo a imagem disponível também na hospedagem.

BEGIN;

CREATE TABLE IF NOT EXISTS fotos_usuarios (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    conteudo BYTEA NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('image/jpeg', 'image/png')),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (octet_length(conteudo) BETWEEN 1 AND 2097152)
);

COMMIT;
