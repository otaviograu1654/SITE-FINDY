/* Comunicacao com a API. A sessao fica no cookie HttpOnly do servidor. */
window.Findy = (() => {
  const base = location.port === '5501'
    ? `${location.protocol}//${location.hostname}:8080` : '';

  async function api(caminho, opcoes = {}) {
    if (location.protocol === 'file:') {
      throw new Error('Inicie o backend e abra http://localhost:8080/login.html.');
    }
    let resposta;
    try {
      resposta = await fetch(base + caminho, {
        ...opcoes,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...opcoes.headers },
        body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
      });
    } catch {
      throw new Error('Não foi possível conectar. Confira se o backend está iniciado.');
    }
    const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
    if (!resposta.ok) {
      const erro = new Error(dados?.mensagem || {
        400: 'Confira os campos preenchidos.',
        401: 'Entre novamente na sua conta.',
        404: 'Perfil não encontrado.',
        409: 'Este cadastro já existe.',
      }[resposta.status] || 'Não foi possível concluir a operação.');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  function mensagem(elemento, texto, erro = false) {
    elemento.textContent = texto;
    elemento.classList.toggle('mensagem-erro', erro);
    elemento.hidden = !texto;
  }

  async function enviar(botao, tarefa) {
    botao.disabled = true;
    try { return await tarefa(); } finally { botao.disabled = false; }
  }

  function foto(valor) {
    if (!valor) return 'images/chat-avatar.png';
    try {
      const url = new URL(valor, location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : 'images/chat-avatar.png';
    } catch { return 'images/chat-avatar.png'; }
  }

  return { api, mensagem, enviar, foto };
})();
