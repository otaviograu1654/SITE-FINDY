-- Importa os profissionais e serviços fictícios para demonstração sem duplicar registros existentes.

-- Gerado por gerar_demonstracao.cjs a partir do JSON preservado.
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
('demo.07c0ad9122a760be62537fa3@example.invalid', 'Camila Duarte', 'https://i.pravatar.cc/400?img=32', 'Diarista e organizadora, atendimento pontual e cuidadoso.', 'Serviços Domésticos'),
('demo.1cb8de9f8087936c72dd4a33@example.invalid', 'Fernanda Castro', 'https://i.pravatar.cc/400?img=47', 'Diarista com referências e disponibilidade imediata.', 'Serviços Domésticos'),
('demo.09df8ddbca27fb3d8c1e4c70@example.invalid', 'Priscila Andrade', 'https://i.pravatar.cc/400?img=44', 'Personal organizer, transforma qualquer ambiente.', 'Serviços Domésticos'),
('demo.6db9b06037e0b52d451fd359@example.invalid', 'Bruna Siqueira', 'https://i.pravatar.cc/400?img=29', 'Cuidadora de idosos, curso técnico em enfermagem.', 'Serviços Domésticos'),
('demo.436642d718b411ce9ef73c07@example.invalid', 'Marta Souza', 'https://i.pravatar.cc/400?img=5', 'Cozinheira doméstica, marmitas e refeições sob encomenda.', 'Serviços Domésticos'),
('demo.cc05489f1e9fdbc23a2b4409@example.invalid', 'Simone Rocha', 'https://i.pravatar.cc/400?img=9', 'Arrumadeira, organização e limpeza geral da casa.', 'Serviços Domésticos'),
('demo.1dc93d2e1eac79cb7763377b@example.invalid', 'Wagner Lopes', 'https://i.pravatar.cc/400?img=13', 'Jardineiro residencial, poda e manutenção de jardins.', 'Serviços Domésticos'),
('demo.3679e9f6275bf1c078da4287@example.invalid', 'Patrícia Mendes', 'https://i.pravatar.cc/400?img=18', 'Lavadeira e passadeira, entrega em domicílio.', 'Serviços Domésticos'),
('demo.f75f59417d2ef9b73d3422c0@example.invalid', 'Carlos Eduardo Reis', 'https://i.pravatar.cc/400?img=24', 'Dedetizador, controle de pragas residencial.', 'Serviços Domésticos'),
('demo.b3371d325305ba276053d743@example.invalid', 'Juliana Ferraz', 'https://i.pravatar.cc/400?img=36', 'Limpeza pós-obra e faxina pesada.', 'Serviços Domésticos'),
('demo.fa03ea2e11967475eb28b009@example.invalid', 'Vanessa Lopes', 'https://i.pravatar.cc/400?img=41', 'Governanta, cuida da rotina completa da casa.', 'Serviços Domésticos'),
('demo.a5ed8fe50f75d7b69a01171d@example.invalid', 'Roberta Aquino', 'https://i.pravatar.cc/400?img=6', 'Passadeira profissional, roupas do dia a dia.', 'Serviços Domésticos'),
('demo.0d43e65b47fb4c8731836964@example.invalid', 'Débora Martins', 'https://i.pravatar.cc/400?img=68', 'Confeiteira, bolos e doces sob encomenda para festas.', 'Eventos'),
('demo.12e8bca716015a7a750c062e@example.invalid', 'Renata Alves', 'https://i.pravatar.cc/400?img=3', 'Cerimonialista, planejamento completo de eventos.', 'Eventos'),
('demo.846cacb1b6adc8bc3af9534c@example.invalid', 'Marcelo Teixeira', 'https://i.pravatar.cc/400?img=8', 'DJ para festas e casamentos.', 'Eventos'),
('demo.90071fc7a701a9d23cc15d5c@example.invalid', 'Helena Prado', 'https://i.pravatar.cc/400?img=14', 'Decoradora de eventos e festas temáticas.', 'Eventos'),
('demo.e65f0f49d65619b3a74b73a2@example.invalid', 'Bruno Castilho', 'https://i.pravatar.cc/400?img=19', 'Garçom e bartender para eventos.', 'Eventos'),
('demo.8197c7eb9d923fe6988aab9a@example.invalid', 'Camila Rezende', 'https://i.pravatar.cc/400?img=25', 'Fotógrafa de eventos e ensaios.', 'Eventos'),
('demo.f65115621047a5971b3055e2@example.invalid', 'Diego Martins', 'https://i.pravatar.cc/400?img=31', 'Som e iluminação para festas.', 'Eventos'),
('demo.1158c541ef59e4a45141416b@example.invalid', 'Beatriz Lacerda', 'https://i.pravatar.cc/400?img=39', 'Buffet e doces finos para casamentos.', 'Eventos'),
('demo.d7abcffd1a6f822469926ca4@example.invalid', 'Fábio Andrade', 'https://i.pravatar.cc/400?img=45', 'Mestre de cerimônias.', 'Eventos'),
('demo.082971a67f7c7c68b9550d75@example.invalid', 'Tatiane Borges', 'https://i.pravatar.cc/400?img=50', 'Aluguel de decoração e mobiliário para eventos.', 'Eventos'),
('demo.a7c0e25ba58b8fb86a6882fd@example.invalid', 'Rogério Nunes', 'https://i.pravatar.cc/400?img=55', 'Segurança para eventos e festas.', 'Eventos'),
('demo.adcba82ba4ca0d1841f4cabe@example.invalid', 'Vinícius Rocha', 'https://i.pravatar.cc/400?img=58', 'Fornecedor de tendas, mesas e cadeiras.', 'Eventos'),
('demo.00ccb50e525524a8b8cb4a6a@example.invalid', 'Ana Beatriz Lima', 'https://i.pravatar.cc/400?img=4', 'Babá com experiência em bebês e crianças pequenas.', 'Infantil'),
('demo.93d57750740a0a9c6de93b9f@example.invalid', 'Rodrigo Faria', 'https://i.pravatar.cc/400?img=10', 'Recreador infantil, monitor de festas.', 'Infantil'),
('demo.4572c7aa0f8e0635c20a417b@example.invalid', 'Cristiane Moura', 'https://i.pravatar.cc/400?img=16', 'Professora particular, reforço escolar.', 'Infantil'),
('demo.5e84f286521c9582769ad27c@example.invalid', 'Marina Duarte', 'https://i.pravatar.cc/400?img=20', 'Contadora de histórias para eventos infantis.', 'Infantil'),
('demo.68aa5c890e4e41dfe01eab5f@example.invalid', 'Felipe Rocha', 'https://i.pravatar.cc/400?img=27', 'Personagem vivo para festas infantis.', 'Infantil'),
('demo.fd0dad41dea5eadb0b04e23c@example.invalid', 'Luciana Peixoto', 'https://i.pravatar.cc/400?img=34', 'Cuidadora infantil em período integral.', 'Infantil'),
('demo.560926d9c3ec815d4b232f97@example.invalid', 'Gabriel Souza', 'https://i.pravatar.cc/400?img=37', 'Professor de reforço em matemática.', 'Infantil'),
('demo.9720ca8b9b7d440a0bbad046@example.invalid', 'Isadora Campos', 'https://i.pravatar.cc/400?img=42', 'Musicalização infantil.', 'Infantil'),
('demo.4d43480521f025c1f4bea676@example.invalid', 'Henrique Alves', 'https://i.pravatar.cc/400?img=48', 'Recreação com brinquedos infláveis.', 'Infantil'),
('demo.963700bddfb92c1285b9aeb9@example.invalid', 'Vitória Nascimento', 'https://i.pravatar.cc/400?img=53', 'Babá noturna e plantões.', 'Infantil'),
('demo.308bf6439cfb0e393172b05b@example.invalid', 'Diego Paiva', 'https://i.pravatar.cc/400?img=57', 'Aulas de reforço escolar geral.', 'Infantil'),
('demo.86fda4fceb21e0a4c899b518@example.invalid', 'Paula Andrade', 'https://i.pravatar.cc/400?img=62', 'Professora de inglês para crianças.', 'Infantil'),
('demo.172b47ec2eb557ca176ece81@example.invalid', 'José Humberto', 'images/pro-jose-humberto.jpg', 'Eletricista residencial, mais de 10 anos de experiência.', 'Serviços Gerais'),
('demo.c1f304396df5fc90a3e8549f@example.invalid', 'Thiago Nogueira', 'https://i.pravatar.cc/400?img=22', 'Motorista de fretes e mudanças.', 'Serviços Gerais'),
('demo.3f5e502f06edfc77b030fad8@example.invalid', 'Rafael Tavares', 'https://i.pravatar.cc/400?img=15', 'Jardineiro e paisagista, cuida de quintais e áreas verdes.', 'Serviços Gerais'),
('demo.68b6457f033a4e6c822f5ee4@example.invalid', 'Vagner Correia', 'https://i.pravatar.cc/400?img=63', 'Chaveiro 24 horas.', 'Serviços Gerais'),
('demo.18edb739900f2990214c732f@example.invalid', 'Sandra Melo', 'https://i.pravatar.cc/400?img=6', 'Costureira, ajustes e consertos de roupa.', 'Serviços Gerais'),
('demo.513d59d8ee40378b6a81c4bf@example.invalid', 'Alexandre Vieira', 'https://i.pravatar.cc/400?img=11', 'Montador de móveis planejados e de loja.', 'Serviços Gerais'),
('demo.b630887ed4da0e911a86dfc0@example.invalid', 'Roberta Cunha', 'https://i.pravatar.cc/400?img=17', 'Manicure e pedicure a domicílio.', 'Serviços Gerais'),
('demo.c8cd1b56ee7715456c157bbd@example.invalid', 'Marcos Antunes', 'https://i.pravatar.cc/400?img=23', 'Dedetização e desentupimento.', 'Serviços Gerais'),
('demo.194c3b760c7bac3e5df8f678@example.invalid', 'Elaine Barros', 'https://i.pravatar.cc/400?img=28', 'Passadeira profissional, entrega e retirada em casa.', 'Serviços Gerais'),
('demo.e4d0e2cf39d8c40d98ef7565@example.invalid', 'Ricardo Nascimento', 'https://i.pravatar.cc/400?img=33', 'Técnico em ar-condicionado, instalação e manutenção.', 'Serviços Gerais'),
('demo.d9e54ae7e6ecb2530c115083@example.invalid', 'Fabiana Rocha', 'https://i.pravatar.cc/400?img=38', 'Personal shopper e consultoria de estilo.', 'Serviços Gerais'),
('demo.54aded5126931b1ccb9ac337@example.invalid', 'Douglas Ramos', 'https://i.pravatar.cc/400?img=43', 'Frete e carreto para mudanças pequenas.', 'Serviços Gerais'),
('demo.b907b4e04432866c99d2d230@example.invalid', 'Amilton Ribeiro', 'images/pro-amilton-ribeiro.jpg', 'Pintor profissional, reformas rápidas e acabamento fino.', 'Construção Civil'),
('demo.bf765f3cece11baf3c0dfe35@example.invalid', 'Oswaldo Ramos', 'images/pro-oswaldo-ramos.jpg', 'Encanador disponível para emergências e instalações.', 'Construção Civil'),
('demo.417acbd739595cdf2c2b9451@example.invalid', 'Gustavo Figueira', 'images/pro-gustavo-figueira.jpg', 'Marceneiro especializado em móveis planejados.', 'Construção Civil'),
('demo.0062e4205ad44d88b0c1306f@example.invalid', 'Paulo Sérgio Duarte', 'https://i.pravatar.cc/400?img=49', 'Pedreiro, reformas e construções pequenas.', 'Construção Civil'),
('demo.9129de24831e5af5f48b5e7b@example.invalid', 'Renato Souza', 'https://i.pravatar.cc/400?img=54', 'Mestre de obras, acompanhamento de projetos.', 'Construção Civil'),
('demo.ec33e2ba82828c2176577af1@example.invalid', 'Jorge Almeida', 'https://i.pravatar.cc/400?img=59', 'Gesseiro, forros e sancas.', 'Construção Civil'),
('demo.caaeeadbcdc0d654d4bbea0c@example.invalid', 'Wellington Dias', 'https://i.pravatar.cc/400?img=64', 'Azulejista, revestimentos e pisos.', 'Construção Civil'),
('demo.f09fde4ac62ab50e6d33fe6d@example.invalid', 'Marcelo Freitas', 'https://i.pravatar.cc/400?img=69', 'Soldador e serralheiro.', 'Construção Civil'),
('demo.4bd8792dbbaa4f9a827e6945@example.invalid', 'César Rocha', 'https://i.pravatar.cc/400?img=2', 'Instalador de piso laminado e vinílico.', 'Construção Civil'),
('demo.cf6802fafc8065ad89ca0ae0@example.invalid', 'Adriano Melo', 'https://i.pravatar.cc/400?img=7', 'Telhadista, reparos e impermeabilização de telhado.', 'Construção Civil'),
('demo.2f2c71a990fc055913a3e07f@example.invalid', 'Luiz Fernando Costa', 'https://i.pravatar.cc/400?img=12', 'Vidraceiro, instalação e reparo de vidros.', 'Construção Civil'),
('demo.94b995d7989f5e242d411c1a@example.invalid', 'Anderson Silva', 'https://i.pravatar.cc/400?img=21', 'Impermeabilização de lajes e caixas d''água.', 'Construção Civil'),
('demo.4e644225bbede2dbbaaac99f@example.invalid', 'Bianca Oliveira', 'https://i.pravatar.cc/400?img=26', 'Social media, gestão de redes sociais.', 'Marketing e Vendas'),
('demo.f66ccb544dd1058ba58046b5@example.invalid', 'Rodrigo Mendes', 'https://i.pravatar.cc/400?img=30', 'Consultor de vendas e negociação.', 'Marketing e Vendas'),
('demo.939372be04aa5ae1528a2432@example.invalid', 'Carolina Tavares', 'https://i.pravatar.cc/400?img=35', 'Gestora de tráfego pago.', 'Marketing e Vendas'),
('demo.200c0a2bb15c565b2ba47fd5@example.invalid', 'Pedro Henrique Lima', 'https://i.pravatar.cc/400?img=40', 'Fotógrafo de produtos para e-commerce.', 'Marketing e Vendas'),
('demo.7da487327ab8198e40b81ded@example.invalid', 'Natália Souza', 'https://i.pravatar.cc/400?img=46', 'Copywriter, textos para vendas e anúncios.', 'Marketing e Vendas'),
('demo.a9225458dc1a56d51da372e3@example.invalid', 'Felipe Andrade', 'https://i.pravatar.cc/400?img=52', 'Representante comercial externo.', 'Marketing e Vendas'),
('demo.a6d5d9d5687cdf814a36076a@example.invalid', 'Camila Rangel', 'https://i.pravatar.cc/400?img=56', 'Designer de identidade visual para marcas.', 'Marketing e Vendas'),
('demo.e5329f80bd9f78e48541c049@example.invalid', 'Rafael Costa', 'https://i.pravatar.cc/400?img=61', 'Consultor de marketing digital.', 'Marketing e Vendas'),
('demo.fd5d1df9eba9d234b2f4d7db@example.invalid', 'Juliana Prado', 'https://i.pravatar.cc/400?img=65', 'Assessoria de imprensa e relações públicas.', 'Marketing e Vendas'),
('demo.856e57a6284df6b20f079f50@example.invalid', 'Vitor Hugo Martins', 'https://i.pravatar.cc/400?img=70', 'Vendedor porta a porta e catálogo.', 'Marketing e Vendas'),
('demo.7e1ca52dd2d9b5b274ae8f77@example.invalid', 'Marcela Duarte', 'https://i.pravatar.cc/400?img=1', 'Gestora de e-commerce e marketplaces.', 'Marketing e Vendas'),
('demo.930270abf471701830f896f2@example.invalid', 'Otávio Ramos', 'https://i.pravatar.cc/400?img=66', 'Consultor de branding e posicionamento.', 'Marketing e Vendas'),
('demo.1ba0480196658d6751f68d0f@example.invalid', 'Eduardo Lima', 'https://i.pravatar.cc/400?img=51', 'Técnico em informática, formatação e redes domésticas.', 'Tecnologia e Design'),
('demo.d6b15e208fcca3feb89dc70d@example.invalid', 'Aline Ferreira', 'https://i.pravatar.cc/400?img=67', 'Desenvolvedora e suporte técnico.', 'Tecnologia e Design'),
('demo.e3f9346312b40271f50535a2@example.invalid', 'Rafaela Nogueira', 'https://i.pravatar.cc/400?img=5', 'Designer gráfica, identidade visual e social media.', 'Tecnologia e Design'),
('demo.93e38de731a726c831ae3839@example.invalid', 'Bruno Salles', 'https://i.pravatar.cc/400?img=60', 'Desenvolvedor front-end e sites.', 'Tecnologia e Design'),
('demo.3c375a4532ad8a8235dcd1dd@example.invalid', 'Camila Prado', 'https://i.pravatar.cc/400?img=3', 'UX/UI designer, protótipos e telas de app.', 'Tecnologia e Design'),
('demo.30735689ccdceebb4e3a1b99@example.invalid', 'Thiago Barbosa', 'https://i.pravatar.cc/400?img=8', 'Suporte técnico remoto e formatação.', 'Tecnologia e Design'),
('demo.582b2ca52ed492c377157766@example.invalid', 'Larissa Campos', 'https://i.pravatar.cc/400?img=14', 'Social media e edição de vídeos curtos.', 'Tecnologia e Design'),
('demo.0b96828bcdff7974afaa5bb1@example.invalid', 'Vinícius Moraes', 'https://i.pravatar.cc/400?img=19', 'Desenvolvedor de aplicativos mobile.', 'Tecnologia e Design'),
('demo.49fb40c989e5156fd4bbd0c4@example.invalid', 'Patrícia Nogueira', 'https://i.pravatar.cc/400?img=25', 'Designer de logotipos e branding.', 'Tecnologia e Design'),
('demo.5e5fd22bf3700a3041453baa@example.invalid', 'Rodrigo Salgado', 'https://i.pravatar.cc/400?img=31', 'Montagem e manutenção de computadores.', 'Tecnologia e Design'),
('demo.4957812e4ca407c7c9ec4c2f@example.invalid', 'Fernanda Lacerda', 'https://i.pravatar.cc/400?img=39', 'Social media e gestão de conteúdo.', 'Tecnologia e Design'),
('demo.c6fda21bbf4a72a1e244d551@example.invalid', 'Gustavo Prado', 'https://i.pravatar.cc/400?img=45', 'Especialista em SEO e sites.', 'Tecnologia e Design');

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
