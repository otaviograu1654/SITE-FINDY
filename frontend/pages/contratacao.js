// Carrega uma oferta pública e salva a solicitação real pela API.
(() => {
  const { api, mensagem, foto } = Findy;
  const { faixa, unidades, entrar } = FindyPedidos;
  const $ = id => document.getElementById(id);
  const form = $('hire-form'), aviso = $('hire-mensagem'), campos = $('hire-campos');
  const botao = $('hire-enviar'), quantidade = $('hire-quantidade');
  const id = new URLSearchParams(location.search).get('servico');
  let oferta = null, ocupado = false;

  function estimar() {
    if (!oferta) return;
    const q = Number(quantidade.value);
    $('hire-referencia').textContent = faixa(oferta.preco, oferta.preco_maximo);
    $('hire-unidade').textContent = unidades[oferta.unidade_cobranca];
    $('hire-estimativa').textContent = q > 0
      ? faixa(oferta.preco == null ? null : oferta.preco * q,
          oferta.preco_maximo == null ? null : oferta.preco_maximo * q) : 'Informe a quantidade';
  }
  quantidade.addEventListener('input', estimar);

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (!oferta || ocupado || !form.reportValidity()) return;
    const inicio = new Date(`${$('hire-data').value}T${$('hire-hora').value}`);
    if (!Number.isFinite(inicio.getTime()) || inicio <= new Date()) {
      mensagem(aviso, 'Escolha uma data e horário futuros.', true); return;
    }
    ocupado = true; campos.disabled = true; botao.disabled = true;
    mensagem(aviso, 'Enviando solicitação…');
    try {
      const pedido = await api('/solicitacoes', { method: 'POST', body: {
        servicoId: oferta.servico_id, dataInicio: inicio.toISOString(), quantidade: Number(quantidade.value),
        endereco: $('hire-endereco').value.trim(), bairro: $('hire-bairro').value.trim(),
        cidade: $('hire-cidade').value.trim(), estado: $('hire-estado').value.trim().toUpperCase(),
        mensagem: $('hire-observacoes').value.trim(),
      }});
      // Sucesso somente depois da confirmação do servidor; não repetir o POST.
      $('hire-layout').hidden = true; $('hire-success').hidden = false;
      $('hire-success-nome').textContent = oferta.nome;
      $('link-status-atendimento').href = `status-atendimento.html?id=${pedido.id}`;
      $('hire-success').focus(); mensagem(aviso, 'Solicitação salva. Aguardando resposta do profissional.');
    } catch (erro) {
      if (erro.status === 401) { entrar(); return; }
      mensagem(aviso, erro.message, true); ocupado = false; campos.disabled = false; botao.disabled = false;
    }
  });

  (async () => {
    if (!id || !/^[1-9]\d*$/.test(id)) {
      mensagem(aviso, 'Escolha um serviço no perfil do profissional antes de solicitar.', true); return;
    }
    try {
      const pessoa = await api('/perfil');
      oferta = await api(`/servicos/${id}`);
      $('hire-prestador-nome').textContent = oferta.nome;
      $('hire-servico').textContent = oferta.titulo;
      $('hire-prestador-categoria').textContent = oferta.categoria;
      $('hire-prestador-local').textContent = [oferta.bairro, oferta.cidade, oferta.estado].filter(Boolean).join(', ');
      $('hire-prestador-foto').src = foto(oferta.foto);
      $('hire-voltar').href = `perfil-prestador.html?id=${oferta.prestador_id}`;
      $('hire-demo').hidden = !oferta.demonstracao;
      $('hire-cidade').value = pessoa.cidade || ''; $('hire-estado').value = pessoa.estado || '';
      $('hire-bairro').value = pessoa.bairro || '';
      const hoje = new Date();
      $('hire-data').min = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      quantidade.value = '1'; quantidade.readOnly = oferta.unidade_cobranca === 'SERVICO';
      quantidade.step = oferta.unidade_cobranca === 'HORA' ? '0.01' : '1';
      quantidade.min = oferta.unidade_cobranca === 'HORA' ? '0.01' : '1';
      campos.disabled = false; botao.disabled = false; $('hire-layout').hidden = false;
      $('hire-telefone-aviso').hidden = /^[0-9]{10,13}$/.test((pessoa.telefone || '').replace(/\D/g, ''));
      estimar(); mensagem(aviso, '');
    } catch (erro) {
      if (erro.status === 401) { entrar(); return; }
      mensagem(aviso, erro.message, true);
    }
  })();
})();
