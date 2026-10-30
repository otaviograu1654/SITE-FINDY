// Lista os pedidos enviados e recebidos pela conta com paginação da API.
(() => {
  const { api, mensagem } = Findy, { rotulos, faixa, data, texto, entrar } = FindyPedidos;
  const $ = id => document.getElementById(id);
  const seletor = $('pedidos-tipo'), lista = $('pedidos-lista'), aviso = $('pedidos-mensagem');
  const parametros = new URLSearchParams(location.search);
  seletor.value = parametros.get('tipo') === 'RECEBIDAS' ? 'RECEBIDAS' : 'ENVIADAS';
  let pagina = 1, sequencia = 0;

  async function carregar() {
    const atual = ++sequencia;
    lista.replaceChildren(); $('pedidos-paginacao').hidden = true;
    mensagem(aviso, 'Carregando pedidos…');
    try {
      const dados = await api(`/solicitacoes?${new URLSearchParams({ tipo: seletor.value, pagina })}`);
      if (atual !== sequencia) return;
      for (const pedido of dados.itens) {
        const artigo = document.createElement('article'); artigo.className = 'pedido-card';
        const link = document.createElement('a'); link.href = `status-atendimento.html?id=${pedido.id}`;
        link.append(texto('h2', `Pedido #${pedido.id} — ${pedido.servico}`));
        artigo.append(link, texto('p', rotulos[pedido.status] || pedido.status, 'pedido-situacao'),
          texto('p', `${seletor.value === 'ENVIADAS' ? 'Profissional: ' + pedido.profissional : 'Cliente: ' + pedido.cliente}`),
          texto('p', `Horário solicitado: ${data(pedido.dataInicio)}`),
          texto('p', `Estimativa: ${faixa(pedido.estimativaMinima, pedido.estimativaMaxima)} — valor final a combinar`));
        lista.append(artigo);
      }
      mensagem(aviso, dados.itens.length ? '' : 'Nenhum pedido nesta lista.');
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
  seletor.addEventListener('change', () => { pagina = 1; carregar(); });
  $('pedidos-atualizar').addEventListener('click', carregar);
  $('pedidos-anterior').addEventListener('click', () => { pagina--; carregar(); });
  $('pedidos-proxima').addEventListener('click', () => { pagina++; carregar(); });
  carregar();
})();
