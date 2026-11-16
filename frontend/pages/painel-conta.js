// Mostra os pedidos recentes da conta usando as listas autenticadas existentes.
(() => {
  const { api, mensagem } = Findy;
  const { rotulos, data, texto } = FindyPedidos;
  const $ = id => document.getElementById(id);
  const aviso = $('conta-mensagem'), atualizar = $('painel-atualizar');
  let ocupado = false;

  async function lista(tipo, destino) {
    const grade = $(`painel-${destino}`), resumo = $(`painel-${destino}-resumo`);
    grade.replaceChildren(); resumo.textContent = 'Carregando…';
    try {
      const dados = await api(`/solicitacoes?tipo=${tipo}&pagina=1`);
      resumo.textContent = `${dados.total} pedido(s) ao todo`;
      if (!dados.itens.length) {
        grade.append(texto('p', tipo === 'RECEBIDAS'
          ? 'Você ainda não recebeu solicitações para seus serviços.'
          : 'Você ainda não solicitou um serviço.'));
      }
      for (const pedido of dados.itens.slice(0, 5)) {
        const card = texto('article', '', 'conta-pedido');
        const situacao = rotulos[pedido.status] || pedido.status;
        const link = texto('a', tipo === 'RECEBIDAS' && pedido.status === 'PENDENTE'
          ? 'Ver pedido e responder' : 'Acompanhar pedido', 'perfil-link');
        link.href = `status-atendimento.html?id=${pedido.id}`;
        link.setAttribute('aria-label', `${link.textContent} #${pedido.id} — ${pedido.servico}`);
        card.append(texto('h3', `#${pedido.id} — ${pedido.servico}`),
          texto('p', situacao, 'perfil-status'),
          texto('p', tipo === 'RECEBIDAS' ? `Cliente: ${pedido.cliente}` : `Profissional: ${pedido.profissional}`),
          texto('p', `Horário solicitado: ${data(pedido.dataInicio)}`), link);
        grade.append(card);
      }
    } catch (erro) {
      resumo.textContent = '';
      if (erro.status === 401) throw erro;
      grade.append(texto('p', `Não foi possível carregar esta lista. ${erro.message}`, 'mensagem-erro'));
    }
  }
  async function carregar() {
    if (ocupado) return;
    ocupado = true; atualizar.disabled = true;
    mensagem(aviso, 'Atualizando painel…');
    try {
      const conta = await api('/auth/me');
      $('painel-saudacao').textContent = `Olá, ${conta.nome}!`;
      await Promise.all([lista('RECEBIDAS', 'recebidos'), lista('ENVIADAS', 'enviados')]);
      mensagem(aviso, '');
    } catch (erro) {
      if (erro.status === 401) { location.assign('login.html'); return; }
      mensagem(aviso, erro.message, true);
    } finally { ocupado = false; atualizar.disabled = false; }
  }
  atualizar.addEventListener('click', carregar);
  carregar();
})();
