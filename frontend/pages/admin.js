// Carrega os cadastros e envia as alterações e decisões do administrador à API.

(() => {
  const { api, mensagem, enviar, foto } = Findy;
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

  function formulario(titulo, campos, destino, extras = {}) {
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
          await api(destino, { method: 'PUT', body: { ...extras, ...valores(form) } });
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

      const imagem = document.createElement('img'); imagem.className = 'cadastro-avatar';
      imagem.src = foto(usuario.foto); imagem.alt = `Foto de ${usuario.nome}`;
      card.append(imagem, titulo, situacao);
      const cadastro = document.createElement('p'); cadastro.textContent = `Cadastro: ${new Date(usuario.data_cadastro).toLocaleString('pt-BR')}`; card.append(cadastro);

      card.append(formulario('Dados da conta', [
        ['nome', 'Nome', usuario.nome],
        ['email', 'E-mail', usuario.email],
        ['telefone', 'Telefone', usuario.telefone],
        ['bairro', 'Bairro', usuario.bairro],
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

        const ficha = document.createElement('div'); ficha.className = 'admin-ficha';
        const abrir = document.createElement('button'); abrir.className = 'btn-black'; abrir.type = 'button'; abrir.textContent = 'Abrir ficha completa e analisar';
        abrir.addEventListener('click', () => enviar(abrir, async () => {
          try {
            const dados = await api(`/admin/prestadores/${usuario.prestador_id}/ficha`);
            ficha.replaceChildren();
            const linha = texto => { const p = document.createElement('p'); p.textContent = texto; ficha.append(p); };
            linha(`Contato reservado: ${usuario.email} | ${usuario.telefone || 'Telefone não informado'}`);
            linha(`Localização: ${[usuario.bairro, usuario.cidade, usuario.estado].filter(Boolean).join(', ')}`);
            linha(`Experiência: ${dados.iniciante ? 'Estou começando agora. ' : ''}${dados.experiencia || 'Não informada'}`);
            linha(`Região atendida (reservada): ${dados.regiaoAtendimento || 'Não informada'}`);
            linha(`Habilidades: ${dados.habilidades.join('; ') || 'Não informadas'}`);
            linha('Serviços cadastrados:');
            if (!dados.servicos.length) linha('Nenhum serviço cadastrado.');
            for (const servico of dados.servicos) {
              const moeda = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const valor = servico.preco == null ? 'A combinar' : `Referência: ${moeda(servico.preco)}${servico.preco_maximo == null ? '' : ` a ${moeda(servico.preco_maximo)}`} — valor final a combinar`;
              linha(`${servico.titulo} — ${servico.categoria} — ${valor} / ${servico.unidade_cobranca} — ${servico.ativo ? 'ativo' : 'desativado'}\n${servico.descricao || ''}`);
            }
            linha('Histórico de análise:');
            if (!dados.historico.length) linha('Nenhuma decisão registrada.');
            for (const h of dados.historico) linha(`${new Date(h.data_analise).toLocaleString('pt-BR')} — ${h.decisao} — ${h.administrador}${h.motivo ? ': ' + h.motivo : ''}`);
            if (usuario.status_aprovacao === 'RECUSADO_DEFINITIVO') {
              linha('Recusa definitiva. O perfil não pode ser reenviado ou reativado; a conta permanece independente.'); return;
            }
            // Edição administrativa preserva as habilidades e a opção de iniciante.
            ficha.append(formulario('Apresentação profissional', [
              ['descricaoProfissional', 'Descrição', usuario.descricao_profissional, true],
              ['experiencia', 'Experiência', usuario.experiencia, true],
              ['regiaoAtendimento', 'Região (reservada)', usuario.regiao_atendimento],
            ], `/admin/prestadores/${usuario.prestador_id}`, { habilidades: dados.habilidades, iniciante: dados.iniciante }));
            const analise = document.createElement('form'); analise.className = 'perfil-form';
            const label = document.createElement('label'); label.textContent = 'Motivo ou orientação (obrigatório para correção e recusa)';
            const motivo = document.createElement('textarea'); motivo.maxLength = 1000; label.append(motivo); analise.append(label);
            const acoes = document.createElement('div'); acoes.className = 'perfil-acoes';
            for (const [decisao, rotulo] of [['APROVADO','Aprovar'],['CORRECAO_SOLICITADA','Solicitar correção'],['RECUSADO_DEFINITIVO','Recusar definitivamente']]) {
              const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-black'; btn.textContent = rotulo;
              btn.addEventListener('click', async () => {
                if (decisao !== 'APROVADO' && !motivo.value.trim()) { motivo.setCustomValidity('Informe o motivo.'); motivo.reportValidity(); motivo.setCustomValidity(''); return; }
                if (decisao === 'RECUSADO_DEFINITIVO' && !confirm('Recusar definitivamente impede novos envios deste perfil profissional. A conta continuará podendo contratar. Confirmar?')) return;
                const botoes = [...acoes.querySelectorAll('button')]; botoes.forEach(b => { b.disabled = true; });
                try { await api(`/admin/prestadores/${usuario.prestador_id}/analise`, { method: 'PATCH', body: { decisao, motivo: motivo.value.trim() } }); await carregar(); mensagem(aviso, 'Decisão registrada no histórico.'); }
                catch (e) { mensagem(aviso, e.message, true); } finally { botoes.forEach(b => { b.disabled = false; }); }
              }); acoes.append(btn);
            }
            analise.append(acoes); ficha.append(analise);
            ficha.append(botao(usuario.ativo_profissional ? 'Desativar perfil profissional' : 'Reativar perfil para análise', () => api(`/admin/prestadores/${usuario.prestador_id}/ativacao`, { method: 'PATCH', body: { ativo: !usuario.ativo_profissional } })));
          } catch (e) { mensagem(aviso, e.message, true); }
        }));
        card.append(abrir, ficha);

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
