// Rode: node database/gerar_demonstracao.cjs
// Extrai os exemplos antigos uma vez e passa a usar o JSON preservado nesta pasta.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const arquivoDados = path.join(__dirname, 'profissionais_demonstracao.json');
const arquivoSql = path.join(__dirname, 'dados_demonstracao.sql');

if (!fs.existsSync(arquivoDados)) {
  const codigo = fs.readFileSync(path.join(__dirname, '../frontend/pages/script.js'), 'utf8');
  const trecho = codigo.match(
    /const PROFISSIONAIS_POR_CATEGORIA\s*=\s*([\s\S]*?);\s*const CATEGORIA_PADRAO/
  );
  if (!trecho) throw new Error('A lista antiga não foi encontrada e ainda não existe o JSON de demonstração.');
  const grupos = vm.runInNewContext('(' + trecho[1] + ')', Object.create(null), { timeout: 1000 });
  const dados = Object.entries(grupos).flatMap(([categoria, pessoas]) =>
    pessoas.map(({ nome, foto, descricao }) => ({ categoria, nome, foto, descricao }))
  );
  fs.writeFileSync(arquivoDados, JSON.stringify(dados, null, 2) + '\n', 'utf8');
}

const dados = JSON.parse(fs.readFileSync(arquivoDados, 'utf8'));
if (!Array.isArray(dados) || !dados.length) throw new Error('Lista de demonstração vazia ou inválida.');
const emails = new Set();
const sqlTexto = valor => "'" + valor.replaceAll("'", "''") + "'";
const linhas = dados.map(pessoa => {
  for (const campo of ['nome', 'foto', 'descricao', 'categoria']) {
    if (typeof pessoa[campo] !== 'string' || !pessoa[campo].trim() || pessoa[campo].includes('\0')) {
      throw new Error('Campo inválido nos dados de demonstração: ' + campo);
    }
  }
  const codigo = crypto.createHash('sha256').update(pessoa.categoria + ':' + pessoa.nome)
    .digest('hex').slice(0, 24);
  const email = `demo.${codigo}@example.invalid`;
  if (emails.has(email)) throw new Error('Profissional repetido: ' + pessoa.nome);
  emails.add(email);
  return '(' + [email, pessoa.nome, pessoa.foto, pessoa.descricao, pessoa.categoria]
    .map(sqlTexto).join(', ') + ')';
}).join(',\n');

const sql = `-- Gerado por gerar_demonstracao.cjs a partir do JSON preservado.
-- Somente demonstração: sem notas fictícias, sem senhas compartilhadas e sem UPDATE de cadastros.
-- Execute com psql --set=ON_ERROR_STOP=1. A transação já está neste arquivo.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE papel='ADMIN' AND ativo) THEN
        RAISE EXCEPTION 'É necessário um administrador ativo antes de importar os exemplos.';
    END IF;
END;
$$;

CREATE TEMP TABLE findy_demo (
    email TEXT, nome TEXT, foto TEXT, descricao TEXT, categoria TEXT
) ON COMMIT DROP;

INSERT INTO findy_demo (email, nome, foto, descricao, categoria)
VALUES
${linhas};

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM findy_demo d
        LEFT JOIN categorias c ON c.nome=d.categoria WHERE c.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Uma categoria dos exemplos não existe no banco.';
    END IF;
END;
$$;

INSERT INTO usuarios (nome, email, senha_hash, cidade, estado, foto, papel, ativo)
SELECT d.nome, d.email, crypt(gen_random_uuid()::TEXT, gen_salt('bf', 10)),
       'Patos de Minas', 'MG', d.foto, 'USUARIO', TRUE
FROM findy_demo d
ON CONFLICT DO NOTHING;

INSERT INTO prestadores (
    usuario_id, descricao_profissional, experiencia, regiao_atendimento,
    status_aprovacao, analisado_por, data_analise, ativo
)
SELECT u.id, '[DEMONSTRAÇÃO] ' || d.descricao,
       'Perfil fictício para apresentação do projeto.', 'Patos de Minas e região',
       'APROVADO', administrador.id, CURRENT_TIMESTAMP, TRUE
FROM findy_demo d
JOIN usuarios u ON u.email=d.email
CROSS JOIN (
    SELECT id FROM usuarios WHERE papel='ADMIN' AND ativo ORDER BY id LIMIT 1
) administrador
ON CONFLICT (usuario_id) DO NOTHING;

INSERT INTO servicos (
    prestador_id, categoria_id, titulo, descricao, preco, unidade_cobranca, ativo
)
SELECT p.id, c.id, LEFT(d.descricao, 120), '[DEMONSTRAÇÃO] ' || d.descricao,
       NULL, 'SERVICO', TRUE
FROM findy_demo d
JOIN usuarios u ON u.email=d.email
JOIN prestadores p ON p.usuario_id=u.id
JOIN categorias c ON c.nome=d.categoria
WHERE NOT EXISTS (
    SELECT 1 FROM servicos s WHERE s.prestador_id=p.id
    AND s.categoria_id=c.id AND s.titulo=LEFT(d.descricao, 120)
);
COMMIT;
`;

fs.writeFileSync(arquivoSql, sql, 'utf8');
console.log(`SQL gerado para ${dados.length} profissionais em ${new Set(dados.map(p => p.categoria)).size} categorias.`);
