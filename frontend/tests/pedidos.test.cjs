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
  removeAttribute(nome) { delete this[nome]; }
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
      getElementById: id => {
        if (['login-form', 'signup-form', 'dados-pessoais'].includes(id) && !elementos.has(id)) return null;
        assert.ok(elementos.has(id), `ID existente no HTML: ${id}`); return elementos.get(id);
      },
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
      assert.deepEqual(visiveis(), ['INICIAR']);
    }
  }
});

test('prestador sempre encontra aceite e recusa no pedido pendente, com motivo se o horário passou', async () => {
  let atual = { ...pedido(), dataInicio: new Date(Date.now() - 86400000).toISOString() };
  const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
    rota === '/auth/me' ? { id: 2 } : atual);
  const aceitar = a.acoes.find(b => b.dataset.acao === 'ACEITAR');
  const recusar = a.acoes.find(b => b.dataset.acao === 'RECUSAR');
  assert.equal(aceitar.hidden, false); assert.equal(aceitar.disabled, true);
  assert.equal(recusar.hidden, false); assert.equal(recusar.disabled, false);
  assert.match(a.el('status-aviso').textContent, /horário solicitado já passou/);
  atual = { ...atual, dataInicio: futuro() };
  await a.el('status-atualizar').emitir('click');
  assert.equal(aceitar.hidden, false); assert.equal(aceitar.disabled, false);
  assert.equal(aceitar['aria-describedby'], undefined);
});

test('detalhes mostram contatos apenas quando servidor libera após aceite e retiram ao cancelar', async () => {
  let atual = { ...pedido(), telefoneCliente: '34911112222', telefoneProfissional: '34933334444',
    endereco: 'Rua privada, 10', bairro: 'Centro', cidade: 'Patos de Minas', estado: 'MG', contatosLiberados: false };
  const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
    rota === '/auth/me' ? { id: 1 } : atual);
  const detalhes = () => a.el('status-detalhes').children.map(el => el.textContent).join(' ');
  assert.doesNotMatch(detalhes(), /34911112222|34933334444|Rua privada/);
  assert.match(detalhes(), /Centro/);
  assert.match(a.el('status-privacidade').textContent, /após o aceite/);
  atual = { ...atual, status: 'ACEITA', contatosLiberados: true };
  await a.el('status-atualizar').emitir('click');
  assert.match(detalhes(), /34911112222/); assert.match(detalhes(), /Rua privada/);
  assert.match(a.el('status-aviso').textContent, /não confirma o preço/);
  atual = { ...atual, status: 'CANCELADA', contatosLiberados: false };
  await a.el('status-atualizar').emitir('click');
  assert.doesNotMatch(detalhes(), /34911112222|34933334444|Rua privada/);
});

test('WhatsApp após aceite aponta para a outra pessoa e prepara mensagem sem enviar', async () => {
  for (const id of [1, 2]) {
    const atual = { ...pedido(), status: 'ACEITA', contatosLiberados: true,
      telefoneCliente: '(34) 91111-2222', telefoneProfissional: '+55 (34) 93333-4444' };
    const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
      rota === '/auth/me' ? { id } : atual);
    const link = a.el('status-whatsapp');
    assert.equal(link.hidden, false);
    const url = new URL(link.href);
    assert.equal(url.origin, 'https://wa.me');
    assert.equal(url.pathname, id === 1 ? '/5534933334444' : '/5534911112222');
    assert.match(url.searchParams.get('text'), /pedido #20 no Findy/);
    assert.match(url.searchParams.get('text'), /Criação de sites/);
    assert.match(url.searchParams.get('text'), id === 1 ? /Sou o cliente/ : /Sou o prestador/);
    assert.match(a.el('status-contato-aviso').textContent, /nada é enviado automaticamente/);
    assert.ok(a.chamadas.every(c => !c.opcoes));
  }
});

test('WhatsApp não aparece antes do aceite, após encerramento ou para outra conta', async () => {
  for (const status of ['PENDENTE', 'RECUSADA', 'CANCELADA']) {
    const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
      rota === '/auth/me' ? { id: 1 } : { ...pedido(), status, contatosLiberados: true, telefoneProfissional: '34999999999' });
    assert.equal(a.el('status-contato').hidden, true);
    assert.equal(a.el('status-whatsapp').href, undefined);
  }
  const b = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
    rota === '/auth/me' ? { id: 3 } : { ...pedido(), status: 'ACEITA', contatosLiberados: true, telefoneProfissional: '34999999999' });
  assert.equal(b.el('status-whatsapp').hidden, true);
});

test('WhatsApp normaliza DDD/DDI brasileiros e explica telefone inválido sem inventar destino', async () => {
  for (const telefone of ['(34) 99999-9999', '5534999999999', '005534999999999']) {
    const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
      rota === '/auth/me' ? { id: 1 } : { ...pedido(), status: 'ACEITA', contatosLiberados: true, telefoneProfissional: telefone });
    assert.equal(new URL(a.el('status-whatsapp').href).pathname, '/5534999999999');
  }
  for (const telefone of [null, '', '123', '+1 202 555 0100', 'javascript:alert(1)']) {
    const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota =>
      rota === '/auth/me' ? { id: 1 } : { ...pedido(), status: 'ACEITA', contatosLiberados: true, telefoneProfissional: telefone });
    assert.equal(a.el('status-whatsapp').hidden, true);
    assert.equal(a.el('status-whatsapp').href, undefined);
    assert.match(a.el('status-contato-aviso').textContent, /ausente ou fora do formato/);
  }
});

test('WhatsApp é removido ao cancelar ou quando a releitura do pedido falha', async () => {
  let atual = { ...pedido(), status: 'ACEITA', contatosLiberados: true, telefoneProfissional: '34999999999' };
  let falhar = false;
  const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', rota => {
    if (rota === '/auth/me') return { id: 1 };
    if (falhar) throw new Error('Sem conexão');
    return atual;
  });
  assert.equal(a.el('status-whatsapp').hidden, false);
  atual = { ...atual, status: 'CANCELADA', contatosLiberados: false };
  await a.el('status-atualizar').emitir('click');
  assert.equal(a.el('status-whatsapp').href, undefined);
  atual = { ...atual, status: 'ACEITA', contatosLiberados: true };
  await a.el('status-atualizar').emitir('click'); assert.equal(a.el('status-whatsapp').hidden, false);
  falhar = true; await a.el('status-atualizar').emitir('click');
  assert.equal(a.el('status-whatsapp').href, undefined);
});

test('prestador inicia e cliente conclui e avalia sem nova confirmação do profissional', async () => {
  let atual = { ...pedido(), status: 'ACEITA', contatosLiberados: true };
  const resposta = (id) => (rota, opcoes) => {
    if (rota === '/auth/me') return { id };
    if (opcoes?.method === 'PATCH') atual = { ...atual, status: opcoes.body.acao === 'INICIAR' ? 'EM_ANDAMENTO' : 'CONCLUIDA' };
    if (rota.endsWith('/avaliacao')) atual = { ...atual, avaliacao: { nota: opcoes.body.nota, comentario: opcoes.body.comentario } };
    return atual;
  };
  const prestador = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', resposta(2));
  const visiveis = a => a.acoes.filter(b => !b.hidden).map(b => b.dataset.acao);
  assert.deepEqual(visiveis(prestador), ['INICIAR']);
  await prestador.acoes.find(b => b.dataset.acao === 'INICIAR').emitir('click');
  assert.equal(prestador.el('status-badge').textContent, 'Em andamento');
  assert.deepEqual(visiveis(prestador), []);
  const cliente = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', resposta(1));
  assert.deepEqual(visiveis(cliente), ['CONCLUIR']);
  assert.equal(cliente.el('avaliacao-form').hidden, true);
  await cliente.acoes.find(b => b.dataset.acao === 'CONCLUIR').emitir('click');
  assert.equal(cliente.el('avaliacao-form').hidden, false);
  assert.equal(cliente.el('avaliacao-nota').focused, true);
  cliente.el('avaliacao-nota').value = '5'; cliente.el('avaliacao-comentario').value = 'Ótimo atendimento';
  await cliente.el('avaliacao-form').emitir('submit');
  assert.equal(cliente.chamadas.at(-1).rota, '/solicitacoes/20/avaliacao');
  assert.equal(cliente.chamadas.at(-1).opcoes.body.nota, 5);
  assert.equal(cliente.el('avaliacao-form').hidden, true);
  assert.match(cliente.el('avaliacao-resumo').textContent, /5\/5.*Ótimo/);
  await cliente.el('status-atualizar').emitir('click');
  assert.equal(cliente.el('avaliacao-form').hidden, true);
});

test('falha ao avaliar preserva texto e clique repetido não duplica o envio', async () => {
  let terminar, falhar = false;
  const a = await ambiente('status-atendimento.html', 'atendimento.js', '?id=20', (rota, opcoes) => {
    if (rota === '/auth/me') return { id: 1 };
    if (rota.endsWith('/avaliacao')) {
      if (falhar) throw new Error('Falha ao salvar');
      return new Promise(resolve => { terminar = resolve; });
    }
    return { ...pedido(), status: 'CONCLUIDA' };
  });
  a.el('avaliacao-nota').value = '4'; a.el('avaliacao-comentario').value = 'Meu comentário';
  const envio = a.el('avaliacao-form').emitir('submit');
  await a.el('avaliacao-form').emitir('submit');
  assert.equal(a.chamadas.filter(c => c.rota.endsWith('/avaliacao')).length, 1);
  terminar({ ...pedido(), status: 'CONCLUIDA', avaliacao: { nota: 4 } }); await envio;
  falhar = true; await a.el('status-atualizar').emitir('click');
  await a.el('avaliacao-form').emitir('submit');
  assert.equal(a.el('avaliacao-comentario').value, 'Meu comentário');
  assert.equal(a.el('avaliacao-enviar').disabled, false);
  assert.match(a.el('avaliacao-mensagem').textContent, /Falha ao salvar/);
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

test('painel mostra pedidos recentes dos dois lados e abre recebidos para resposta', async () => {
  const a = await ambiente('minha-conta.html', 'painel-conta.js', '', rota => {
    if (rota === '/auth/me') return { id: 2, nome: 'Otávio' };
    assert.match(rota, /^\/solicitacoes\?tipo=(RECEBIDAS|ENVIADAS)&pagina=1$/);
    return { total: 7, itens: Array.from({ length: 7 }, (_, i) => ({ ...pedido(), id: 20 + i })) };
  });
  assert.equal(a.el('painel-saudacao').textContent, 'Olá, Otávio!');
  assert.equal(a.el('painel-recebidos').children.length, 5);
  assert.equal(a.el('painel-recebidos-resumo').textContent, '7 pedido(s) ao todo');
  const link = a.el('painel-recebidos').children[0].children.at(-1);
  assert.equal(link.textContent, 'Ver pedido e responder');
  assert.equal(link.href, 'status-atendimento.html?id=20');
  assert.equal(a.el('painel-enviados').children[0].children.at(-1).textContent, 'Acompanhar pedido');
  await a.el('painel-atualizar').emitir('click');
  assert.equal(a.chamadas.filter(c => c.rota.includes('tipo=RECEBIDAS')).length, 2);
});

test('painel diferencia listas vazias de falhas e mantém a outra lista acessível', async () => {
  const a = await ambiente('minha-conta.html', 'painel-conta.js', '', rota => {
    if (rota === '/auth/me') return { nome: 'Cliente' };
    if (rota.includes('RECEBIDAS')) throw new Error('Falha de conexão');
    return { itens: [], total: 0 };
  });
  assert.match(a.el('painel-recebidos').children[0].textContent, /Não foi possível carregar/);
  assert.equal(a.el('painel-recebidos-resumo').textContent, '');
  assert.match(a.el('painel-enviados').children[0].textContent, /ainda não solicitou/);
  assert.equal(a.el('painel-atualizar').disabled, false);
});

test('painel exige sessão e perfil público não carrega dados privados do editor', async () => {
  const a = await ambiente('minha-conta.html', 'painel-conta.js', '', () => {
    throw Object.assign(new Error('Entre'), { status: 401 });
  });
  assert.deepEqual(a.redirecionamentos, ['login.html']);
  const b = await ambiente('perfil-prestador.html', 'conta.js', '?id=1', () => assert.fail('Consulta privada em perfil público'));
  assert.equal(b.chamadas.length, 0);
  assert.equal(b.el('dados-pessoais').hidden, true);
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
