// Exibe o pedido persistido e permite somente as ações disponíveis para a conta conectada.
(() => {
  const { api, mensagem } = Findy, { rotulos, faixa, data, unidades, texto, entrar } = FindyPedidos;
  const $ = id => document.getElementById(id), aviso = $('status-mensagem');
  const id = new URLSearchParams(location.search).get('id');
  const botoes = [...document.querySelectorAll('[data-acao]')];
  let conta = null, ocupado = false, avaliando = false, sequencia = 0;
  function detalhe(rotulo, valor) {
    $('status-detalhes').append(texto('dt', rotulo), texto('dd', valor || 'Não informado'));
  }
  function limparContato() {
    $('status-contato').hidden = true;
    $('status-whatsapp').hidden = true;
    $('status-whatsapp').removeAttribute('href');
    $('status-contato-aviso').textContent = '';
  }
  function numeroWhatsapp(valor) {
    const original = String(valor ?? '').trim();
    if (!/^[+\d\s().-]+$/.test(original)) return null;
    let numero = original.replace(/\D/g, '');
    if (numero.startsWith('0055')) numero = numero.slice(2);
    // Telefones do cadastro brasileiro: DDD + número, com DDI 55 opcional.
    if ((numero.length === 12 || numero.length === 13) && numero.startsWith('55')) numero = numero.slice(2);
    if (!/^[1-9]\d[2-9]\d{7,8}$/.test(numero)) return null;
    return '55' + numero;
  }
  function contato(pedido) {
    limparContato();
    const cliente = conta.id === pedido.clienteId;
    const prestador = conta.id === pedido.profissionalId;
    if (!pedido.contatosLiberados || (!cliente && !prestador)
        || !['ACEITA', 'EM_ANDAMENTO', 'AGUARDANDO_CONFIRMACAO', 'CONCLUIDA'].includes(pedido.status)) return;
    $('status-contato').hidden = false;
    const numero = numeroWhatsapp(cliente ? pedido.telefoneProfissional : pedido.telefoneCliente);
    if (!numero) {
      $('status-contato-aviso').textContent = 'O telefone da outra pessoa está ausente ou fora do formato brasileiro com DDD. Confira os contatos acima para combinar outra forma de conversar.';
      return;
    }
    const nome = cliente ? pedido.profissional : pedido.cliente;
    const papel = cliente ? 'cliente' : 'prestador';
    const mensagem = `Olá! Sou o ${papel} do pedido #${pedido.id} no Findy, sobre ${pedido.servico}. Podemos combinar os detalhes e o valor final do serviço?`;
    const link = $('status-whatsapp');
    link.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    link.setAttribute('aria-label', `Conversar com ${nome} no WhatsApp (abre em outra aba)`);
    link.hidden = false;
    $('status-contato-aviso').textContent = 'O botão abre uma conversa externa, se o número tiver WhatsApp. Revise a mensagem e toque em enviar por lá; nada é enviado automaticamente pelo Findy.';
  }
  function mostrar(pedido) {
    $('status-titulo').textContent = `Pedido #${pedido.id} — ${pedido.servico}`;
    $('status-badge').textContent = rotulos[pedido.status] || pedido.status;
    $('status-detalhes').replaceChildren();
    detalhe('Cliente', pedido.cliente); detalhe('Profissional', pedido.profissional);
    detalhe('Horário solicitado', data(pedido.dataInicio));
    detalhe('Quantidade', `${pedido.quantidade} ${unidades[pedido.unidadeCobranca]}`);
    detalhe('Estimativa', faixa(pedido.estimativaMinima, pedido.estimativaMaxima));
    detalhe(pedido.contatosLiberados ? 'Local do atendimento' : 'Região do atendimento',
      [pedido.contatosLiberados ? pedido.endereco : null, pedido.bairro, pedido.cidade, pedido.estado].filter(Boolean).join(', '));
    detalhe('Observações', pedido.mensagem);
    if (pedido.contatosLiberados) {
      detalhe('Telefone do cliente', pedido.telefoneCliente);
      detalhe('Telefone do profissional', pedido.telefoneProfissional);
    }
    if (pedido.dataConclusao) detalhe('Concluído em', data(pedido.dataConclusao));
    $('status-privacidade').textContent = pedido.contatosLiberados
      ? 'Telefones e endereço completo disponíveis apenas aos dois participantes deste pedido, para combinar o atendimento.'
      : pedido.status === 'PENDENTE'
        ? 'Telefones e endereço completo serão liberados aos dois participantes após o aceite do prestador.'
        : 'Os telefones e o endereço completo não estão disponíveis neste pedido encerrado.';
    const futuro = new Date(pedido.dataInicio) > new Date();
    const cliente = conta.id === pedido.clienteId, profissional = conta.id === pedido.profissionalId;
    const permitidas = {
      CANCELAR: cliente && ['PENDENTE', 'ACEITA'].includes(pedido.status) && futuro,
      ACEITAR: profissional && pedido.status === 'PENDENTE',
      RECUSAR: profissional && pedido.status === 'PENDENTE',
      INICIAR: profissional && pedido.status === 'ACEITA',
      CONCLUIR: cliente && pedido.status === 'EM_ANDAMENTO',
    };
    for (const botao of botoes) {
      botao.hidden = !permitidas[botao.dataset.acao];
      botao.disabled = botao.dataset.acao === 'ACEITAR' && !futuro;
      if (botao.disabled) botao.setAttribute('aria-describedby', 'status-aviso');
      else botao.removeAttribute('aria-describedby');
    }
    $('status-aviso').textContent = pedido.status === 'ACEITA'
      ? 'O profissional confirmou a disponibilidade para o horário solicitado. O aceite não confirma o preço: cliente e prestador devem combinar o valor final e os detalhes pelo contato informado.'
      : pedido.status === 'PENDENTE' ? 'Aguardando resposta do profissional. O horário e o valor ainda precisam ser combinados.'
      : pedido.status === 'RECUSADA' ? 'O profissional recusou este pedido. Você pode escolher outro serviço.'
      : pedido.status === 'CANCELADA' ? 'Este pedido foi cancelado.'
      : pedido.status === 'EM_ANDAMENTO' ? 'Serviço iniciado pelo profissional. Quando o atendimento terminar, o cliente deve marcar Serviço concluído e poderá avaliar.'
      : pedido.status === 'CONCLUIDA' ? 'Serviço concluído pelo cliente. A avaliação fica disponível abaixo.' : 'Consulte a situação deste atendimento.';
    if (pedido.status === 'PENDENTE' && !futuro) {
      $('status-aviso').textContent = Number.isNaN(new Date(pedido.dataInicio).getTime())
        ? 'Não foi possível conferir o horário deste pedido. Atualize a página antes de aceitar.'
        : 'O horário solicitado já passou. O pedido não pode mais ser aceito; solicite ao cliente um novo pedido com data futura. Você ainda pode recusar este pedido.';
    }
    contato(pedido);
    $('status-avaliacao').hidden = pedido.status !== 'CONCLUIDA';
    $('avaliacao-form').hidden = !(cliente && pedido.status === 'CONCLUIDA' && !pedido.avaliacao);
    $('avaliacao-resumo').hidden = pedido.status !== 'CONCLUIDA' || (cliente && !pedido.avaliacao);
    $('avaliacao-resumo').textContent = pedido.avaliacao
      ? `Nota: ${pedido.avaliacao.nota}/5${pedido.avaliacao.comentario ? ' — ' + pedido.avaliacao.comentario : ''}`
      : 'O cliente ainda não enviou uma avaliação para este serviço.';
    $('status-conteudo').hidden = false;
  }
  async function carregar() {
    if (ocupado || avaliando) return;
    const atual = ++sequencia;
    limparContato();
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
    if (ocupado || avaliando) return;
    ocupado = true; ++sequencia;
    limparContato();
    botoes.forEach(b => { b.disabled = true; }); $('status-atualizar').disabled = true;
    mensagem(aviso, 'Salvando resposta…');
    try {
      const pedido = await api(`/solicitacoes/${id}/situacao`, { method: 'PATCH', body: { acao: botao.dataset.acao } });
      document.dispatchEvent?.(new CustomEvent('findy:pedidos-atualizados'));
      mostrar(pedido); mensagem(aviso, 'Situação atualizada.');
      if (botao.dataset.acao === 'CONCLUIR') {
        $('status-avaliacao').scrollIntoView?.({ block: 'nearest' }); $('avaliacao-nota').focus();
      }
    } catch (erro) {
      if (erro.status === 401) { entrar(); return; }
      $('status-conteudo').hidden = true;
      mensagem(aviso, `${erro.message} Clique em Atualizar pedido para conferir a situação.`, true);
    } finally {
      ocupado = false; botoes.forEach(b => { b.disabled = false; }); $('status-atualizar').disabled = false;
    }
  });
  $('avaliacao-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    if (ocupado || avaliando || !$('avaliacao-form').reportValidity()) return;
    avaliando = true; $('avaliacao-enviar').disabled = true; $('status-atualizar').disabled = true;
    mensagem($('avaliacao-mensagem'), 'Salvando avaliação…');
    try {
      const pedido = await api(`/solicitacoes/${id}/avaliacao`, { method: 'POST', body: {
        nota: Number($('avaliacao-nota').value), comentario: $('avaliacao-comentario').value.trim() || null,
      } });
      mostrar(pedido); mensagem($('avaliacao-mensagem'), 'Avaliação salva. Obrigado por compartilhar sua experiência!');
    } catch (erro) {
      if (erro.status === 401) { entrar(); return; }
      mensagem($('avaliacao-mensagem'), `${erro.message}${erro.status === 409 ? ' Atualize o pedido para conferir a avaliação registrada.' : ''}`, true);
    } finally { avaliando = false; $('avaliacao-enviar').disabled = false; $('status-atualizar').disabled = false; }
  });
  $('status-atualizar').addEventListener('click', carregar);
  if (id && /^[1-9]\d*$/.test(id)) carregar();
  else { $('status-atualizar').hidden = true; mensagem(aviso, 'Abra um pedido pela lista Meus pedidos.', true); }
})();
