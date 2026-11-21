// Monta a navegação compartilhada e controla os acessos conforme a sessão.
(() => {
  const host = document.getElementById('cabecalho-findy');
  if (!host || host.dataset.pronto) return;
  host.dataset.pronto = 'true';
  const { api, foto } = Findy;
  const pagina = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  const atual = {
    'contratacao.html': 'meus-pedidos.html', 'status-atendimento.html': 'meus-pedidos.html',
    'perfil contratante.html': 'minha-conta.html',
  }[pagina] || pagina;
  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }
  function link(rotulo, destino) {
    const el = elemento('a', 'findy-topo__link', rotulo); el.href = destino;
    if (destino === atual) el.setAttribute('aria-current', 'page');
    return el;
  }

  const linha = elemento('div', 'findy-topo__linha');
  const logo = elemento('a', 'findy-topo__logo'); logo.href = 'index.html'; logo.setAttribute('aria-label', 'Findy — Início');
  const imagem = elemento('img', 'findy-topo__imagem'); imagem.src = 'images/findy-logo.png'; imagem.alt = 'Findy';
  logo.append(imagem);
  const nav = elemento('nav', 'findy-topo__nav'); nav.setAttribute('aria-label', 'Navegação principal');
  for (const [rotulo, destino] of [
    ['Início', 'index.html'], ['Minha conta', 'minha-conta.html'],
    ['Perfil profissional', 'perfil-prestador.html'], ['Meus serviços', 'meus-servicos.html'],
    ['Meus pedidos', 'meus-pedidos.html'],
  ]) nav.append(link(rotulo, destino));
  const admin = link('Administração', 'admin.html'); admin.id = 'cabecalho-admin'; admin.hidden = true; nav.append(admin);

  const acoes = elemento('div', 'findy-topo__acoes');
  const entrar = link('Entrar', 'login.html'); entrar.id = 'cabecalho-entrar';
  entrar.className += ' findy-topo__botao';
  if (['contratacao.html', 'status-atendimento.html', 'meus-pedidos.html'].includes(pagina)) {
    entrar.href = `login.html?retorno=${encodeURIComponent(pagina + location.search)}`;
  }
  const sair = elemento('button', 'findy-topo__botao', 'Sair');
  sair.id = 'cabecalho-sair'; sair.type = 'button'; sair.hidden = true;
  const conta = elemento('details', 'findy-topo__conta'); conta.id = 'cabecalho-conta'; conta.hidden = true;
  const resumoConta = elemento('summary', 'findy-topo__conta-resumo');
  const avatar = elemento('img', 'findy-topo__avatar'); avatar.id = 'cabecalho-foto';
  avatar.src = 'images/chat-avatar.png'; avatar.alt = '';
  avatar.addEventListener('error', () => {
    if (!avatar.src.endsWith('/images/chat-avatar.png')) avatar.src = 'images/chat-avatar.png';
  });
  const nomeConta = elemento('span', 'findy-topo__nome', 'Minha conta'); nomeConta.id = 'cabecalho-nome';
  const seta = elemento('span', 'findy-topo__seta', '▾'); seta.setAttribute('aria-hidden', 'true');
  resumoConta.append(avatar, nomeConta, seta);
  const opcoesConta = elemento('nav', 'findy-topo__conta-opcoes'); opcoesConta.setAttribute('aria-label', 'Opções da conta');
  for (const [rotulo, destino] of [
    ['Minha conta', 'minha-conta.html'],
    ['Pedidos enviados', 'meus-pedidos.html?tipo=ENVIADAS'],
    ['Pedidos recebidos', 'meus-pedidos.html?tipo=RECEBIDAS'],
    ['Meus serviços', 'meus-servicos.html'],
  ]) opcoesConta.append(link(rotulo, destino));
  opcoesConta.append(sair); conta.append(resumoConta, opcoesConta);
  const sino = elemento('a', 'findy-topo__sino'); sino.id = 'cabecalho-pendentes'; sino.hidden = true;
  sino.href = 'meus-pedidos.html?tipo=RECEBIDAS';
  const icone = elemento('span', ''); icone.setAttribute('aria-hidden', 'true');
  icone.innerHTML = '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
  const contador = elemento('span', 'findy-topo__contador'); contador.id = 'cabecalho-pendentes-total'; contador.hidden = true;
  sino.append(icone, contador);
  acoes.append(entrar, sino, conta); linha.append(logo, nav, acoes);

  const ferramentas = elemento('div', 'findy-topo__ferramentas');
  const categorias = elemento('details', 'findy-topo__categorias');
  const resumo = elemento('summary', '', 'Categorias'); categorias.append(resumo);
  const lista = elemento('ul', 'findy-topo__categorias-lista');
  const selecionada = new URLSearchParams(location.search).get('categoria');
  for (const nome of ['Serviços Domésticos', 'Eventos', 'Infantil', 'Serviços Gerais',
    'Construção Civil', 'Marketing e Vendas', 'Tecnologia e Design']) {
    const item = elemento('li', ''); const opcao = link(nome, `categoria.html?${new URLSearchParams({ categoria: nome })}`);
    if (pagina === 'categoria.html' && nome === selecionada) opcao.setAttribute('aria-current', 'page');
    item.append(opcao); lista.append(item);
  }
  categorias.append(lista);
  const busca = elemento('form', 'findy-topo__busca');
  busca.id = 'cabecalho-busca'; busca.action = 'categoria.html'; busca.method = 'get'; busca.setAttribute('role', 'search');
  const campo = elemento('input', ''); campo.type = 'search'; campo.name = 'q';
  campo.placeholder = 'Busque um profissional ou serviço'; campo.setAttribute('aria-label', 'Buscar profissional ou serviço');
  campo.value = new URLSearchParams(location.search).get('q') || '';
  const buscar = elemento('button', 'findy-topo__buscar', 'Buscar'); buscar.type = 'submit';
  busca.append(campo, buscar); ferramentas.append(categorias, busca);
  const aviso = elemento('p', 'findy-topo__aviso');
  aviso.id = 'cabecalho-mensagem'; aviso.hidden = true; aviso.setAttribute('role', 'status'); aviso.setAttribute('aria-live', 'polite');
  host.replaceChildren(linha, ferramentas, aviso);

  document.addEventListener('click', evento => {
    if (!categorias.contains(evento.target)) categorias.open = false;
    if (!conta.contains(evento.target)) conta.open = false;
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && categorias.open) { categorias.open = false; resumo.focus(); }
    if (evento.key === 'Escape' && conta.open) { conta.open = false; resumoConta.focus(); }
  });
  conta.addEventListener('toggle', () => { if (conta.open) categorias.open = false; });
  categorias.addEventListener('toggle', () => { if (categorias.open) conta.open = false; });
  function visitante() {
    sino.hidden = true;
    entrar.hidden = false; sair.hidden = true; conta.hidden = true; conta.open = false; admin.hidden = true;
  }
  function mostrarPerfil(perfil) {
    nomeConta.textContent = perfil.nome || 'Minha conta';
    nomeConta.title = nomeConta.textContent;
    resumoConta.setAttribute('aria-label', `Opções da conta de ${nomeConta.textContent}`);
    avatar.src = foto(perfil.foto);
  }
  document.addEventListener('findy:perfil-atualizado', evento => {
    if (!conta.hidden) mostrarPerfil(evento.detail);
  });
  let consultando = false;
  async function atualizarPendentes() {
    if (conta.hidden || consultando) return;
    consultando = true;
    try {
      const dados = await api('/solicitacoes/pendentes/resumo');
      if (conta.hidden) return;
      const total = Math.max(0, Number(dados.total) || 0);
      contador.textContent = total > 99 ? '99+' : String(total); contador.hidden = total === 0;
      sino.title = total ? `${total} pedido(s) aguardando sua resposta` : 'Nenhum pedido aguardando sua resposta';
      sino.setAttribute('aria-label', sino.title); sino.hidden = false;
    } catch (erro) {
      if (erro.status === 401) visitante();
      else { sino.hidden = false; contador.hidden = false; contador.textContent = '!';
        sino.title = 'Não foi possível conferir pedidos pendentes. Abra seus pedidos recebidos.';
        sino.setAttribute('aria-label', sino.title); }
    } finally { consultando = false; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') atualizarPendentes();
  });
  document.addEventListener('findy:pedidos-atualizados', atualizarPendentes);
  sair.addEventListener('click', async () => {
    if (sair.disabled) return;
    sair.disabled = true; aviso.hidden = true;
    try { await api('/auth/logout', { method: 'POST' }); location.assign('login.html'); }
    catch (erro) { aviso.textContent = erro.message; aviso.hidden = false; }
    finally { sair.disabled = false; }
  });
  (async () => {
    try {
      const usuario = await api('/auth/me');
      mostrarPerfil(usuario); entrar.hidden = true; sair.hidden = false; conta.hidden = false;
      await atualizarPendentes();
      try { mostrarPerfil(await api('/perfil')); }
      catch (erro) { if (erro.status === 401) { visitante(); return; } }
      try { await api('/admin/me'); admin.hidden = false; }
      catch (erro) {
        if (erro.status === 401) visitante();
        else if (erro.status !== 403) { aviso.textContent = 'Não foi possível conferir o acesso administrativo.'; aviso.hidden = false; }
      }
    } catch (erro) {
      if (erro.status !== 401) { aviso.textContent = erro.message; aviso.hidden = false; }
    }
  })();
})();
