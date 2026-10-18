// Envia os pedidos de recuperação e usa o token do link para redefinir a senha.

(() => {
  const { api, mensagem, enviar } = Findy;

  const pedido = document.getElementById('pedir-recuperacao');
  const redefinicao = document.getElementById('redefinir-senha');
  const aviso = document.getElementById('recuperacao-mensagem');
  const titulo = document.getElementById('recuperacao-titulo');
  const outroLink = document.getElementById('pedir-outro-link');

  const parametros = new URLSearchParams(location.hash.slice(1));
  const token = parametros.get('token');

  if (token !== null) {
    pedido.hidden = true;
    redefinicao.hidden = false;
    outroLink.hidden = false;
    titulo.textContent = 'Definir nova senha';

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      redefinicao.hidden = true;

      mensagem(
        aviso,
        'Link inválido. Solicite outro link de recuperação.',
        true
      );
    }
  }

  pedido.addEventListener('submit', async evento => {
    evento.preventDefault();

    const botao = pedido.querySelector('button[type="submit"]');

    await enviar(botao, async () => {
      try {
        mensagem(aviso, 'Enviando pedido…');

        const resposta = await api('/auth/recuperar-senha', {
          method: 'POST',
          body: {
            email: pedido.elements.namedItem('email').value.trim()
          }
        });

        mensagem(
          aviso,
          resposta.mensagem + ' Confira também a pasta de spam.'
        );

      } catch (erro) {
        mensagem(aviso, erro.message, true);
      }
    });
  });

  redefinicao.addEventListener('submit', async evento => {
    evento.preventDefault();

    const novaSenha = redefinicao.elements
      .namedItem('novaSenha').value;

    const confirmacao = redefinicao.elements
      .namedItem('confirmacao').value;

    if (novaSenha !== confirmacao) {
      mensagem(aviso, 'As senhas não coincidem.', true);
      return;
    }

    const botao = redefinicao.querySelector(
      'button[type="submit"]'
    );

    await enviar(botao, async () => {
      try {
        mensagem(aviso, 'Alterando senha…');

        const resposta = await api('/auth/redefinir-senha', {
          method: 'POST',
          body: {
            token,
            novaSenha,
            confirmacao
          }
        });

        redefinicao.reset();
        redefinicao.hidden = true;
        outroLink.hidden = true;

        history.replaceState(
          null,
          '',
          'recuperar-senha.html'
        );

        mensagem(aviso, resposta.mensagem);

      } catch (erro) {
        mensagem(aviso, erro.message, true);
      }
    });
  });
})();