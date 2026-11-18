// Monta as perguntas frequentes em todas as páginas, sem simular uma conversa.
(() => {
  if (document.getElementById('findy-ajuda')) return;
  const perguntas = [
  [
    "Como funciona o cadastro?",
    "Na página de login, use o formulário Cadastre-se agora: informe nome, e-mail e senha. Depois, entre com seu e-mail e senha. A mesma conta permite contratar e oferecer serviços."
  ],
  [
    "A Findy é gratuita?",
    "Nesta versão, criar conta, buscar profissionais, cadastrar serviços e enviar pedidos é gratuito. O serviço prestado pode ter custo: cliente e prestador combinam o valor e o pagamento diretamente. A Findy não processa pagamentos."
  ],
  [
    "Como encontro um profissional?",
    "Escolha uma categoria ou use a busca. Os resultados mostram profissionais aprovados e com serviços ativos. Os perfis fictícios do PI aparecem como demonstração."
  ],
  [
    "Sou autônomo, como apareço nas buscas?",
    "Entre na sua conta, abra Perfil profissional, preencha o cadastro e envie para análise. Em Meus serviços, cadastre uma oferta ativa na categoria desejada. Você aparece na busca quando conta e perfil estão ativos e o perfil está aprovado. Marcar habilidades não cria serviços automaticamente."
  ],
  [
    "Esqueci minha senha, e agora?",
    "Na página de login, clique em Esqueceu a senha? e informe o e-mail da sua conta. Se ele estiver cadastrado, você receberá um link para definir uma nova senha. Confira também o spam. O link vale por 30 minutos e pode ser usado uma única vez; se expirar, solicite outro."
  ],
  [
    "Onde altero meus dados?",
    "Abra Perfil profissional e use Dados pessoais da conta para mudar nome, telefone, localização ou foto. Salvar nesse formulário não reenvia o perfil para análise. Enviar o cadastro profissional para análise exige nova aprovação, mesmo que já estivesse aprovado."
  ],
  [
    "Onde vejo pedidos dos clientes?",
    "Em Minha conta, veja os pedidos recentes. Para atender clientes, abra Meus pedidos e escolha Recebidos como prestador. Clique em Ver pedido e responder para consultar os detalhes e aceitar ou recusar. Use Atualizar lista para conferir novos pedidos."
  ],
  [
    "Quem pode ver meu telefone?",
    "Os campos de telefone não aparecem no perfil público. Telefones e endereço completo só são liberados nos detalhes do pedido, aos dois participantes, depois do aceite do prestador. Não coloque contatos ou endereço completo nos textos públicos ou na descrição do pedido."
  ],
  [
    "Posso conversar pelo site?",
    "Ainda não há chat entre cliente e prestador. Você pode enviar uma mensagem inicial no pedido. Após o aceite, os telefones ficam disponíveis para ligação ou WhatsApp, se o número tiver WhatsApp. O Fido responde apenas perguntas frequentes."
  ],
  [
    "Como funciona a contratação?",
    "Escolha um serviço no perfil do profissional, entre na sua conta e preencha data futura, horário, quantidade e local. Clique em Enviar solicitação e acompanhe em Meus pedidos, na lista de enviados. O prestador pode aceitar ou recusar; o aceite confirma disponibilidade, não o preço final."
  ],
  [
    "Já vou pagar agora?",
    "Nada é cobrado pela Findy ao solicitar. Combine o valor final, a forma e o momento do pagamento diretamente com o profissional."
  ],
  [
    "Posso cancelar depois?",
    "Você pode cancelar um pedido pendente ou aceito antes do horário marcado, pelo botão Cancelar pedido. Não há cobrança de multa pela Findy."
  ],
  [
    "Como acompanho a resposta e o horário?",
    "Consulte a data e a situação em Meus pedidos. O horário depende do aceite do profissional."
  ],
  [
    "O preço mostrado já é o valor final?",
    "A faixa de preço é uma estimativa. Depois do aceite, use os contatos disponíveis nos detalhes para combinar valor final, o que está incluído e pagamento antes do serviço. A Findy não registra a confirmação desse acordo nesta versão."
  ],
  [
    "Quando os contatos são liberados?",
    "Antes do aceite, o prestador vê descrição, data e região. Telefones e endereço completo só são liberados aos dois participantes depois que ele aceita. Pedidos recusados ou cancelados ocultam novamente esses campos. Não inclua contatos ou endereço completo na descrição livre."
  ],
  [
    "Como falo com o profissional?",
    "Ainda não há chat entre os participantes. Após o aceite, consulte os telefones nos detalhes para ligar ou usar WhatsApp, se o número tiver WhatsApp. A mensagem inicial do pedido não é uma conversa com troca de respostas."
  ]
];
  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }
  const host = elemento('aside', ''); host.id = 'findy-ajuda';
  const abrir = elemento('button', 'findy-ajuda__abrir'); abrir.type = 'button';
  abrir.id = 'findy-ajuda-abrir'; abrir.setAttribute('aria-label', 'Abrir perguntas frequentes com o Fido');
  abrir.setAttribute('aria-expanded', 'false'); abrir.setAttribute('aria-controls', 'findy-ajuda-painel');
  abrir.setAttribute('aria-haspopup', 'dialog');
  const avatar = elemento('img', ''); avatar.src = 'images/chat-avatar.png'; avatar.alt = '';
  abrir.append(avatar, elemento('span', '', 'Dúvidas? Fale com o Fido'));
  const painel = elemento('section', 'findy-ajuda__painel'); painel.id = 'findy-ajuda-painel'; painel.hidden = true;
  painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-labelledby', 'findy-ajuda-titulo');
  const topo = elemento('div', 'findy-ajuda__topo');
  const titulo = elemento('h2', '', 'Como podemos ajudar?'); titulo.id = 'findy-ajuda-titulo';
  const fechar = elemento('button', 'findy-ajuda__fechar', '×'); fechar.type = 'button'; fechar.id = 'findy-ajuda-fechar';
  fechar.setAttribute('aria-label', 'Fechar perguntas frequentes'); topo.append(titulo, fechar);
  const conteudo = elemento('div', 'findy-ajuda__conteudo');
  conteudo.append(elemento('p', 'findy-ajuda__intro', 'Sou o Fido. Abra uma pergunta para ver a resposta logo abaixo. Este espaço é de ajuda, não um chat entre participantes.'));
  const itens = [];
  for (const [pergunta, resposta] of perguntas) {
    const item = elemento('details', 'findy-ajuda__pergunta');
    const resumo = elemento('summary', '', pergunta);
    const corpo = elemento('div', 'findy-ajuda__resposta'); corpo.append(elemento('p', '', resposta));
    if (pergunta.startsWith('Esqueci minha senha')) {
      const link = elemento('a', '', 'Abrir recuperação de senha'); link.href = 'recuperar-senha.html'; corpo.append(link);
    }
    item.append(resumo, corpo); conteudo.append(item); itens.push(item);
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      for (const outro of itens) if (outro !== item) outro.open = false;
      corpo.scrollIntoView({ block: 'nearest' });
    });
  }
  painel.append(topo, conteudo); host.append(painel, abrir); document.body.append(host);
  function encerrar(devolverFoco) {
    painel.hidden = true; abrir.setAttribute('aria-expanded', 'false');
    if (devolverFoco) abrir.focus();
  }
  abrir.addEventListener('click', () => {
    if (!painel.hidden) { encerrar(true); return; }
    painel.hidden = false; abrir.setAttribute('aria-expanded', 'true'); fechar.focus();
  });
  fechar.addEventListener('click', () => encerrar(true));
  document.addEventListener('keydown', evento => { if (evento.key === 'Escape' && !painel.hidden) encerrar(true); });
  document.addEventListener('click', evento => { if (!painel.hidden && !host.contains(evento.target)) encerrar(false); });
})();
