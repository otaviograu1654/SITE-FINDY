const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const codigo = fs.readFileSync(require('node:path').join(__dirname, '../pages/portfolio.js'), 'utf8');
class Elemento {
  constructor() { this.children = []; this.handlers = {}; this.hidden = false; this.disabled = false; this.files = []; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(k, v) { this[k] = v; }
  addEventListener(k, v) { this.handlers[k] = v; }
  querySelector() { return this.botao; }
  reportValidity() { return true; }
  reset() { this.limpo = true; }
}
async function ambiente({ search = '', responder = () => [] } = {}) {
  const els = Object.fromEntries(['portfolio-secao','portfolio-galeria','portfolio-mensagem','portfolio-form','portfolio-arquivo'].map(id => [id, new Elemento()]));
  els['portfolio-form'].botao = new Elemento(); els['portfolio-form'].hidden = true;
  const chamadas = [];
  vm.runInNewContext(codigo, {
    location: { search }, URLSearchParams, encodeURIComponent, FormData: class { constructor(form) { this.form = form; } },
    document: { getElementById: id => els[id], createElement: () => new Elemento(), addEventListener() {} },
    Findy: { api: async (rota, opcoes) => { chamadas.push({ rota, opcoes }); return responder(rota, opcoes); }, foto: x => x,
      mensagem: (el, texto) => { el.textContent = texto; } },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { els, chamadas, form: els['portfolio-form'], galeria: els['portfolio-galeria'], aviso: els['portfolio-mensagem'] };
}
const foto = { id: 1, foto: '/portfolio/fotos/1', legenda: '<script>exemplo</script>' };
test('perfil público mostra galeria sem controles privados e usa legenda como texto', async () => {
  const a = await ambiente({ search: '?id=7', responder: () => [foto] });
  assert.equal(a.chamadas[0].rota, '/portfolio/prestadores/7');
  assert.equal(a.form.hidden, true);
  const card = a.galeria.children[0]; assert.equal(card.children.length, 2);
  assert.equal(card.children[1].textContent, foto.legenda);
});
test('dono envia multipart, recarrega a galeria e remove pelo endpoint privado', async () => {
  let fotos = [];
  const a = await ambiente({ responder: (rota, opcoes) => {
    if (opcoes?.method === 'POST') { fotos = [foto]; return foto; }
    if (opcoes?.method === 'DELETE') { fotos = []; return null; }
    return fotos;
  } });
  assert.equal(a.form.hidden, false);
  a.els['portfolio-arquivo'].files = [{ type: 'image/png', size: 100 }];
  await a.form.handlers.submit({ preventDefault() {} });
  assert.equal(a.form.limpo, true); assert.equal(a.galeria.children.length, 1);
  assert.equal(a.chamadas.find(c => c.opcoes?.method === 'POST').opcoes.body.form, a.form);
  await a.galeria.children[0].children[2].handlers.click();
  assert.equal(a.chamadas.find(c => c.opcoes?.method === 'DELETE').rota, '/portfolio/me/1');
  assert.equal(a.galeria.children.length, 0);
});
test('falha preserva o formulário; arquivo inválido não é enviado; limite bloqueia upload', async () => {
  const a = await ambiente({ responder: (rota, opcoes) => { if (opcoes) throw Error('Falha de envio'); return []; } });
  a.els['portfolio-arquivo'].files = [{ type: 'image/svg+xml', size: 100 }];
  await a.form.handlers.submit({ preventDefault() {} }); assert.equal(a.chamadas.length, 1);
  a.els['portfolio-arquivo'].files = [{ type: 'image/jpeg', size: 100 }];
  await a.form.handlers.submit({ preventDefault() {} });
  assert.equal(a.form.limpo, undefined); assert.equal(a.aviso.textContent, 'Falha de envio'); assert.equal(a.form.botao.disabled, false);
  const b = await ambiente({ responder: () => Array(10).fill(foto) }); assert.equal(b.form.botao.disabled, true);
});
