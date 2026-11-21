// A galeria usa a API; somente o dono pode enviar ou remover fotos.
(() => {
  const { api, foto, mensagem } = Findy;
  const secao = document.getElementById('portfolio-secao');
  const galeria = document.getElementById('portfolio-galeria');
  const aviso = document.getElementById('portfolio-mensagem');
  const form = document.getElementById('portfolio-form');
  const id = new URLSearchParams(location.search).get('id');
  const proprio = id === null;
  let ocupado = false;
  async function carregar() {
    const fotos = await api(proprio ? '/portfolio/me' : `/portfolio/prestadores/${encodeURIComponent(id)}`);
    galeria.replaceChildren();
    for (const item of fotos) {
      const card = document.createElement('figure');
      const imagem = document.createElement('img'); imagem.src = foto(item.foto);
      imagem.alt = item.legenda || 'Trabalho realizado pelo profissional'; imagem.loading = 'lazy';
      const legenda = document.createElement('figcaption'); legenda.textContent = item.legenda || 'Trabalho realizado';
      card.append(imagem, legenda);
      if (proprio) {
        const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'btn-black'; remover.textContent = 'Remover foto';
        remover.setAttribute('aria-label', `Remover foto: ${legenda.textContent}`);
        remover.addEventListener('click', async () => {
          if (ocupado) return; ocupado = true; remover.disabled = true;
          try { await api(`/portfolio/me/${item.id}`, { method: 'DELETE' }); await carregar(); }
          catch (erro) { mensagem(aviso, erro.message, true); }
          finally { ocupado = false; remover.disabled = false; }
        }); card.append(remover);
      }
      galeria.append(card);
    }
    form.hidden = !proprio;
    form.querySelector('button').disabled = fotos.length >= 10;
    mensagem(aviso, fotos.length ? `${fotos.length} foto(s) de trabalhos` : 'Nenhuma foto de trabalho adicionada.');
  }
  form.addEventListener('submit', async evento => {
    evento.preventDefault(); if (ocupado || !form.reportValidity()) return;
    const arquivo = document.getElementById('portfolio-arquivo').files[0];
    if (!arquivo || !['image/jpeg', 'image/png'].includes(arquivo.type) || arquivo.size > 2 * 1024 * 1024) {
      mensagem(aviso, 'Escolha uma foto JPG ou PNG de até 2 MB.', true); return;
    }
    ocupado = true; const botao = form.querySelector('button'); botao.disabled = true;
    try { await api('/portfolio/me', { method: 'POST', body: new FormData(form) }); form.reset(); await carregar(); }
    catch (erro) { mensagem(aviso, erro.message, true); botao.disabled = false; }
    finally { ocupado = false; }
  });
  async function iniciar() {
    try { await carregar(); secao.hidden = false; }
    catch (erro) {
      if (erro.status === 401 || (!proprio && erro.status === 404)) return;
      secao.hidden = false; form.hidden = true;
      mensagem(aviso, erro.status === 404 ? 'Salve seu cadastro profissional para começar seu portfólio.' : erro.message, erro.status !== 404);
    }
  }
  document.addEventListener('findy:perfil-atualizado', () => { if (proprio) iniciar(); });
  iniciar();
})();
