<!-- Documenta a primeira entrega do backend de pedidos e estimativas de preço. -->
# Pedidos diretos e faixa de preço

Entrega de 30/10/2026: fase 5 com backend, faixa de preço e telas conectadas.
O perfil público permite escolher uma oferta e abrir a solicitação real. Meus
pedidos lista enviados/recebidos; a tela de acompanhamento consulta a API e
permite aceitar, recusar ou cancelar conforme a conta conectada.

## Regras combinadas

- O cliente escolhe um profissional e um serviço; o pedido não é aberto a todos.
- O prestador pode indicar, por exemplo, referência de R$ 100 a R$ 500 por serviço.
  O campo `preco` existente é o mínimo; `precoMaximo` é opcional no cadastro.
  Máximo exige mínimo e não pode ser menor que ele. Ambos vazios: a combinar.
- Valores anteriores são preservados e apresentados como referência. Uma única
  referência continua aceita, sem exigir editar os anúncios antigos.
- A faixa é estimativa; o valor final será combinado diretamente. Aceitar o pedido
  confirma a disponibilidade para o horário solicitado, sem confirmar preço final.
- Não há taxa de 10%, cobrança, comissão, saldo, moedas ou desbloqueio pago de contato.
- Quantidade: horas (aceita fração), diárias inteiras ou 1 por serviço. Uma diária
  não é convertida automaticamente em oito horas. A estimativa multiplica a faixa
  pela quantidade e arredonda para centavos. O backend rejeita estouro de valor.
- O pedido guarda uma cópia dos preços de referência e da unidade do anúncio.
  Alterações posteriores do preço não mudam essa cópia. `total` e `subtotal`
  ficam nulos porque ainda não houve acordo de valor; `taxa` é zero.
- O cliente informa telefone com DDD em Minha conta, data/horário futuro com fuso,
  endereço, bairro, cidade e UF. Mensagem é opcional.
- Somente serviço ativo de perfil aprovado e ativo, com conta ativa, recebe pedidos.
  Ninguém pode contratar o próprio serviço.
- Somente os participantes consultam o pedido. A listagem não mostra endereço ou
  telefone; os detalhes privados ficam disponíveis ao cliente e profissional
  autenticados. Administrador que não participa não recebe esses detalhes.
- O profissional aceita ou recusa um pedido PENDENTE. O aceite exige horário ainda
  futuro e serviço/perfil disponíveis. Não há reserva automática de agenda.
- O cliente cancela PENDENTE ou ACEITA antes do horário marcado. Não há multa.
  Recusa e cancelamento encerram esta etapa; não é possível reabrir o pedido.
- Mudanças de situação usam transação e bloqueio da linha para evitar sobrescrita
  em requisições simultâneas. Não são enviados e-mails ou avisos automáticos.
- Iniciar atendimento, concluir, confirmar conclusão e avaliar são a fase 6.
  Não há endpoint nesta entrega para pular diretamente para CONCLUIDA.

## Banco

Executar `database/contratacao_real.sql` depois de `cadastro_profissional.sql` e
antes de iniciar esta versão. É incremental e pode ser repetido, sem recriar
tabelas nem remover contas, perfis, serviços, solicitações ou demonstrações.

Acrescenta `servicos.preco_maximo`, `solicitacoes.valor_unitario_maximo` e
`solicitacoes.quantidade`. Mantém os campos e preços anteriores. Em pedidos
antigos por hora usa a duração existente como quantidade; nos demais usa 1.

Na raiz, com Compose iniciado:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 .\database\contratacao_real.sql | docker compose exec -T postgres psql -U postgres -d findy --set=ON_ERROR_STOP=1
```

Usar usuário/banco correspondentes à instalação. Não rodar scripts antigos de
criação sobre banco existente. No Neon, aplicar este incremento e os incrementos
anteriores necessários antes de publicar; esta entrega não faz deploy.

## API

Todas as rotas abaixo exigem a sessão normal por cookie HttpOnly.

| Método e caminho | Uso |
| --- | --- |
| POST /solicitacoes | Cria um pedido PENDENTE; retorna 201 e Location. |
| GET /solicitacoes?tipo=ENVIADAS&pagina=1 | Pedidos enviados pela conta. |
| GET /solicitacoes?tipo=RECEBIDAS&pagina=1 | Pedidos recebidos pelo profissional. |
| GET /solicitacoes/{id} | Detalhes reservados aos participantes. |
| PATCH /solicitacoes/{id}/situacao | Ação ACEITAR, RECUSAR ou CANCELAR. |

Listagem: `itens`, `pagina`, `totalPaginas`, `total`; 20 por página, mais recentes
primeiro. Sem perfil profissional, a listagem de recebidos é vazia.

Exemplo de corpo para POST (substituir ID e data por valores válidos):

```json
{
  "servicoId": 123,
  "dataInicio": "2030-11-10T09:00:00-03:00",
  "quantidade": 1,
  "endereco": "Rua de exemplo, 10",
  "bairro": "Centro",
  "cidade": "Patos de Minas",
  "estado": "MG",
  "mensagem": "Gostaria de combinar um orçamento para o reparo."
}
```

O cliente não escolhe clienteId, profissionalId, status, preços, taxa ou total
no corpo. Esses dados são determinados pela sessão e pelo banco.

Exemplo de PATCH: `{"acao":"ACEITAR"}`. Ações de outro participante retornam
403; pedido que não pertence à conta retorna 404; transição incompatível retorna
409. Campo inválido retorna 400 e falta de login retorna 401.

`POST/PUT /meus-servicos` aceita `precoMaximo` junto dos campos anteriores.
Consultas de serviços retornam `preco_maximo`. As estimativas no pedido são
`estimativaMinima` e `estimativaMaxima`, nunca um pagamento confirmado.

## Como testar pelas telas

1. Reiniciar o backend e abrir o site pela porta 8080; atualizar com Ctrl+F5.
2. Entrar como profissional, preencher o perfil e cadastrar uma oferta ativa em
   Meus serviços, escolhendo a categoria. Aprovar o perfil pelo administrador.
3. Em outra conta, com telefone cadastrado, abrir o perfil público, escolher
   Solicitar no serviço e preencher data/horário, quantidade e endereço.
4. Enviar: a confirmação aparece somente depois do pedido ser salvo na API.
5. Em Meus pedidos, consultar Pedidos enviados. Na conta do profissional, mudar
   para Pedidos recebidos, abrir o pedido e aceitar ou recusar.
6. Como cliente, atualizar o pedido para ver a resposta. Cancelamento fica
   disponível para PENDENTE/ACEITA antes do horário marcado.
7. Contato e endereço aparecem somente nos detalhes autenticados dos participantes.

Links usam apenas IDs: `contratacao.html?servico=123` e
`status-atendimento.html?id=456`. Dados e valores são consultados no servidor.
O login mantém esse destino após autenticar, limitado às rotas internas de pedidos.
Não há mais papel simulado, avaliação fictícia, reinício de simulação ou status
em localStorage. Conclusão e avaliação ainda serão implementadas na fase 6.

As telas Minha conta, Perfil profissional e Meus serviços mostram os requisitos
de publicação. Habilidades não substituem ofertas: perfil aprovado/ativo, conta
ativa e serviço ativo na categoria são necessários. No caso relatado nesta
conferência, a conta tinha perfil PENDENTE e nenhum serviço; não foi feita
aprovação ou criação de oferta automaticamente.

Endpoint público adicional: `GET /servicos/{id}` consulta somente uma oferta
publicável, sem telefone ou e-mail, para preencher o formulário real.

## Próxima entrega

Conferir as telas visualmente e seguir para a fase 6 quando solicitado. Continuam
pendentes a conclusão, confirmação, avaliação e a correção da reutilização de senha.

## Verificação desta entrega

- 60 testes do backend passaram, incluindo 20 em `SolicitacaoTests`.
- 13 testes JavaScript passaram: quatro do cliente da API e nove dos scripts de
  pedidos com DOM mínimo/API simulada. Sintaxe dos scripts conferida.
- 22 verificações HTTP passaram numa instância temporária na porta 8081 com banco
  separado: páginas/scripts, oferta pública, pedido entre duas contas, aceite,
  releitura do estado e cancelamento. Contas temporárias removidas e registros
  preexistentes do banco de testes preservados.
- Sem inspeção visual: a ferramenta retornou Browser access host is unavailable.
- O teste concorrente verifica duas tentativas de aceite: uma recebe 200 e a
  outra 409. A situação é relida em nova requisição, com dados persistidos no
  PostgreSQL; os registros criados por esse teste são removidos ao terminar.
- Testes executados em `findy_cadastro_test_20261028`, sem envio real de e-mail.
- SQL aplicado no banco local `findy` e repetido para conferir idempotência.
  Preservados os registros e valores anteriores de contas, perfis, serviços e
  pedidos: 86 contas, 85 perfis, 84 serviços e zero pedidos locais existentes.
- Para usar a faixa e as telas reais, reiniciar o backend e atualizar o navegador.
  Nesta máquina, não é necessário repetir o SQL. Neon/Render não atualizados.

## Dados fictícios e Git

Manter os exemplos durante os testes. Antes da entrega pública, preparar e revisar
uma remoção somente dos registros de demonstração, verificando dependências de
pedidos e avaliações. Não apagar contas reais nem reiniciar o banco para isso.
Git/branch não separa os dados: o banco é independente do repositório.

Não foi criada branch nem commit nesta etapa; as mudanças que já estavam no
índice do Git foram preservadas. O desenvolvimento atual continua em bancofuncional.
