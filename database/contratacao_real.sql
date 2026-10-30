-- Acrescenta a quantidade contratada sem recriar tabelas ou apagar pedidos existentes.
BEGIN;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS preco_maximo NUMERIC(10,2);
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS valor_unitario_maximo NUMERIC(10,2);
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS quantidade NUMERIC(6,2);
UPDATE solicitacoes SET quantidade=CASE
    WHEN unidade_cobranca='HORA' AND duracao_horas IS NOT NULL THEN duracao_horas
    ELSE 1 END WHERE quantidade IS NULL;
ALTER TABLE solicitacoes ALTER COLUMN quantidade SET DEFAULT 1;
ALTER TABLE solicitacoes ALTER COLUMN quantidade SET NOT NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname='ck_servicos_faixa_preco' AND conrelid='servicos'::regclass) THEN
        ALTER TABLE servicos ADD CONSTRAINT ck_servicos_faixa_preco
            CHECK (preco_maximo IS NULL OR (preco IS NOT NULL AND preco_maximo >= preco));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname='ck_solicitacoes_faixa_preco' AND conrelid='solicitacoes'::regclass) THEN
        ALTER TABLE solicitacoes ADD CONSTRAINT ck_solicitacoes_faixa_preco
            CHECK (valor_unitario_maximo IS NULL OR
                (valor_unitario IS NOT NULL AND valor_unitario_maximo >= valor_unitario));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname='ck_solicitacoes_quantidade' AND conrelid='solicitacoes'::regclass) THEN
        ALTER TABLE solicitacoes ADD CONSTRAINT ck_solicitacoes_quantidade CHECK (quantidade > 0);
    END IF;
END $$;
COMMIT;
