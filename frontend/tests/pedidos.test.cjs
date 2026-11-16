// Exercita os scripts de pedidos com DOM mínimo e API simulada, sem navegador ou dependências.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pages = path.join(__dirname, '../pages');

class Elemento {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.handlers = {}; this.dataset = {};
    this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false;
    this.classList = { toggle() {} };
  }
  append(...itens) { this.children.push(...itens); }
  replaceChildren(...itens) { this.children = itens; }
  addEventListener(tipo, handler) { this.handlers[tipo] = handler; }
  setAttribute(nome, valor) { this[nome] = valor; }
  async emitir(tipo) { return this.handlers[tipo]?.({ preventDefault() {} }); }
  reportValidity() { return true; }
  focus() { this.focused = true; }
}

async function ambiente(pagina, script, search, responder) {
  const html = fs.readFileSync(path.join(pages, pagina), 'utf8');
  const elementos = new Map(), acoes = [];
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const el = new Elemento(m[1]), attrs = m[2];
    const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
    if (id) elementos.set(id, el);
    el.hidden = /\bhidden\b/.test(attrs); el.disabled = /\bdisabled\b/.test(attrs);
    el.value = /\bvalue="([^"]*)"/.exec(attrs)?.[1] || '';
    const acao = /\bdata-acao="([^"]+)"/.exec(attrs)?.[1];
    if (acao) { el.dataset.acao = acao; acoes.push(el); }
  }
  const chamadas = [], redirecionamentos = [];
  const contexto = {
    window: {}, URLSearchParams, Date, Number,
    location: { search, pathname: '/' + pagina, assign: url => redirecionamentos.push(url) },
    document: {
      getElementById: id => { assert.ok(elementos.has(id), `ID existente no HTML: ${id}`); return elementos.get(id); },
      querySelectorAll: seletor => { assert.equal(seletor, '[data-acao]'); return acoes; },
      createElement: tag => new Elemento(tag),
    },
    Findy: {
      api: async (rota, opcoes) => { chamadas.push({ rota, opcoes }); return responder(rota, opcoes); },
      mensagem: (el, texto) => { el.textContent = texto; el.hidden = !texto; },
      foto: valor => valor || 'images/chat-avatar.png',
    },
  };
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(path.join(pages, 'pedidos-comum.js'), 'utf8'), contexto);
  contexto.FindyPedidos = contexto.window.FindyPedidos;
  vm.runInContext(fs.readFileSync(path.join(pages, script), 'utf8'), contexto);
  await new Promise(resolve => setImmediate(resolve));
  return { el: id => elementos.get(id), acoes, chamadas, redirecionamentos };
}

const oferta = { servico_id: 7, prestador_id: 9, nome: 'Profissional', titulo: 'Criação de sites',
  categoria: 'Tecnologia e Design', unidade_cobranca: 'SERVICO', preco: 100, preco_maximo: 500 };
const pessoa = { telefone: '34999999999', cidade: 'Patos de Minas', bairro: 'Centro', estado: 'MG' };
const futuro = () => new Date(Date.now() + 3 * 86400000).toISOString();
const pedido = () => ({ id: 20, servico: 'Criação de sites', clienteId: 1, profissionalId: 2,
  cliente: 'Cliente', profissional: 'Profissional', status: 'PENDENTE', dataInicio: futuro(),
  quantidade: 1, unidadeCobranca: 'SERVICO', estimativaMinima: 100, estimativaMaxima: 500 });
function preencher(a) {
  a.el('hire-data').value = futuro().slice(0, 10); a.el('hire-hora').value = '15:00';
  a.el('hire-endereco').value = 'Rua de teste, 10'; a.el('hire-observacoes').value = 'Um reparo';
}
const responderOferta = (rota, opcoes) => rota === '/perfil' ? pessoa : rota === '/servicos/7' ? oferta
  : rota === '/solicitacoes' && opcoes.method === 'POST' ? pedido() : assert.fail(rota);

test('envia o ID real e a data com fuso, ignorando valores da URL; sucesso só após salvar', async () => {
  const a = await ambiente('contratacao.html', 'contratacao.js', '?servico=7&valor=0.01&prestador=Falso', responderOferta);
  assert.equal(a.el('hire-prestador-nome').textContent, 'Profissional');
  assert.equal(a.el('hire-success').hidden, true);
  preencher(a); await a.el('hire-form').emitir('submit');
  const envio = a.chamadas.find(c => c.rota === '/solicitacoes').opcoes.body;
  assert.equal(envio.servicoId, 7); assert.match(envio.dataInicio, /Z$/);
  assert.equal(envio.estado, 'MG'); assert.equal('preco' in envio, false); assert.equal('total' in envio, false);
  assert.equal(a.el('hire-success').hidden, false);
  assert.equal(a.el('link-status-atendimento').href, 'status-atendimento.html?id=20');
});

test('falha no salvamento preserva os campos e não inventa confirmação', async () => {
  const a = await ambiente('contratacao.html', 'contratacao.js', '?servico=7', (rota, opcoes) => {
    if (rota === '/solicitacoes') throw new Error('Serviço não está disponível');
    return responderOferta(rota, opcoes);
  });
  preencher(a); await a.el('hire-form').emitir('submit');
  assert.equal(a.el('hire-success').hidden, true);
  assert.equal(a.el('hire-endereco').value, 'Rua de teste, 10');
  assert.equal(a.el('hire-enviar').disabled, false);
  assert.match(a.el('hire-mensagem').textContent, /não está disponível/);
});

test('não envia pedido duplicado enquanto o primeiro está pendente', async () => {
  let finalizar;
  const a = await ambiente('contratacao.html', 'contratacao.js', '?servico=7', (rota, opcoes) => {
    if (rota === '/solicitacoes') return new Promise(resolve => { finalizar = resolve; });
    return responderOferta(rota, opcoes);
  });
  preencher(a); const envio = a.el('hire-form').emitir('submit');
  await a.el('hire-form').emitir('submit');
  assert.equal(a.chamadas.filter(c => c.rota === '/solicitacoes').length, 1);
  finalizar(pedido()); await envio;
});

test('sessão ausente retorna ao login com o serviço preservado', async () => {
  const a = await ambiente('contratacao.html', 'contratacao.js', '?servico=7', () => {
    throw Object.assign(new Error('Entre'), { status: 401 });
  });
  assert.equal(a.redirecionamentos[0], 'login.html?retorno=contratacao.html%3Fservico%3D7');
});

test('sem serviço selecionado não consulta nem libera envio; sem preço não inventa valor', async () => {
  const invalido = await ambiente('contratacao.html', 'contratacao.js', '', responderOferta);
  assert.equal(invalido.chamadas.length, 0); assert.equal(invalido.el('hire-enviar').disabled, true);
  const a = await ambiente('contratacao.html', 'contratacao.js', '?servico=7', rota => rota === '/perfil'
    ? pessoa : { ...oferta, preco: null, preco_maximo: null });
  assert.equal(a.el('hire-estimativa').textContent, 'Orçamento a combinar');
});

test('cliente vê cancelamento e profissional vê aceite/recusa; atualização usa o servidor', async () => {
  for (const id of [1, 2]) {
    let atual = pedido();
    const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', (rota, opcoes) => {
      if (rota === '/auth/me') return { id };
      if (opcoes?.method === 'PATCH') atual = { ...atual, status: 'ACEITA' };
      return atual;
    });
    const visiveis = () => a.acoes.filter(b => !b.hidden).map(b => b.dataset.acao);
    assert.deepEqual(visiveis(), id === 1 ? ['CANCELAR'] : ['ACEITAR', 'RECUSAR']);
    if (id === 2) {
      await a.acoes.find(b => b.dataset.acao === 'ACEITAR').emitir('click');
      assert.equal(a.el('status-badge').textContent, 'Pedido aceito');
      await a.el('status-atualizar').emitir('click');
      assert.equal(a.el('status-badge').textContent, 'Pedido aceito');
      assert.deepEqual(visiveis(), []);
    }
  }
});

test('pedido alheio não exibe detalhes e conflito exige releitura', async () => {
  const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota => {
    if (rota === '/auth/me') return { id: 3 };
    throw Object.assign(new Error('Pedido não encontrado'), { status: 404 });
  });
  assert.equal(a.el('status-conteudo').hidden, true);
  const b = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', (rota, opcoes) => {
    if (rota === '/auth/me') return { id: 2 };
    if (opcoes) throw Object.assign(new Error('Situação mudou'), { status: 409 });
    return pedido();
  });
  await b.acoes[0].emitir('click');
  assert.equal(b.el('status-conteudo').hidden, true);
  assert.match(b.el('status-mensagem').textContent, /Atualizar pedido/);
});

test('listas enviadas e recebidas usam a rota correta e permitem abrir o pedido para responder', async () => {
  const a = await ambiente('meus-pedidos.html', 'pedidos.js', '', () => ({ itens: [pedido()], totalPaginas: 1, pagina: 1 }));
  assert.equal(a.el('pedidos-mensagem').textContent, '');
  assert.equal(a.chamadas[0].rota, '/solicitacoes?tipo=ENVIADAS&pagina=1');
  assert.equal(a.el('pedidos-enviadas')['aria-current'], 'page');
  const b = await ambiente('meus-pedidos.html', 'pedidos.js', '?tipo=RECEBIDAS', () => ({ itens: [pedido()], totalPaginas: 1, pagina: 1 }));
  assert.equal(b.chamadas[0].rota, '/solicitacoes?tipo=RECEBIDAS&pagina=1');
  assert.equal(b.el('pedidos-recebidas')['aria-current'], 'page');
  assert.match(b.el('pedidos-orientacao').textContent, /aceitar ou recusar/);
  const card = b.el('pedidos-lista').children[0];
  assert.equal(card.children[2].textContent, 'Cliente: Cliente');
  assert.equal(card.children.at(-1).href, 'status-atendimento.html?id=20');
  assert.equal(card.children.at(-1).textContent, 'Ver pedido e responder');
  assert.ok(card.children.every(el => !/telefone|endereco/i.test(el.textContent)));
});

test('recebidos mantém filtro ao paginar e atualizar, e explica quando não há pedidos', async () => {
  const a = await ambiente('meus-pedidos.html', 'pedidos.js', '?tipo=RECEBIDAS', rota => ({
    itens: [], totalPaginas: 2, pagina: Number(new URLSearchParams(rota.split('?')[1]).get('pagina')),
  }));
  assert.match(a.el('pedidos-mensagem').textContent, /ainda não recebeu/);
  await a.el('pedidos-proxima').emitir('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(a.chamadas.at(-1).rota, '/solicitacoes?tipo=RECEBIDAS&pagina=2');
  await a.el('pedidos-atualizar').emitir('click');
  assert.equal(a.chamadas.at(-1).rota, '/solicitacoes?tipo=RECEBIDAS&pagina=2');
  assert.equal(a.el('pedidos-proxima').disabled, true);
});

test('recebidos exige login e preserva a lista no retorno', async () => {
  const a = await ambiente('meus-pedidos.html', 'pedidos.js', '?tipo=RECEBIDAS', () => {
    throw Object.assign(new Error('Entre'), { status: 401 });
  });
  assert.equal(a.redirecionamentos[0], 'login.html?retorno=meus-pedidos.html%3Ftipo%3DRECEBIDAS');
});

test('login retoma somente uma rota interna de pedidos e bloqueia destino externo', async () => {
  for (const retorno of ['contratacao.html?servico=7', 'https://example.invalid/roubar', '//example.invalid']) {
    const elementos = new Map(['login-form', 'login-email', 'login-senha', 'login-mensagem']
      .map(id => [id, new Elemento()]));
    const login = elementos.get('login-form'); login.querySelector = () => new Elemento('button');
    elementos.get('login-email').value = 'teste@example.invalid'; elementos.get('login-senha').value = 'SenhaTeste123!';
    let destino;
    const contexto = {
      URLSearchParams,
      location: { search: '?retorno=' + encodeURIComponent(retorno), assign: valor => { destino = valor; } },
      document: { getElementById: id => elementos.get(id), querySelectorAll: () => [] },
      Findy: { api: async () => ({}), mensagem() {}, enviar: async (botao, tarefa) => tarefa() },
    };
    vm.runInNewContext(fs.readFileSync(path.join(pages, 'conta.js'), 'utf8'), contexto);
    await login.emitir('submit');
    assert.equal(destino, retorno.startsWith('contratacao.html') ? retorno : 'minha-conta.html');
  }
});
