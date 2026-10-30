// Compartilha rótulos, valores e retorno seguro ao login nas telas de pedidos.
window.FindyPedidos = (() => {
  const rotulos = {
    PENDENTE: 'Aguardando resposta', ACEITA: 'Pedido aceito', RECUSADA: 'Pedido recusado',
    CANCELADA: 'Pedido cancelado', EM_ANDAMENTO: 'Em andamento',
    AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação', CONCLUIDA: 'Concluído',
  };
  const unidades = { HORA: 'hora(s)', DIARIA: 'diária(s)', SERVICO: 'serviço' };
  const moeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  function faixa(minimo, maximo) {
    if (minimo == null) return 'Orçamento a combinar';
    return moeda(minimo) + (maximo == null || Number(maximo) === Number(minimo) ? '' : ` a ${moeda(maximo)}`);
  }
  const data = valor => new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  function entrar() {
    location.assign(`login.html?retorno=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`);
  }
  function texto(tag, conteudo, classe = '') {
    const el = document.createElement(tag); el.textContent = conteudo; el.className = classe; return el;
  }
  return { rotulos, unidades, moeda, faixa, data, entrar, texto };
})();
