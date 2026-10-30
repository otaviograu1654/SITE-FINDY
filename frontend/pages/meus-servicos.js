// Carrega, cadastra e edita os serviços da conta usando a API.

(() => {
  const { api, mensagem } = Findy;

  const form = document.getElementById('servico-form');
  const campos = document.getElementById('servico-campos');
  const aviso = document.getElementById('servicos-mensagem');
  const lista = document.getElementById('servicos-lista');
  const tituloForm = document.getElementById('form-titulo');
  const cancelar = document.getElementById('cancelar-edicao');

  let editandoId = null;
  let ocupado = false;

  function campo(nome) {
    return form.elements.namedItem(nome);
  }

  function tratarErro(erro) {
    if (erro.status === 401) {
      location.href = 'login.html';
      return;
    }

    mensagem(aviso, erro.message, true);
  }

  function limparFormulario() {
    editandoId = null;
    form.reset();

    tituloForm.textContent = 'Cadastrar serviço';
    cancelar.hidden = true;
  }

  function editar(servico) {
    if (ocupado) return;

    editandoId = servico.id;

    campo('titulo').value = servico.titulo;
    campo('descricao').value = servico.descricao || '';
    campo('categoriaId').value = String(servico.categoria_id);
    campo('preco').value = servico.preco ?? '';
    campo('precoMaximo').value = servico.preco_maximo ?? '';
    campo('unidadeCobranca').value = servico.unidade_cobranca;
    campo('ativo').checked = servico.ativo;

    tituloForm.textContent = 'Editar serviço';
    cancelar.hidden = false;

    mensagem(
      aviso,
      'Altere os campos e salve. Para desativar, desmarque Serviço ativo.'
    );

    form.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  function adicionarTexto(elemento, tag, texto) {
    const filho = document.createElement(tag);
    filho.textContent = texto;
    elemento.append(filho);
    return filho;
  }

  async function carregarLista() {
    const servicos = await api('/meus-servicos');
    const perfil = await api('/prestadores/me');
    const faltas = [];
    if (perfil.statusAprovacao !== 'APROVADO') faltas.push('Seu perfil precisa de aprovação administrativa.');
    if (!perfil.ativo) faltas.push('Seu perfil profissional está desativado.');
    if (!servicos.some(s => s.ativo)) faltas.push('Cadastre ou ative um serviço na categoria desejada.');
    document.getElementById('servicos-publicacao').textContent = faltas.length
      ? faltas.join(' ') : 'Suas ofertas ativas estão publicadas nas categorias escolhidas.';

    lista.replaceChildren();

    if (!servicos.length) {
      adicionarTexto(
        lista,
        'p',
        'Você ainda não cadastrou serviços.'
      );
      return;
    }

    const unidades = {
      HORA: 'por hora',
      DIARIA: 'por diária',
      SERVICO: 'por serviço'
    };

    for (const servico of servicos) {
      const item = document.createElement('article');
      item.className = 'servico-item';

      adicionarTexto(item, 'h3', servico.titulo);
      adicionarTexto(item, 'p', servico.categoria);

      if (servico.descricao) {
        const descricao = adicionarTexto(
          item,
          'p',
          servico.descricao
        );
        descricao.className = 'perfil-texto';
      }

      const preco = servico.preco === null
        ? 'Preço a combinar'
        : 'Referência: ' + Number(servico.preco).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }) + (servico.preco_maximo == null ? '' : ' a ' + Number(servico.preco_maximo)
            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
          + ' ' + unidades[servico.unidade_cobranca] + ' — valor final a combinar';

      adicionarTexto(item, 'p', preco);

      adicionarTexto(
        item,
        'p',
        servico.ativo ? 'Serviço ativo' : 'Serviço desativado'
      );

      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'btn-black';
      botao.textContent = 'Editar serviço';
      botao.addEventListener('click', () => editar(servico));

      item.append(botao);
      lista.append(item);
    }
  }

  cancelar.addEventListener('click', () => {
    limparFormulario();
    mensagem(aviso, 'Edição cancelada.');
  });

  form.addEventListener('submit', async evento => {
    evento.preventDefault();

    if (ocupado || !form.reportValidity()) return;

    const precoTexto = campo('preco').value.trim();
    const maximoTexto = campo('precoMaximo').value.trim();
    if (maximoTexto !== '' && (precoTexto === '' || Number(maximoTexto) < Number(precoTexto))) {
      mensagem(aviso, 'Informe o preço mínimo e um máximo maior ou igual a ele.', true);
      return;
    }

    const dados = {
      titulo: campo('titulo').value.trim(),
      descricao: campo('descricao').value.trim(),
      categoriaId: Number(campo('categoriaId').value),
      preco: precoTexto === '' ? null : Number(precoTexto),
      precoMaximo: maximoTexto === '' ? null : Number(maximoTexto),
      unidadeCobranca: campo('unidadeCobranca').value,
      ativo: campo('ativo').checked
    };

    const caminho = editandoId === null
      ? '/meus-servicos'
      : `/meus-servicos/${editandoId}`;

    const metodo = editandoId === null ? 'POST' : 'PUT';

    ocupado = true;
    campos.disabled = true;
    mensagem(aviso, 'Salvando…');

    try {
      await api(caminho, {
        method: metodo,
        body: dados
      });

      limparFormulario();
      await carregarLista();

      mensagem(
        aviso,
        'Serviço salvo. A publicação depende da aprovação e ativação do seu perfil.'
      );
    } catch (erro) {
      tratarErro(erro);
    } finally {
      ocupado = false;
      campos.disabled = false;
    }
  });

  async function iniciar() {
    try {
      await api('/auth/me');

      const categorias = await api('/meus-servicos/categorias');
      const seletor = campo('categoriaId');

      for (const categoria of categorias) {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nome;
        seletor.append(option);
      }

      await carregarLista();

      campos.disabled = false;
      mensagem(aviso, 'Cadastre um serviço ou edite um existente.');
    } catch (erro) {
      tratarErro(erro);
    }
  }

  iniciar();
})();
