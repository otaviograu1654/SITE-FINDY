# Validação do fluxo do Findy — 16/11/2026

Três rodadas locais concluídas, sem falhas nos cenários executados.
Backend com Spring Boot/MockMvc e PostgreSQL real no banco separado
`findy_cadastro_test_20261028`. Scripts do frontend executados com DOM e API
simulados; isto não substitui teste visual em navegador.

| Rodada | Backend | JavaScript | Resultado |
| --- | --- | --- | --- |
| 1 | 4 testes | 31 testes | Passou |
| 2 | 4 testes | 31 testes | Passou |
| 3 | 4 testes | 31 testes | Passou |

Total: 105 execuções de testes, zero falhas. Cada rodada cria novas contas,
ofertas e pedidos. Não há limpeza ou rollback de teste nas duas classes executadas.

## Fluxo de integração verificado

1. Cadastro de cliente, prestador e conta sintética promovida a administrador
   exclusivamente no banco de testes.
2. Login real pela API, sessão e controle de acesso ao painel administrativo.
3. Edição dos dados pessoais do cliente e upload/consulta de foto do prestador.
4. Cadastro profissional com habilidades e envio para análise.
5. Serviço cadastrado enquanto o perfil está pendente não aparece publicamente.
6. Administrador aprova o perfil; ofertas passam a aparecer na categoria.
7. Duas ofertas do mesmo prestador resultam em um profissional na listagem.
8. Perfil público lista serviços sem campos de telefone ou e-mail.
9. Cliente cria pedido com faixa de preço preservada, sem exposição de contatos.
10. Pedido aparece nos enviados do cliente e recebidos do prestador.
11. Administrador não participante não acessa o pedido. Cliente não pode aceitar.
12. Prestador aceita; ambos consultam a situação e os contatos liberados.
13. Segundo aceite é bloqueado; cancelamento oculta novamente os contatos.
14. Outro pedido é recusado, sem permitir reabertura por aceite.
15. Um pedido fica aceito; logout e novo login confirmam sua persistência.

Os três testes adicionais de privacidade verificam também acesso sem sessão,
ocultação de rua/número, preservação da região/mensagem e ausência de contatos nas
listagens mesmo após aceite. Os 31 testes de frontend cobrem as rotas e scripts
de cabeçalho, busca, solicitação, painel e acompanhamento, incluindo erros de API.

## Dados e evidências preservados

- Pedidos 142 a 162: 6 aceitos, 6 cancelados, 3 pendentes e 6 recusados,
  confirmados por consulta ao banco depois das três rodadas.
- Contas, fotos, perfis e serviços sintéticos também permanecem no banco.
- Não houve exclusão de dados, envio de e-mails nem alteração no Neon/Render.
- Logs e cópias dos relatórios de cada rodada:
  `backend/plataformaservicos/target/verificacao-fluxo-b6ae6591/rodada-1`,
  `rodada-2` e `rodada-3`.
- A pasta `target` é local e pode ser removida pelo Maven `clean`; este relatório
  fica em `docs` para conservar o resumo no projeto. Nenhum `clean` foi executado.

## Limites desta conferência

O acesso ao navegador retornou “The browser access host is unavailable”. Não foi
possível verificar cliques reais, alinhamento, hover ou layout de celular. Não se
testou a entrega real de e-mail pelo Brevo, o Render ou as funções futuras de
conclusão e avaliação. Repetir os testes aumenta a confiança nos cenários cobertos,
mas não garante ausência de outros defeitos.

A suíte antiga não foi executada: ainda contém rollback e limpeza automática,
incompatíveis com a preferência atual de preservar dados. Nesta conferência foram
executadas somente `FluxoMvpTests` e `PrivacidadeContatoTests` no backend.
