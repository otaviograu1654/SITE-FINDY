// Lista os pedidos enviados e recebidos pela conta com paginação da API.
(() => {
  const { api, mensagem } = Findy, { rotulos, faixa, data, texto, entrar } = FindyPedidos;
  const $ = id => document.getElementById(id);
  const lista = $('pedidos-lista'), aviso = $('pedidos-mensagem');
  const parametros = new URLSearchParams(location.search);
  const tipo = parametros.get('tipo') === 'RECEBIDAS' ? 'RECEBIDAS' : 'ENVIADAS';
  const recebidos = tipo === 'RECEBIDAS';
  $(recebidos ? 'pedidos-recebidas' : 'pedidos-enviadas').setAttribute('aria-current', 'page');
  $('pedidos-titulo').textContent = recebidos ? 'Pedidos recebidos' : 'Pedidos enviados';
  $('pedidos-orientacao').textContent = recebidos
    ? 'Aqui estão as solicitações dos clientes para seus serviços. Abra um pedido para ver a mensagem e aceitar ou recusar. Use Atualizar lista para conferir novos pedidos.'
    : 'Acompanhe os pedidos que você enviou aos profissionais. Para atender clientes, abra Recebidos como prestador.';
  let pagina = 1, sequencia = 0;

  async function carregar() {
    const atual = ++sequencia;
    lista.replaceChildren(); $('pedidos-paginacao').hidden = true;
    mensagem(aviso, 'Carregando pedidos…');
    try {
      const dados = await api(`/solicitacoes?${new URLSearchParams({ tipo, pagina })}`);
      if (atual !== sequencia) return;
      for (const pedido of dados.itens) {
        const artigo = document.createElement('article'); artigo.className = 'pedido-card';
        const link = document.createElement('a'); link.href = `status-atendimento.html?id=${pedido.id}`;
        link.textContent = recebidos && pedido.status === 'PENDENTE' ? 'Ver pedido e responder' : 'Ver detalhes do pedido';
        link.setAttribute('aria-label', `${link.textContent} #${pedido.id} — ${pedido.servico}`);
        artigo.append(texto('h3', `Pedido #${pedido.id} — ${pedido.servico}`), texto('p', rotulos[pedido.status] || pedido.status, 'pedido-situacao'),
          texto('p', `${recebidos ? 'Cliente: ' + pedido.cliente : 'Profissional: ' + pedido.profissional}`),
          texto('p', `Horário solicitado: ${data(pedido.dataInicio)}`),
          texto('p', `Estimativa: ${faixa(pedido.estimativaMinima, pedido.estimativaMaxima)} — valor final a combinar`), link);
        lista.append(artigo);
      }
      mensagem(aviso, dados.itens.length ? '' : recebidos
        ? 'Você ainda não recebeu solicitações para seus serviços.'
        : 'Você ainda não enviou pedidos a profissionais.');
      $('pedidos-paginacao').hidden = dados.totalPaginas <= 1;
      $('pedidos-pagina').textContent = `${dados.pagina} de ${dados.totalPaginas}`;
      $('pedidos-anterior').disabled = dados.pagina <= 1;
      $('pedidos-proxima').disabled = dados.pagina >= dados.totalPaginas;
    } catch (erro) {
      if (atual !== sequencia) return;
      if (erro.status === 401) { entrar(); return; }
      mensagem(aviso, erro.message, true);
    }
  }
  $('pedidos-atualizar').addEventListener('click', carregar);
  $('pedidos-anterior').addEventListener('click', () => { pagina--; carregar(); });
  $('pedidos-proxima').addEventListener('click', () => { pagina++; carregar(); });
  carregar();
})();
