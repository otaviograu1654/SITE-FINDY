// Monta a navegação compartilhada e controla os acessos conforme a sessão.
(() => {
  const host = document.getElementById('cabecalho-findy');
  if (!host || host.dataset.pronto) return;
  host.dataset.pronto = 'true';
  const { api } = Findy;
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
  acoes.append(entrar, sair); linha.append(logo, nav, acoes);

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

  document.addEventListener('click', evento => { if (!categorias.contains(evento.target)) categorias.open = false; });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && categorias.open) { categorias.open = false; resumo.focus(); }
  });
  sair.addEventListener('click', async () => {
    if (sair.disabled) return;
    sair.disabled = true; aviso.hidden = true;
    try { await api('/auth/logout', { method: 'POST' }); location.assign('login.html'); }
    catch (erro) { aviso.textContent = erro.message; aviso.hidden = false; }
    finally { sair.disabled = false; }
  });
  (async () => {
    try {
      await api('/auth/me'); entrar.hidden = true; sair.hidden = false;
      try { await api('/admin/me'); admin.hidden = false; }
      catch (erro) {
        if (erro.status === 401) { entrar.hidden = false; sair.hidden = true; }
        else if (erro.status !== 403) { aviso.textContent = 'Não foi possível conferir o acesso administrativo.'; aviso.hidden = false; }
      }
    } catch (erro) {
      if (erro.status !== 401) { aviso.textContent = erro.message; aviso.hidden = false; }
    }
  })();
})();
