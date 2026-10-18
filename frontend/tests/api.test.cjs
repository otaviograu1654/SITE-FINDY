// Verifica chamadas JSON e upload de fotos sem fazer requisições reais.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const codigo = fs.readFileSync(path.join(__dirname, '../pages/api.js'), 'utf8');

function ambiente(port = '') {
  const chamadas = [];
  const location = port
    ? { port, protocol: 'http:', hostname: 'localhost', href: `http://localhost:${port}/minha-conta.html` }
    : { port: '', protocol: 'https:', hostname: 'findy.example', href: 'https://findy.example/minha-conta.html' };
  const contexto = {
    window: {}, location, FormData, URL,
    fetch: async (url, opcoes) => {
      chamadas.push({ url, opcoes });
      return { status: 200, ok: true, json: async () => ({ foto: '/fotos/1?v=teste' }) };
    },
  };
  vm.runInNewContext(codigo, contexto);
  return { api: contexto.window.Findy, chamadas };
}

test('mantém o JSON e o cookie nas chamadas de login', async () => {
  const { api, chamadas } = ambiente();
  await api.api('/auth/login', { method: 'POST', body: { email: 'teste@example.invalid', senha: 'teste' } });
  assert.equal(chamadas[0].opcoes.headers['Content-Type'], 'application/json');
  assert.equal(chamadas[0].opcoes.credentials, 'include');
  assert.equal(JSON.parse(chamadas[0].opcoes.body).email, 'teste@example.invalid');
});

test('envia FormData sem substituir o cabeçalho multipart do navegador', async () => {
  const { api, chamadas } = ambiente();
  const dados = new FormData();
  dados.append('foto', new Blob(['teste'], { type: 'image/png' }), 'foto.png');
  await api.api('/fotos/me', { method: 'POST', body: dados });
  assert.equal(chamadas[0].opcoes.body, dados);
  assert.equal(chamadas[0].opcoes.headers['Content-Type'], undefined);
  assert.equal(chamadas[0].opcoes.credentials, 'include');
});

test('resolve foto e upload no backend quando usa Live Server', async () => {
  const { api, chamadas } = ambiente('5501');
  assert.equal(api.foto('/fotos/1?v=teste'), 'http://localhost:8080/fotos/1?v=teste');
  await api.api('/fotos/me', { method: 'POST', body: new FormData() });
  assert.equal(chamadas[0].url, 'http://localhost:8080/fotos/me');
});

test('resolve fotos na hospedagem e preserva links antigos de imagem', () => {
  const { api } = ambiente();
  assert.equal(api.foto('/fotos/1?v=teste'), 'https://findy.example/fotos/1?v=teste');
  assert.equal(api.foto('https://images.example/avatar.jpg'), 'https://images.example/avatar.jpg');
  assert.equal(api.foto('data:image/png;base64,teste'), 'images/chat-avatar.png');
});
