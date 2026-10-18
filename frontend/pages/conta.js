// Controla cadastro, login, logout e edição dos dados pessoais nas telas de conta.

/* Cadastro, login e edicao dos dados pessoais. */
(() => {
  const { api, mensagem, enviar, foto } = Findy;
  const login = document.getElementById('login-form');
  const cadastro = document.getElementById('signup-form');
  const conta = document.getElementById('minha-conta');

  if (login) login.addEventListener('submit', async evento => {
    evento.preventDefault();
    const aviso = document.getElementById('login-mensagem');
    await enviar(login.querySelector('button[type="submit"]'), async () => {
      try {
        mensagem(aviso, 'Entrando…');
        await api('/auth/login', { method: 'POST', body: {
          email: document.getElementById('login-email').value.trim(),
          senha: document.getElementById('login-senha').value,
        }});
        location.assign('minha-conta.html');
      } catch (erro) { mensagem(aviso, erro.message, true); }
    });
  });

  if (cadastro) cadastro.addEventListener('submit', async evento => {
    evento.preventDefault();
    const aviso = document.getElementById('signup-mensagem');
    await enviar(cadastro.querySelector('button[type="submit"]'), async () => {
      try {
        mensagem(aviso, 'Criando sua conta…');
        const email = document.getElementById('signup-email').value.trim();
        const senha = document.getElementById('signup-senha').value;
        await api('/usuarios', { method: 'POST', body: {
          nome: document.getElementById('signup-nome').value.trim(), email, senha,
        }});
        cadastro.reset();
        document.getElementById('login-email').value = email;
        document.getElementById('login-senha').value = '';
        mensagem(aviso, 'Conta criada! Entre com seu e-mail e senha.');
        document.getElementById('login-senha').focus();
      } catch (erro) { mensagem(aviso, erro.message, true); }
    });
  });

  document.querySelectorAll('[data-sair]').forEach(botao => botao.addEventListener('click', async () => {
    await enviar(botao, async () => {
      try { await api('/auth/logout', { method: 'POST' }); location.assign('login.html'); }
      catch (erro) {
        const aviso = document.querySelector('[role="status"]');
        if (aviso) mensagem(aviso, erro.message, true);
      }
    });
  }));

  if (!conta) return;
  const formulario = document.getElementById('perfil-form');
  const aviso = document.getElementById('conta-mensagem');
  const botao = formulario.querySelector('button[type="submit"]');
  const arquivoFoto = document.getElementById('foto-arquivo');
  let previaFoto = null;

  function liberarPrevia() {
    if (previaFoto) URL.revokeObjectURL(previaFoto);
    previaFoto = null;
  }

  function validarFoto(arquivo) {
    if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
      throw new Error('Escolha uma foto JPG ou PNG.');
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      throw new Error('A foto deve ter até 2 MB.');
    }
  }

  arquivoFoto.addEventListener('change', () => {
    liberarPrevia();
    try {
      const arquivo = arquivoFoto.files[0];
      if (!arquivo) {
        document.getElementById('conta-foto').src = foto(formulario.elements.namedItem('foto').value);
        return;
      }
      validarFoto(arquivo);
      previaFoto = URL.createObjectURL(arquivo);
      document.getElementById('conta-foto').src = previaFoto;
      mensagem(aviso, 'Foto selecionada. Clique em Salvar meus dados para confirmar.');
    } catch (erro) {
      arquivoFoto.value = '';
      document.getElementById('conta-foto').src = foto(formulario.elements.namedItem('foto').value);
      mensagem(aviso, erro.message, true);
    }
  });
  window.addEventListener('pagehide', liberarPrevia);
  function mostrar(dados) {
    document.getElementById('conta-nome').textContent = dados.nome;
    document.getElementById('conta-foto').src = foto(dados.foto);
    for (const campo of ['nome', 'telefone', 'cidade', 'estado', 'foto']) {
      formulario.elements.namedItem(campo).value = dados[campo] || '';
    }
  }
  formulario.elements.namedItem('estado').addEventListener('input', evento => {
    evento.target.value = evento.target.value.toUpperCase();
  });
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    await enviar(botao, async () => {
      arquivoFoto.disabled = true;
      try {
        const arquivo = arquivoFoto.files[0];
        if (arquivo) {
          validarFoto(arquivo);
          mensagem(aviso, 'Salvando foto…');
          const envio = new FormData();
          envio.append('foto', arquivo);
          const resposta = await api('/fotos/me', { method: 'POST', body: envio });
          formulario.elements.namedItem('foto').value = resposta.foto;
          document.getElementById('conta-foto').src = foto(resposta.foto);
          arquivoFoto.value = '';
          liberarPrevia();
        }
        const dados = Object.fromEntries(['nome', 'telefone', 'cidade', 'estado', 'foto'].map(campo =>
          [campo, formulario.elements.namedItem(campo).value.trim() || null]));
        mostrar(await api('/perfil', { method: 'PUT', body: dados }));
        mensagem(aviso, 'Seus dados foram salvos.');
      } catch (erro) {
        if (erro.status === 401) return location.assign('login.html');
        mensagem(aviso, erro.message, true);
      } finally {
        arquivoFoto.disabled = false;
      }
    });
  });
  (async () => {
    try {
      const [usuario, perfil] = await Promise.all([api('/auth/me'), api('/perfil')]);
      document.getElementById('conta-email').textContent = usuario.email;
      mostrar(perfil);
        try {
        await api('/admin/me');
        document.getElementById('link-admin').hidden = false;
      } catch (erro) {
        if (erro.status !== 403) throw erro;
}
      botao.disabled = false;
      arquivoFoto.disabled = false;
      mensagem(aviso, '');
    } catch (erro) {
      if (erro.status === 401) return location.replace('login.html');
      mensagem(aviso, erro.message, true);
    }
  })();
})();
