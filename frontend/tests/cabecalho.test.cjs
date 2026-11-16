// Testa o cabeçalho comum, as sessões e a inclusão dos scripts em todas as páginas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pages = path.join(__dirname, '../pages');
const codigo = fs.readFileSync(path.join(pages, 'cabecalho.js'), 'utf8');

class Elemento {
  constructor(tag) {
    this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.handlers = {};
    this.hidden = false; this.disabled = false; this.textContent = '';
    this.style = {};
  }
  append(...filhos) { this.children.push(...filhos); }
  replaceChildren(...filhos) { this.children = filhos; }
  setAttribute(nome, valor) { this.attributes[nome] = valor; }
  addEventListener(nome, handler) { this.handlers[nome] = handler; }
  contains(el) { return this === el || this.children.some(f => f.contains(el)); }
  focus() { this.focused = true; }
  before() {}
  querySelector(tag) { return todos(this).find(el => el.tag === tag); }
  async clicar() { return this.handlers.click?.(); }
}
const erro = status => Object.assign(new Error('Falha de teste'), { status });
function todos(el) { return [el, ...el.children.flatMap(todos)]; }
async function ambiente({ pagina = 'index.html', search = '', responder = () => { throw erro(401); } } = {}) {
  const host = new Elemento('header'); host.id = 'cabecalho-findy';
  const chamadas = [], eventos = {}, destinos = [];
  const contexto = {
    URLSearchParams, decodeURIComponent,
    location: { pathname: '/' + pagina, search, assign: url => destinos.push(url) },
    document: {
      getElementById: id => todos(host).find(el => el.id === id),
      createElement: tag => new Elemento(tag),
      addEventListener: (nome, handler) => { eventos[nome] = handler; },
    },
    Findy: {
      api: async (rota, opcoes) => { chamadas.push({ rota, opcoes }); return responder(rota, opcoes); },
      foto: valor => valor || 'images/chat-avatar.png',
    },
  };
  vm.createContext(contexto); vm.runInContext(codigo, contexto);
  await new Promise(resolve => setImmediate(resolve));
  return { host, contexto, chamadas, eventos, destinos,
    el: id => todos(host).find(el => el.id === id),
    nav: () => todos(host).find(el => el.tag === 'nav'),
  };
}
const usuario = rota => { if (rota === '/admin/me') throw erro(403); return { id: 1 }; };

test('visitante mantém os cinco links principais, categorias e entrada, sem administração', async () => {
  const a = await ambiente();
  assert.deepEqual(a.nav().children.filter(el => !el.hidden).map(el => el.textContent),
    ['Início', 'Minha conta', 'Perfil profissional', 'Meus serviços', 'Meus pedidos']);
  assert.equal(a.el('cabecalho-entrar').hidden, false); assert.equal(a.el('cabecalho-sair').hidden, true);
  assert.equal(a.el('cabecalho-admin').hidden, true);
  assert.equal(a.el('cabecalho-conta').hidden, true);
  assert.equal(todos(a.host).filter(el => el.tag === 'li').length, 7);
  assert.equal(a.chamadas.length, 1);
});

test('usuário comum vê os mesmos links e destaque correto, com saída e sem administração', async () => {
  const a = await ambiente({ pagina: 'perfil-prestador.html', responder: usuario });
  const links = a.nav().children.filter(el => !el.hidden);
  assert.equal(links.length, 5);
  assert.equal(links.find(el => el.attributes['aria-current'] === 'page').href, 'perfil-prestador.html');
  assert.equal(links.some(el => el.href === 'meus-servicos.html'), true);
  assert.equal(a.el('cabecalho-sair').hidden, false); assert.equal(a.el('cabecalho-entrar').hidden, true);
});

test('somente resposta positiva da API administrativa revela o acesso', async () => {
  const a = await ambiente({ pagina: 'admin.html', responder: () => ({ id: 1 }) });
  assert.equal(a.el('cabecalho-admin').hidden, false);
  assert.equal(a.el('cabecalho-admin').attributes['aria-current'], 'page');
  const b = await ambiente({ responder: rota => { if (rota === '/admin/me') throw erro(500); return { id: 1 }; } });
  assert.equal(b.el('cabecalho-admin').hidden, true); assert.equal(b.el('cabecalho-mensagem').hidden, false);
});

test('menu mostra nome e foto do perfil para usuário e administrador e fecha por Escape ou fora', async () => {
  for (const admin of [false, true]) {
    const a = await ambiente({ responder: rota => {
      if (rota === '/auth/me') return { id: 2, nome: 'Nome da sessão' };
      if (rota === '/perfil') return { nome: 'Otávio', foto: '/fotos/2?v=atual' };
      if (!admin) throw erro(403);
      return { id: 2 };
    } });
    assert.equal(a.el('cabecalho-conta').hidden, false);
    assert.equal(a.el('cabecalho-nome').textContent, 'Otávio');
    assert.equal(a.el('cabecalho-foto').src, '/fotos/2?v=atual');
    assert.equal(a.el('cabecalho-admin').hidden, !admin);
    const menu = a.el('cabecalho-conta');
    assert.ok(todos(menu).some(el => el.href === 'meus-pedidos.html?tipo=RECEBIDAS'));
    menu.open = true; a.eventos.keydown({ key: 'Escape' });
    assert.equal(menu.open, false); assert.equal(menu.children[0].focused, true);
    menu.open = true; a.eventos.click({ target: a.el('cabecalho-nome') });
    assert.equal(menu.open, true);
    a.eventos.click({ target: new Elemento('main') }); assert.equal(menu.open, false);
    a.eventos['findy:perfil-atualizado']({ detail: { nome: 'Nome atualizado', foto: '/fotos/2?v=nova' } });
    assert.equal(a.el('cabecalho-nome').textContent, 'Nome atualizado');
    assert.equal(a.el('cabecalho-foto').src, '/fotos/2?v=nova');
  }
});

test('falha ao carregar foto mantém conta acessível; sessão expirada esconde o menu', async () => {
  const a = await ambiente({ responder: rota => {
    if (rota === '/auth/me') return { id: 2, nome: 'Nome da sessão' };
    throw erro(rota === '/perfil' ? 503 : 403);
  } });
  assert.equal(a.el('cabecalho-nome').textContent, 'Nome da sessão');
  assert.equal(a.el('cabecalho-foto').src, 'images/chat-avatar.png');
  assert.equal(a.el('cabecalho-conta').hidden, false);
  const b = await ambiente({ responder: rota => {
    if (rota === '/auth/me') return { id: 2, nome: 'Sessão encerrada' };
    throw erro(401);
  } });
  assert.equal(b.el('cabecalho-conta').hidden, true);
  assert.equal(b.el('cabecalho-entrar').hidden, false);
});

test('status destaca Meus pedidos e entrada mantém o pedido selecionado', async () => {
  const a = await ambiente({ pagina: 'status-atendimento.html', search: '?id=20' });
  assert.equal(a.nav().children.find(el => el.attributes['aria-current'] === 'page').href, 'meus-pedidos.html');
  assert.equal(a.el('cabecalho-entrar').href, 'login.html?retorno=status-atendimento.html%3Fid%3D20');
  assert.equal(a.el('cabecalho-busca').action, 'categoria.html');
  assert.equal(a.el('cabecalho-busca').children[0].name, 'q');
});

test('logout envia uma única chamada, bloqueia clique repetido e redireciona após sucesso', async () => {
  let finalizar;
  const a = await ambiente({ responder: (rota, opcoes) => opcoes
    ? new Promise(resolve => { finalizar = resolve; }) : usuario(rota) });
  const sair = a.el('cabecalho-sair'); const primeira = sair.clicar(); await sair.clicar();
  assert.equal(a.chamadas.filter(c => c.rota === '/auth/logout').length, 1);
  assert.equal(a.chamadas.at(-1).opcoes.method, 'POST'); assert.equal(sair.disabled, true);
  assert.deepEqual(a.destinos, []); finalizar(); await primeira;
  assert.deepEqual(a.destinos, ['login.html']);
});

test('falha na sessão ou saída é exibida e não simula logout', async () => {
  const a = await ambiente({ responder: () => { throw erro(503); } });
  assert.equal(a.el('cabecalho-mensagem').hidden, false); assert.equal(a.el('cabecalho-admin').hidden, true);
  const b = await ambiente({ responder: (rota, opcoes) => { if (opcoes) throw erro(500); return usuario(rota); } });
  await b.el('cabecalho-sair').clicar();
  assert.deepEqual(b.destinos, []); assert.equal(b.el('cabecalho-mensagem').hidden, false);
  assert.equal(b.el('cabecalho-sair').disabled, false);
});

test('categorias fecham com Escape e clique fora, mantendo a busca recebida na URL', async () => {
  const a = await ambiente({ pagina: 'categoria.html', search: '?q=design&categoria=Tecnologia+e+Design' });
  const detalhes = todos(a.host).find(el => el.tag === 'details'); detalhes.open = true;
  a.eventos.keydown({ key: 'Escape' });
  assert.equal(detalhes.open, false); assert.equal(detalhes.children[0].focused, true);
  detalhes.open = true; a.eventos.click({ target: new Elemento('div') });
  assert.equal(detalhes.open, false); assert.equal(a.el('cabecalho-busca').children[0].value, 'design');
});

test('carregar o componente novamente não duplica navegação nem consultas', async () => {
  const a = await ambiente(); const tamanho = todos(a.host).length;
  vm.runInContext(codigo, a.contexto);
  assert.equal(todos(a.host).length, tamanho); assert.equal(a.chamadas.length, 1);
});

test('a busca da categoria usa o formulário compartilhado e mantém o filtro ao pesquisar', async () => {
  const a = await ambiente({ pagina: 'categoria.html', search: '?categoria=Servi%C3%A7os+Gerais&q=design',
    responder: rota => {
      if (rota === '/auth/me') throw erro(401);
      return { itens: [{ prestador_id: 15, nome: 'Profissional de teste', descricao: 'Apresentação pública',
        bairro: 'Centro', cidade: 'Patos de Minas', estado: 'MG' }], totalPaginas: 1 };
    } });
  const grade = new Elemento('div'); grade.id = 'professional-grid';
  const paginacao = new Elemento('nav'), titulo = new Elemento('h1');
  const original = a.contexto.document.getElementById;
  a.contexto.document.getElementById = id => id === grade.id ? grade : original(id);
  a.contexto.document.querySelector = seletor => seletor === '.pagination' ? paginacao : titulo;
  a.contexto.Findy.mensagem = (el, texto) => { el.textContent = texto; };
  a.contexto.Findy.foto = valor => valor;
  vm.runInContext(fs.readFileSync(path.join(pages, 'categoria.js'), 'utf8'), a.contexto);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(grade.children.length, 1);
  assert.equal(todos(grade).find(el => el.tag === 'h2').textContent, 'Profissional de teste');
  assert.equal(todos(grade).find(el => el.className === 'professional-card__desc').textContent, 'Apresentação pública');
  assert.equal(todos(grade).find(el => el.href === 'perfil-prestador.html?id=15').tag, 'a');
  assert.equal(grade.children[0].href, 'perfil-prestador.html?id=15');
  assert.equal(grade.children[0].attributes['aria-label'], 'Ver perfil e serviços de Profissional de teste');
  assert.equal(todos(grade).filter(el => el.tag === 'a').length, 1);
  assert.equal(todos(grade).some(el => el.textContent.includes('NaN')), false);
  const form = a.el('cabecalho-busca'); form.children[0].value = 'pintor';
  form.handlers.submit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  const consulta = new URLSearchParams(a.chamadas.at(-1).rota.split('?')[1]);
  assert.equal(consulta.get('categoria'), 'Serviços Gerais'); assert.equal(consulta.get('q'), 'pintor');
  assert.equal(consulta.get('pagina'), '1');
});

test('páginas usam o cabeçalho compartilhado, exceto login que mantém sua barra própria', () => {
  const arquivos = fs.readdirSync(pages).filter(nome => nome.endsWith('.html'));
  for (const nome of arquivos) {
    const html = fs.readFileSync(path.join(pages, nome), 'utf8');
    if (nome === 'login.html') {
      assert.equal(/cabecalho-findy|cabecalho\.css|cabecalho\.js/.test(html), false);
      assert.equal((html.match(/class="login-bar"/g) || []).length, 1);
      assert.match(html, /<script src="api\.js" defer>/);
      assert.match(html, /<script src="conta\.js" defer>/);
      continue;
    }
    assert.equal((html.match(/id="cabecalho-findy"/g) || []).length, 1, nome);
    assert.equal((html.match(/href="cabecalho.css"/g) || []).length, 1, nome);
    const scripts = [...html.matchAll(/<script\b([^>]+)>/g)];
    assert.match(scripts[0][1], /src="api.js"/); assert.match(scripts[1][1], /src="cabecalho.js"/);
    assert.equal(scripts.filter(s => /src="api.js"/.test(s[1])).length, 1, nome);
    for (const script of scripts) assert.match(script[1], /\bdefer\b/, nome);
    assert.equal(/data-sair|id="link-admin"|id="entrar-perfil"/.test(html), false, nome);
  }
  assert.equal(arquivos.length, 12);
});
