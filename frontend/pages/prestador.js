// Consulta perfis públicos e permite ao dono editar, ativar ou desativar seu perfil profissional.

/* Sem ?id=, edita o proprio perfil. Com ?id=, consulta um perfil publico aprovado. */
(() => {
  const { api, mensagem, enviar, foto } = Findy;
  const aviso = document.getElementById('prestador-mensagem');
  const conteudo = document.getElementById('prestador-conteudo');
  const formulario = document.getElementById('prestador-form');
  const salvar = formulario.querySelector('button[type="submit"]');
  const ativacao = document.getElementById('prestador-ativacao');
  const publico = document.getElementById('prestador-publico');
  const id = new URLSearchParams(location.search).get('id');
  let perfil = null;
  const texto = (seletor, valor) => { document.getElementById(seletor).textContent = valor; };

  function apresentacao(pessoa, profissional) {
    texto('prestador-nome', pessoa.nome);
    document.getElementById('prestador-foto').src = foto(pessoa.foto);
    texto('prestador-local', [pessoa.cidade, pessoa.estado].filter(Boolean).join(', ') || 'Localização não informada');
    texto('prestador-descricao', profissional?.descricaoProfissional || 'Preencha sua apresentação para começar a oferecer serviços.');
    texto('prestador-experiencia', profissional?.experiencia || 'Experiência não informada.');
    texto('prestador-regiao', profissional?.regiaoAtendimento || 'Região não informada.');
  }

  function atualizar(profissional) {
    perfil = profissional;
    const rotulos = { PENDENTE: 'Aguardando aprovação', APROVADO: 'Aprovado', RECUSADO: 'Recusado — corrija os dados e envie novamente' };
    texto('prestador-status', !perfil ? 'Perfil profissional ainda não ativado'
      : !perfil.ativo ? 'Desativado' : rotulos[perfil.statusAprovacao]);
    const motivo = document.getElementById('prestador-motivo');
    motivo.hidden = !perfil?.motivoRecusa;
    motivo.textContent = perfil?.motivoRecusa ? `Motivo: ${perfil.motivoRecusa}` : '';
    ativacao.hidden = !perfil;
    ativacao.textContent = perfil?.ativo ? 'Desativar perfil profissional' : 'Reativar e enviar para aprovação';
    salvar.textContent = perfil ? 'Salvar apresentação' : 'Ativar e enviar para aprovação';
    publico.hidden = !(perfil?.ativo && perfil.statusAprovacao === 'APROVADO');
    if (perfil) publico.href = `perfil-prestador.html?id=${perfil.id}`;
    for (const campo of ['descricaoProfissional', 'experiencia', 'regiaoAtendimento']) {
      formulario.elements.namedItem(campo).value = perfil?.[campo] || '';
    }
    if (perfil) {
      texto('prestador-descricao', perfil.descricaoProfissional);
      texto('prestador-experiencia', perfil.experiencia || 'Experiência não informada.');
      texto('prestador-regiao', perfil.regiaoAtendimento);
    }
  }

  function falha(erro) {
    if (id === null && erro.status === 401) return location.replace('login.html');
    mensagem(aviso, erro.message, true);
  }

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    await enviar(salvar, async () => {
      try {
        const dados = Object.fromEntries(['descricaoProfissional', 'experiencia', 'regiaoAtendimento'].map(campo =>
          [campo, formulario.elements.namedItem(campo).value.trim() || null]));
        atualizar(await api('/prestadores/me', { method: 'PUT', body: dados }));
        mensagem(aviso, perfil.ativo ? 'Apresentação salva. Confira a situação do perfil abaixo.' : 'Apresentação salva. Seu perfil continua desativado.');
      } catch (erro) { falha(erro); }
    });
  });

  ativacao.addEventListener('click', async () => {
    await enviar(ativacao, async () => {
      try {
        atualizar(await api('/prestadores/me/ativacao', { method: 'PATCH', body: { ativo: !perfil.ativo } }));
        mensagem(aviso, perfil.ativo ? 'Perfil reativado e enviado para aprovação.' : 'Perfil profissional desativado. Sua conta continua disponível.');
      } catch (erro) { falha(erro); }
    });
  });

  (async () => {
    try {
      if (id !== null) {
        if (!/^\d+$/.test(id)) throw new Error('Perfil não encontrado.');
        const dados = await api(`/prestadores/${id}`);
        apresentacao(dados, dados);
      } else {
        const [pessoa] = await Promise.all([api('/perfil'), api('/auth/me')]);
        try { perfil = await api('/prestadores/me'); }
        catch (erro) { if (erro.status !== 404) throw erro; }
        apresentacao(pessoa, perfil);
        atualizar(perfil);
        document.getElementById('prestador-editor').hidden = false;
        document.getElementById('prestador-situacao').hidden = false;
        document.getElementById('entrar-perfil').hidden = true;
        document.querySelector('[data-sair]').hidden = false;
        salvar.disabled = false;
      }
      conteudo.hidden = false;
      mensagem(aviso, '');
    } catch (erro) { falha(erro); }
  })();
})();
