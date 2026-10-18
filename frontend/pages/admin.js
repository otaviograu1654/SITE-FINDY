// Carrega os cadastros e envia as alterações e decisões do administrador à API.

(() => {
  const { api, mensagem, enviar } = Findy;
  const lista = document.getElementById('admin-lista');
  const aviso = document.getElementById('admin-mensagem');
  const filtro = document.getElementById('admin-filtro');
  let cadastros = [];

  function campo(formulario, nome, rotulo, valor, textoLongo = false) {
    const label = document.createElement('label');
    label.textContent = rotulo;

    const input = document.createElement(textoLongo ? 'textarea' : 'input');
    input.name = nome;
    input.value = valor || '';

    if (nome === 'email') input.type = 'email';
    if (['nome', 'email', 'descricaoProfissional', 'regiaoAtendimento']
        .includes(nome)) {
      input.required = true;
    }

    label.append(input);
    formulario.append(label);
  }

  function valores(formulario) {
    return Object.fromEntries(
      [...new FormData(formulario)].map(([nome, valor]) =>
        [nome, valor.trim() || null]
      )
    );
  }

  function botao(texto, tarefa) {
    const elemento = document.createElement('button');
    elemento.type = 'button';
    elemento.className = 'btn-black';
    elemento.textContent = texto;

    elemento.addEventListener('click', () => {
      enviar(elemento, async () => {
        try {
          const resultado = await tarefa();
          if (resultado === false) return;
          await carregar();
          mensagem(aviso, 'Alteração salva.');
        } catch (erro) {
          mensagem(aviso, erro.message, true);
        }
      });
    });

    return elemento;
  }

  function formulario(titulo, campos, destino) {
    const bloco = document.createElement('section');
    bloco.className = 'panel';

    const heading = document.createElement('h3');
    heading.textContent = titulo;
    bloco.append(heading);

    const form = document.createElement('form');
    form.className = 'perfil-form';

    for (const dados of campos) campo(form, ...dados);

    const salvar = document.createElement('button');
    salvar.type = 'submit';
    salvar.className = 'btn-black';
    salvar.textContent = 'Salvar alterações';
    form.append(salvar);

    form.addEventListener('submit', evento => {
      evento.preventDefault();

      enviar(salvar, async () => {
        try {
          await api(destino, { method: 'PUT', body: valores(form) });
          await carregar();
          mensagem(aviso, 'Alterações salvas.');
        } catch (erro) {
          mensagem(aviso, erro.message, true);
        }
      });
    });

    bloco.append(form);
    return bloco;
  }

  function renderizar() {
    lista.replaceChildren();

    const visiveis = cadastros.filter(usuario =>
      !filtro.value || usuario.status_aprovacao === filtro.value
    );

    if (!visiveis.length) {
      const vazio = document.createElement('p');
      vazio.textContent = 'Nenhum cadastro encontrado.';
      lista.append(vazio);
      return;
    }

    for (const usuario of visiveis) {
      const card = document.createElement('section');
      card.className = 'panel';

      const titulo = document.createElement('h2');
      titulo.textContent = usuario.nome;

      const situacao = document.createElement('p');
      situacao.textContent =
        `${usuario.papel} — conta ${usuario.ativo ? 'ativa' : 'desativada'}`;

      card.append(titulo, situacao);

      card.append(formulario('Dados da conta', [
        ['nome', 'Nome', usuario.nome],
        ['email', 'E-mail', usuario.email],
        ['telefone', 'Telefone', usuario.telefone],
        ['cidade', 'Cidade', usuario.cidade],
        ['estado', 'UF em maiúsculas', usuario.estado],
        ['foto', 'Endereço da foto', usuario.foto],
      ], `/admin/usuarios/${usuario.usuario_id}`));

      if (usuario.papel !== 'ADMIN') {
        card.append(botao(
          usuario.ativo ? 'Desativar conta' : 'Ativar conta',
          () => api(`/admin/usuarios/${usuario.usuario_id}/ativacao`, {
            method: 'PATCH',
            body: { ativo: !usuario.ativo },
          })
        ));
      }

      if (usuario.prestador_id) {
        const status = document.createElement('p');
        status.textContent =
          `Perfil profissional: ${usuario.status_aprovacao} — ` +
          (usuario.ativo_profissional ? 'ativo' : 'desativado');
        card.append(status);

        if (usuario.motivo_recusa) {
          const motivo = document.createElement('p');
          motivo.textContent = `Motivo: ${usuario.motivo_recusa}`;
          card.append(motivo);
        }

        card.append(formulario('Apresentação profissional', [
          ['descricaoProfissional', 'Descrição',
            usuario.descricao_profissional, true],
          ['experiencia', 'Experiência', usuario.experiencia, true],
          ['regiaoAtendimento', 'Região', usuario.regiao_atendimento],
        ], `/admin/prestadores/${usuario.prestador_id}`));

        const acoes = document.createElement('div');
        acoes.className = 'perfil-acoes';

        acoes.append(
          botao('Aprovar perfil', () =>
            api(`/admin/prestadores/${usuario.prestador_id}/analise`, {
              method: 'PATCH',
              body: { aprovado: true },
            })
          ),
          botao('Recusar perfil', async () => {
            const motivo = prompt('Qual é o motivo da recusa?');
            if (motivo === null) return false;

            return api(
              `/admin/prestadores/${usuario.prestador_id}/analise`, {
                method: 'PATCH',
                body: { aprovado: false, motivo },
              }
            );
          }),
          botao(
            usuario.ativo_profissional
              ? 'Desativar perfil profissional'
              : 'Ativar perfil profissional',
            () => api(
              `/admin/prestadores/${usuario.prestador_id}/ativacao`, {
                method: 'PATCH',
                body: { ativo: !usuario.ativo_profissional },
              }
            )
          )
        );

        card.append(acoes);
      }

      lista.append(card);
    }
  }

  async function carregar() {
    cadastros = await api('/admin/cadastros');
    renderizar();
  }

  filtro.addEventListener('change', renderizar);

  (async () => {
    try {
      await api('/admin/me');
      await carregar();
      mensagem(aviso, '');
    } catch (erro) {
      lista.replaceChildren();
      if (erro.status === 401) return location.replace('login.html');
      mensagem(aviso, erro.message, true);
    }
  })();
})();