// Confere abertura, respostas acessíveis, fechamento e inclusão do FAQ compartilhado.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pages = path.join(__dirname, '../pages');
const codigo = fs.readFileSync(path.join(pages, 'ajuda.js'), 'utf8');
class Elemento {
  constructor(tag) { this.tag = tag; this.children = []; this.handlers = {}; this.attrs = {}; this.open = false; }
  append(...children) { this.children.push(...children); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(k, fn) { this.handlers[k] = fn; }
  contains(el) { return this === el || this.children.some(child => child.contains(el)); }
  focus() { this.focused = true; }
  scrollIntoView(opcoes) { this.rolagem = opcoes.block; }
}
function todos(el) { return [el, ...el.children.flatMap(todos)]; }
function ambiente() {
  const body = new Elemento('body'), eventos = {};
  const document = { body, createElement: tag => new Elemento(tag),
    getElementById: id => todos(body).find(el => el.id === id),
    addEventListener: (k, fn) => { eventos[k] = fn; } };
  const contexto = vm.createContext({ document }); vm.runInContext(codigo, contexto);
  return { body, contexto, eventos, el: document.getElementById };
}

test('FAQ abre com foco no fechamento e fecha com Escape, botão e clique fora', () => {
  const a = ambiente(), abrir = a.el('findy-ajuda-abrir'), painel = a.el('findy-ajuda-painel');
  assert.equal(painel.hidden, true);
  abrir.handlers.click(); assert.equal(painel.hidden, false);
  assert.equal(abrir.attrs['aria-expanded'], 'true'); assert.equal(a.el('findy-ajuda-fechar').focused, true);
  a.eventos.keydown({ key: 'Escape' }); assert.equal(painel.hidden, true); assert.equal(abrir.focused, true);
  abrir.handlers.click(); a.eventos.click({ target: painel }); assert.equal(painel.hidden, false);
  a.eventos.click({ target: new Elemento('main') }); assert.equal(painel.hidden, true);
  abrir.handlers.click(); a.el('findy-ajuda-fechar').handlers.click(); assert.equal(painel.hidden, true);
});

test('resposta fica junto da pergunta, rola para ser vista e fecha a pergunta anterior', () => {
  const a = ambiente();
  const itens = todos(a.body).filter(el => el.tag === 'details');
  assert.equal(itens.length, 18);
  for (const item of itens) {
    assert.equal(item.children[0].tag, 'summary');
    assert.ok(item.children[0].textContent);
    assert.ok(item.children[1].children[0].textContent);
  }
  itens[0].open = true; itens[0].handlers.toggle();
  assert.equal(itens[0].children[1].rolagem, 'nearest');
  itens[1].open = true; itens[1].handlers.toggle(); assert.equal(itens[0].open, false);
  const senha = itens.find(item => item.children[0].textContent.startsWith('Esqueci minha senha'));
  assert.equal(senha.children[1].children[1].href, 'recuperar-senha.html');
});

test('componente não duplica e as doze páginas carregam a mesma ajuda sem o widget antigo', () => {
  const a = ambiente(); vm.runInContext(codigo, a.contexto); assert.equal(a.body.children.length, 1);
  for (const file of fs.readdirSync(pages).filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(pages, file), 'utf8');
    assert.equal((html.match(/src="ajuda\.js\?[^\"]+"/g) || []).length, 1, file);
    assert.equal((html.match(/href="ajuda\.css\?[^\"]+"/g) || []).length, 1, file);
    assert.equal(/class="chat-widget"|id="chat-panel"/.test(html), false, file);
  }
});
