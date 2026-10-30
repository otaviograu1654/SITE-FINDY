// Exibe o pedido persistido e permite somente as ações disponíveis para a conta conectada.
(() => {
  const { api, mensagem } = Findy, { rotulos, faixa, data, unidades, texto, entrar } = FindyPedidos;
  const $ = id => document.getElementById(id), aviso = $('status-mensagem');
  const id = new URLSearchParams(location.search).get('id');
  const botoes = [...document.querySelectorAll('[data-acao]')];
  let conta = null, ocupado = false, sequencia = 0;
  function detalhe(rotulo, valor) {
    $('status-detalhes').append(texto('dt', rotulo), texto('dd', valor || 'Não informado'));
  }
  function mostrar(pedido) {
    $('status-titulo').textContent = `Pedido #${pedido.id} — ${pedido.servico}`;
    $('status-badge').textContent = rotulos[pedido.status] || pedido.status;
    $('status-detalhes').replaceChildren();
    detalhe('Cliente', pedido.cliente); detalhe('Profissional', pedido.profissional);
    detalhe('Horário solicitado', data(pedido.dataInicio));
    detalhe('Quantidade', `${pedido.quantidade} ${unidades[pedido.unidadeCobranca]}`);
    detalhe('Estimativa', faixa(pedido.estimativaMinima, pedido.estimativaMaxima));
    detalhe('Local do atendimento', [pedido.endereco, pedido.bairro, pedido.cidade, pedido.estado].filter(Boolean).join(', '));
    detalhe('Observações', pedido.mensagem); detalhe('Telefone do cliente', pedido.telefoneCliente);
    detalhe('Telefone do profissional', pedido.telefoneProfissional);
    const futuro = new Date(pedido.dataInicio) > new Date();
    for (const botao of botoes) {
      botao.hidden = botao.dataset.acao === 'CANCELAR'
        ? !(conta.id === pedido.clienteId && ['PENDENTE', 'ACEITA'].includes(pedido.status) && futuro)
        : !(conta.id === pedido.profissionalId && pedido.status === 'PENDENTE'
            && (botao.dataset.acao === 'RECUSAR' || futuro));
    }
    $('status-aviso').textContent = pedido.status === 'ACEITA'
      ? 'O profissional aceitou o horário solicitado. Combinem o valor final e os detalhes pelo contato informado.'
      : pedido.status === 'PENDENTE' ? 'Aguardando resposta do profissional. O horário e o valor ainda precisam ser combinados.'
      : pedido.status === 'RECUSADA' ? 'O profissional recusou este pedido. Você pode escolher outro serviço.'
      : pedido.status === 'CANCELADA' ? 'Este pedido foi cancelado.' : 'Consulte a situação deste atendimento.';
    $('status-conteudo').hidden = false;
  }
  async function carregar() {
    if (ocupado) return;
    const atual = ++sequencia;
    $('status-conteudo').hidden = true; mensagem(aviso, 'Carregando pedido…');
    try {
      const usuario = await api('/auth/me');
      const pedido = await api(`/solicitacoes/${id}`);
      if (atual !== sequencia) return;
      conta = usuario;
      mostrar(pedido); mensagem(aviso, '');
    } catch (erro) {
      if (atual !== sequencia) return;
      if (erro.status === 401) { entrar(); return; }
      mensagem(aviso, erro.message, true);
    }
  }
  for (const botao of botoes) botao.addEventListener('click', async () => {
    if (ocupado) return;
    ocupado = true; ++sequencia;
    botoes.forEach(b => { b.disabled = true; }); $('status-atualizar').disabled = true;
    mensagem(aviso, 'Salvando resposta…');
    try {
      const pedido = await api(`/solicitacoes/${id}/situacao`, { method: 'PATCH', body: { acao: botao.dataset.acao } });
      mostrar(pedido); mensagem(aviso, 'Situação atualizada.');
    } catch (erro) {
      if (erro.status === 401) { entrar(); return; }
      $('status-conteudo').hidden = true;
      mensagem(aviso, `${erro.message} Clique em Atualizar pedido para conferir a situação.`, true);
    } finally {
      ocupado = false; botoes.forEach(b => { b.disabled = false; }); $('status-atualizar').disabled = false;
    }
  });
  $('status-atualizar').addEventListener('click', carregar);
  if (id && /^[1-9]\d*$/.test(id)) carregar();
  else { $('status-atualizar').hidden = true; mensagem(aviso, 'Abra um pedido pela lista Meus pedidos.', true); }
})();
