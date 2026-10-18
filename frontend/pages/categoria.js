(() => {
  const { api, mensagem, foto } = Findy;
  const grade = document.getElementById('professional-grid');
  const navegacao = document.querySelector('.pagination');
  const busca = document.querySelector('.search-form');

  const parametros = new URLSearchParams(location.search);
  const categoria = parametros.get('categoria') || '';
  let termo = parametros.get('q') || '';
  let pagina = 1;
  let requisicaoAtual = 0;

  const aviso = document.createElement('p');
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  grade.before(aviso);

  const titulo = document.querySelector('.category-results__title');
  titulo.textContent = categoria
    ? `Profissionais: ${categoria}`
    : 'Encontre um profissional';

  busca.querySelector('input').value = termo;

  function texto(tag, classe, conteudo) {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    elemento.textContent = conteudo;
    return elemento;
  }

  function card(item) {
    const artigo = document.createElement('article');
    artigo.className = 'professional-card';

    const imagem = document.createElement('img');
    imagem.className = 'professional-card__photo';
    imagem.src = foto(item.foto);
    imagem.alt = '';
    imagem.loading = 'lazy';
    imagem.style.objectFit = 'cover';
    imagem.style.width = '100%';
    imagem.addEventListener('error', () => {
      imagem.src = 'images/chat-avatar.png';
    }, { once: true });

    const rodape = document.createElement('div');
    rodape.className = 'professional-card__footer';

    rodape.append(
      texto('h2', 'professional-card__name', item.nome),
      texto('p', 'professional-card__desc', item.descricao),
      texto('p', 'professional-card__category', item.categoria)
    );

    if (item.demonstracao) {
      rodape.append(texto('p', '', 'Perfil de demonstração'));
    }

    const valor = item.preco === null
      ? 'Orçamento a combinar'
      : Number(item.preco).toLocaleString('pt-BR', {
          style: 'currency', currency: 'BRL',
        });

    const link = document.createElement('a');
    link.className = 'card__arrow professional-card__arrow';
    link.href = `perfil-prestador.html?id=${item.prestador_id}`;
    link.textContent = '→';
    link.setAttribute('aria-label', `Ver perfil de ${item.nome}`);
    const linha = document.createElement('div');
    linha.className = 'professional-card__row';
    linha.append(texto('p', '', valor), link);
    rodape.append(linha);

    artigo.append(imagem, rodape);
    return artigo;
  }

  function botaoPagina(rotulo, destino) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'pagination__page';
    botao.textContent = rotulo;

    botao.addEventListener('click', () => {
      pagina = destino;
      carregar();
    });

    return botao;
  }

  async function carregar() {
    const requisicao = ++requisicaoAtual;
    grade.replaceChildren();
    navegacao.replaceChildren();
    mensagem(aviso, 'Carregando profissionais…');

    try {
      const consulta = new URLSearchParams({
        categoria, q: termo, pagina: String(pagina),
      });

      const dados = await api(`/servicos?${consulta}`);
      if (requisicao !== requisicaoAtual) return;

      for (const item of dados.itens) grade.append(card(item));

      mensagem(
        aviso,
        dados.itens.length ? '' : 'Nenhum profissional encontrado.'
      );

      if (pagina > 1) {
        navegacao.append(botaoPagina('Anterior', pagina - 1));
      }

      if (dados.totalPaginas > 1) {
        navegacao.append(
          texto('span', '', `${pagina} de ${dados.totalPaginas}`)
        );
      }

      if (pagina < dados.totalPaginas) {
        navegacao.append(botaoPagina('Próxima', pagina + 1));
      }
    } catch (erro) {
      if (requisicao !== requisicaoAtual) return;
      mensagem(aviso, erro.message, true);
    }
  }

  busca.addEventListener('submit', evento => {
    evento.preventDefault();
    termo = busca.querySelector('input').value.trim();
    pagina = 1;
    carregar();
  });

  carregar();
})();
