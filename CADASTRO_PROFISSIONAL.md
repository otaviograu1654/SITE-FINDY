# Cadastro profissional e análise administrativa

Implementação da fase 4, em 28/10/2026. Mantém HTML/CSS/JavaScript, Spring Boot
e PostgreSQL, sem dependências novas. Não inclui contratação ou pagamento.

## O que mudou

- Cadastro profissional em três etapas: Sobre você, Seu trabalho e Revisão.
- Navegar entre etapas mantém os valores enquanto a página estiver aberta.
  O envio final salva os dados pessoais e profissionais em uma transação.
- Foto pode ser selecionada no próprio cadastro; o upload é uma operação separada
  que atualiza a foto da conta. Se o envio profissional falhar depois, a foto
  já enviada permanece salva. O formulário mantém os outros campos para tentar novamente.
- Nome, telefone com DDD (10 a 13 dígitos), bairro, cidade, UF e foto obrigatórios
  para enviar à análise. E-mail vem da conta existente e não é alterado pelo cadastro.
- Uma ou mais habilidades selecionáveis nas sete categorias. Construção Civil
  inclui tirar nível, assentar piso, levantar paredes, fazer reboco e encanamento.
- Catálogo de habilidades centralizado no backend; opções inventadas ou duplicadas
  são rejeitadas. As habilidades não substituem serviços com preço.
- Texto complementar e experiência, com exemplos que não são salvos automaticamente.
  A opção Estou começando agora permite enviar sem experiência preenchida.
- Prévia pública na revisão e resumo reservado de telefone/e-mail/região.
- Serviços continuam sendo cadastrados em Meus serviços, após criar o perfil.
  A revisão mostra os serviços existentes; o primeiro envio pode não ter serviços.
- Administrador vê foto, contato, bairro/cidade/UF, data de cadastro, apresentação,
  experiência, habilidades, região, serviços (incluindo desativados) e histórico.
- O histórico guarda cada decisão, data, administrador e motivo. O dono também
  pode consultar seu histórico. Informações privadas não são retornadas publicamente.

## Decisões e estados

| Situação | Comportamento |
| --- | --- |
| PENDENTE | Enviado e aguardando análise; não público. |
| APROVADO | Público se perfil e conta estiverem ativos. |
| CORRECAO_SOLICITADA | Motivo obrigatório; dono pode corrigir e reenviar. |
| RECUSADO_DEFINITIVO | Motivo obrigatório; sem reenvio, edição profissional ou reativação pelos endpoints do perfil. A conta continua podendo contratar. |
| RECUSADO | Estado antigo preservado; permite corrigir e reenviar. |

Cada envio profissional volta para PENDENTE. Desativar mantém a conta;
reativar requer cadastro completo e nova análise. A administração não consegue
reativar um perfil recusado definitivamente pelo painel. A edição administrativa
da apresentação mantém as habilidades recebidas e também exige nova análise.

## Privacidade

Localização pública: somente bairro, cidade e UF em campos separados.
Não são coletados rua e número neste cadastro. Telefone, e-mail, região de
atendimento livre, motivos e histórico não aparecem na API pública do perfil.
A região livre é reservada por poder conter endereço completo.
Os textos de apresentação, experiência e serviços são públicos: a interface
orienta a não escrever contato ou endereço neles. Não há filtro automático de
telefone/endereço em texto livre; a administração deve revisar antes de aprovar.

## Banco: atualizar antes de iniciar a versão nova

Arquivo incremental: [cadastro_profissional.sql](database/cadastro_profissional.sql).

Ele acrescenta bairro à conta, opção iniciante ao perfil, tabela de habilidades,
novos estados e tabela de histórico. Preserva os registros existentes e importa
somente a última decisão antiga disponível, sem inventar um histórico anterior.
Pode ser repetido sem apagar contas, serviços ou decisões já registradas.

No banco local existente, com Docker Compose iniciado, executar na raiz:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 .\database\cadastro_profissional.sql | docker compose exec -T postgres psql -U postgres -d findy --set=ON_ERROR_STOP=1
```

Se sua configuração usa outro usuário/banco, substituir postgres/findy pelos
valores correspondentes. Não repetir os scripts antigos de criação no banco existente.
Em banco novo: executar os sete SQL anteriores na ordem descrita no plano e,
por último, este arquivo incremental.

Na hospedagem: executar o mesmo SQL no banco Neon correto ANTES do deploy.
Não há atualização automática do esquema. A publicação não foi feita nesta etapa.

Perfis antigos aprovados não são apagados ou despublicados em massa. No próximo
reenvio ou nova aprovação, deverão preencher bairro, contato, foto e habilidades.
Fotos externas HTTP/HTTPS antigas continuam aceitas; uploads locais precisam
corresponder à foto armazenada da própria conta.

## Arquivos principais

- [Formulário](frontend/pages/perfil-prestador.html) e [interações](frontend/pages/prestador.js).
- [Painel](frontend/pages/admin.html) e [ficha/ações](frontend/pages/admin.js).
- [Estilos](frontend/pages/perfil.css).
- [Controller profissional](backend/plataformaservicos/src/main/java/br/com/projetointegrador/plataformaservicos/controller/PrestadorController.java).
- [Controller administrativo](backend/plataformaservicos/src/main/java/br/com/projetointegrador/plataformaservicos/controller/AdminController.java).
- [Validações e consultas](backend/plataformaservicos/src/main/java/br/com/projetointegrador/plataformaservicos/service/CadastroProfissionalService.java).
- Minha Conta, DTO pessoal e entidade de usuário ajustados para guardar bairro.

## API

- GET /prestadores/habilidades: catálogo público de opções por categoria.
- PUT /prestadores/me/cadastro: envio unificado autenticado, com pessoa e trabalho.
- PUT /prestadores/me: edição profissional; também exige dados pessoais completos.
- GET /prestadores/me: informações próprias, serviços, habilidades e histórico.
- GET /prestadores/{id}: dados públicos, habilidades e serviços ativos.
- GET /admin/prestadores/{id}/ficha: ficha profissional, serviços e histórico; somente ADMIN.
- PATCH /admin/prestadores/{id}/analise: decisao e motivo; somente ADMIN.

Exemplo de decisão:

```json
{"decisao":"CORRECAO_SOLICITADA","motivo":"Explique quais serviços você realiza."}
```

As outras decisões são APROVADO e RECUSADO_DEFINITIVO. O formato antigo com
aprovado:true/false foi substituído; o painel acompanha o formato novo.

## Roteiro manual para conferir

1. Reiniciar o backend após atualizar o SQL; atualizar a página no navegador.
2. Entrar em Perfil profissional e preencher Sobre você.
3. Tentar avançar sem foto/telefone/localização; conferir a orientação.
4. Selecionar habilidades, testar a opção iniciante e preencher a apresentação.
5. Avançar até a revisão, voltar e conferir que os valores permanecem.
6. Conferir a prévia sem contato; enviar e verificar PENDENTE após recarregar.
7. Se for o primeiro perfil, cadastrar uma oferta em Meus serviços.
8. Como ADMIN, abrir a ficha; conferir dados, habilidades, serviços e histórico.
9. Solicitar correção com motivo; como dono, corrigir e reenviar.
10. Aprovar; abrir o perfil público sem login e conferir localização e serviços.
11. Em outro perfil de teste, recusar definitivamente; conferir impedimento de
    reenvio/reativação e que a conta ainda pode acessar Minha Conta.
12. Usar conta comum para tentar acessar a ficha administrativa: deve negar acesso.

Resultados automatizados e situação da atualização local estão registrados
na fase 4 do plano de execução. O banco separado de testes criado nesta entrega
se chama findy_cadastro_test_20261028 e não substitui seu banco local de uso.

## Resultado desta implementação

- Banco local de uso atualizado com o SQL incremental.
- Contagens antes/depois: 86 contas, 85 perfis e 84 serviços, sem remoções.
- 85 decisões antigas disponíveis preservadas no histórico.
- 40 testes backend aprovados, incluindo oito novos; quatro testes do cliente
  da API aprovados; sintaxe dos scripts conferida.
- Testes executados em banco separado, não nas contas locais de uso.
- Inspeção visual pelo navegador não realizada: a integração de testes do
  navegador não estava disponível nesta sessão. Seguir o roteiro manual acima.
- Nenhuma ferramenta/dependência nova instalada; nenhum deploy ou ajuste no Neon.
- Para usar nesta máquina, basta reiniciar o backend e atualizar a página.

O comando SQL anterior fica como referência para outras máquinas ou bancos.
Nesta máquina ele já foi aplicado e não precisa ser repetido.
