// ===================================================================
// MEDIDOR DE FORÇA DE SENHA
// ===================================================================
// Este script "escuta" o campo de senha do cadastro: toda vez que o
// usuário digita algo, ele recalcula uma pontuação e atualiza a
// barrinha colorida e o texto (Fraca / Média / Forte).

const passwordInput = document.getElementById('signup-senha');
const statusEl = document.getElementById('password-status');
const statusIcon = document.getElementById('password-status-icon');
const statusText = document.getElementById('password-status-text');

// Recebe o texto da senha e devolve um "nível" (1, 2 ou 3) e um rótulo.
// A lógica soma 1 ponto para cada critério atendido — quanto mais
// critérios, mais forte consideramos a senha.
function calcularForcaDaSenha(senha) {
  if (!senha) {
    return { nivel: 0, rotulo: '' };
  }

  let pontos = 0;
  if (senha.length >= 6) pontos++;                 // tamanho mínimo razoável
  if (senha.length >= 10) pontos++;                 // tamanho bom
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++; // maiúsculas + minúsculas
  if (/[0-9]/.test(senha)) pontos++;                 // números
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;          // símbolos (!@#$ etc.)

  if (pontos <= 2) return { nivel: 1, rotulo: 'Fraca' };
  if (pontos <= 3) return { nivel: 2, rotulo: 'Média' };
  return { nivel: 3, rotulo: 'Forte' };
}

// Cada nível liga a um nome de classe CSS (que decide a cor) e a um
// símbolo de texto simples — sem precisar de nenhum ícone externo.
const INFO_NIVEL = {
  1: { classe: 'weak',   simbolo: '✕' },  // fraca
  2: { classe: 'medium', simbolo: '–' },  // mediana ("meio risco")
  3: { classe: 'strong', simbolo: '✓' },  // forte
};

function atualizarMedidor() {
  const { nivel, rotulo } = calcularForcaDaSenha(passwordInput.value);

  // Remove qualquer classe de força anterior antes de aplicar a nova
  statusEl.className = 'password-status';

  if (nivel > 0) {
    const { classe, simbolo } = INFO_NIVEL[nivel];
    statusEl.classList.add(`password-status--${classe}`);
    statusIcon.textContent = simbolo;
    statusText.textContent = rotulo;
  } else {
    // Campo vazio: some com o símbolo e o texto
    statusIcon.textContent = '';
    statusText.textContent = '';
  }
}

if (passwordInput) {
  passwordInput.addEventListener('input', atualizarMedidor);
}

// ===================================================================
// BLOQUEIO DO CADASTRO SEM SENHA PREENCHIDA
// ===================================================================
// O atributo "required" no HTML já impede o navio de enviar o
// formulário com o campo de senha vazio. Aqui só adicionamos um
// destaque visual (borda vermelha) nesse caso, pra ficar bem claro
// pro usuário qual campo precisa ser preenchido.
const signupForm = document.getElementById('signup-form');
const passwordField = passwordInput ? passwordInput.closest('.password-field') : null;

if (signupForm && passwordInput && passwordField) {
  signupForm.addEventListener('submit', (evento) => {
    if (passwordInput.value.trim() === '') {
      evento.preventDefault();
      passwordField.classList.add('password-field--invalid');
      passwordInput.focus();
    } else {
      passwordField.classList.remove('password-field--invalid');
    }
  });

  // Assim que o usuário começa a digitar, tiramos o destaque de erro
  passwordInput.addEventListener('input', () => {
    passwordField.classList.remove('password-field--invalid');
  });
}

// ===================================================================
// MENU "CATEGORIAS" (abre ao passar o mouse sobre a palavra)
// ===================================================================
// "mouseenter"/"mouseleave" disparam quando o ponteiro entra ou sai da
// área do elemento. Colocamos os dois listeners no bloco INTEIRO
// (botão + menu juntos), não só no botão — assim, ao mover o mouse do
// botão para baixo, para dentro do menu, ele continua "dentro" da área
// observada, e o menu só fecha quando o mouse sai de cima dele de vez.

const categoriesToggle = document.getElementById('categories-toggle');
const categoriesMenu = document.getElementById('categories-menu');
const categoriesDropdown = document.getElementById('categories-dropdown');

if (categoriesToggle && categoriesMenu && categoriesDropdown) {
  categoriesDropdown.addEventListener('mouseenter', () => {
    categoriesMenu.hidden = false;
    categoriesToggle.setAttribute('aria-expanded', 'true');
  });

  categoriesDropdown.addEventListener('mouseleave', () => {
    categoriesMenu.hidden = true;
    categoriesToggle.setAttribute('aria-expanded', 'false');
  });
}

// ===================================================================
// PROFISSIONAIS POR CATEGORIA (página categoria.html)
// ===================================================================
// Cada categoria tem sua própria lista de profissionais (4 colunas x
// 3 linhas = 12 cartões). Quando a página é aberta com "?categoria=Nome"
// (a partir de um card da Home ou de uma opção do menu "Categorias"),
// só os profissionais daquela lista são desenhados na grade — assim,
// clicar em "Serviços Domésticos" mostra só gente daquela área, e
// clicar em "Eventos" mostra só gente de Eventos, e assim por diante.
//
// Pra cadastrar um profissional novo numa categoria, basta adicionar
// um objeto novo no array correspondente, com nome / foto / nota /
// descrição — não precisa mexer no HTML nem no resto do script.

const PROFISSIONAIS_POR_CATEGORIA = {
  'Serviços Domésticos': [ 
    { nome: 'Camila Duarte', foto: 'https://i.pravatar.cc/400?img=32', nota: '4.9', descricao: 'Diarista e organizadora, atendimento pontual e cuidadoso.', link: 'perfil-prestador.html' },
    { nome: 'Fernanda Castro', foto: 'https://i.pravatar.cc/400?img=47', nota: '4.6', descricao: 'Diarista com referências e disponibilidade imediata.' },
    { nome: 'Priscila Andrade', foto: 'https://i.pravatar.cc/400?img=44', nota: '4.8', descricao: 'Personal organizer, transforma qualquer ambiente.' },
    { nome: 'Bruna Siqueira', foto: 'https://i.pravatar.cc/400?img=29', nota: '4.7', descricao: 'Cuidadora de idosos, curso técnico em enfermagem.' },
    { nome: 'Marta Souza', foto: 'https://i.pravatar.cc/400?img=5', nota: '4.8', descricao: 'Cozinheira doméstica, marmitas e refeições sob encomenda.' },
    { nome: 'Simone Rocha', foto: 'https://i.pravatar.cc/400?img=9', nota: '4.6', descricao: 'Arrumadeira, organização e limpeza geral da casa.' },
    { nome: 'Wagner Lopes', foto: 'https://i.pravatar.cc/400?img=13', nota: '4.5', descricao: 'Jardineiro residencial, poda e manutenção de jardins.' },
    { nome: 'Patrícia Mendes', foto: 'https://i.pravatar.cc/400?img=18', nota: '4.7', descricao: 'Lavadeira e passadeira, entrega em domicílio.' },
    { nome: 'Carlos Eduardo Reis', foto: 'https://i.pravatar.cc/400?img=24', nota: '4.6', descricao: 'Dedetizador, controle de pragas residencial.' },
    { nome: 'Juliana Ferraz', foto: 'https://i.pravatar.cc/400?img=36', nota: '4.9', descricao: 'Limpeza pós-obra e faxina pesada.' },
    { nome: 'Vanessa Lopes', foto: 'https://i.pravatar.cc/400?img=41', nota: '4.8', descricao: 'Governanta, cuida da rotina completa da casa.' },
    { nome: 'Roberta Aquino', foto: 'https://i.pravatar.cc/400?img=6', nota: '4.7', descricao: 'Passadeira profissional, roupas do dia a dia.' },
  ],
  'Eventos': [
    { nome: 'Débora Martins', foto: 'https://i.pravatar.cc/400?img=68', nota: '4.9', descricao: 'Confeiteira, bolos e doces sob encomenda para festas.' },
    { nome: 'Renata Alves', foto: 'https://i.pravatar.cc/400?img=3', nota: '4.8', descricao: 'Cerimonialista, planejamento completo de eventos.' },
    { nome: 'Marcelo Teixeira', foto: 'https://i.pravatar.cc/400?img=8', nota: '4.7', descricao: 'DJ para festas e casamentos.' },
    { nome: 'Helena Prado', foto: 'https://i.pravatar.cc/400?img=14', nota: '4.9', descricao: 'Decoradora de eventos e festas temáticas.' },
    { nome: 'Bruno Castilho', foto: 'https://i.pravatar.cc/400?img=19', nota: '4.6', descricao: 'Garçom e bartender para eventos.' },
    { nome: 'Camila Rezende', foto: 'https://i.pravatar.cc/400?img=25', nota: '4.8', descricao: 'Fotógrafa de eventos e ensaios.' },
    { nome: 'Diego Martins', foto: 'https://i.pravatar.cc/400?img=31', nota: '4.7', descricao: 'Som e iluminação para festas.' },
    { nome: 'Beatriz Lacerda', foto: 'https://i.pravatar.cc/400?img=39', nota: '4.9', descricao: 'Buffet e doces finos para casamentos.' },
    { nome: 'Fábio Andrade', foto: 'https://i.pravatar.cc/400?img=45', nota: '4.5', descricao: 'Mestre de cerimônias.' },
    { nome: 'Tatiane Borges', foto: 'https://i.pravatar.cc/400?img=50', nota: '4.6', descricao: 'Aluguel de decoração e mobiliário para eventos.' },
    { nome: 'Rogério Nunes', foto: 'https://i.pravatar.cc/400?img=55', nota: '4.7', descricao: 'Segurança para eventos e festas.' },
    { nome: 'Vinícius Rocha', foto: 'https://i.pravatar.cc/400?img=58', nota: '4.6', descricao: 'Fornecedor de tendas, mesas e cadeiras.' },
  ],
  'Infantil': [
    { nome: 'Ana Beatriz Lima', foto: 'https://i.pravatar.cc/400?img=4', nota: '4.9', descricao: 'Babá com experiência em bebês e crianças pequenas.' },
    { nome: 'Rodrigo Faria', foto: 'https://i.pravatar.cc/400?img=10', nota: '4.7', descricao: 'Recreador infantil, monitor de festas.' },
    { nome: 'Cristiane Moura', foto: 'https://i.pravatar.cc/400?img=16', nota: '4.8', descricao: 'Professora particular, reforço escolar.' },
    { nome: 'Marina Duarte', foto: 'https://i.pravatar.cc/400?img=20', nota: '4.6', descricao: 'Contadora de histórias para eventos infantis.' },
    { nome: 'Felipe Rocha', foto: 'https://i.pravatar.cc/400?img=27', nota: '4.5', descricao: 'Personagem vivo para festas infantis.' },
    { nome: 'Luciana Peixoto', foto: 'https://i.pravatar.cc/400?img=34', nota: '4.9', descricao: 'Cuidadora infantil em período integral.' },
    { nome: 'Gabriel Souza', foto: 'https://i.pravatar.cc/400?img=37', nota: '4.7', descricao: 'Professor de reforço em matemática.' },
    { nome: 'Isadora Campos', foto: 'https://i.pravatar.cc/400?img=42', nota: '4.8', descricao: 'Musicalização infantil.' },
    { nome: 'Henrique Alves', foto: 'https://i.pravatar.cc/400?img=48', nota: '4.6', descricao: 'Recreação com brinquedos infláveis.' },
    { nome: 'Vitória Nascimento', foto: 'https://i.pravatar.cc/400?img=53', nota: '4.9', descricao: 'Babá noturna e plantões.' },
    { nome: 'Diego Paiva', foto: 'https://i.pravatar.cc/400?img=57', nota: '4.5', descricao: 'Aulas de reforço escolar geral.' },
    { nome: 'Paula Andrade', foto: 'https://i.pravatar.cc/400?img=62', nota: '4.8', descricao: 'Professora de inglês para crianças.' },
  ],
  'Serviços Gerais': [
    { nome: 'José Humberto', foto: 'images/pro-jose-humberto.jpg', nota: '4.8', descricao: 'Eletricista residencial, mais de 10 anos de experiência.' },
    { nome: 'Thiago Nogueira', foto: 'https://i.pravatar.cc/400?img=22', nota: '4.4', descricao: 'Motorista de fretes e mudanças.' },
    { nome: 'Rafael Tavares', foto: 'https://i.pravatar.cc/400?img=15', nota: '4.5', descricao: 'Jardineiro e paisagista, cuida de quintais e áreas verdes.' },
    { nome: 'Vagner Correia', foto: 'https://i.pravatar.cc/400?img=63', nota: '4.6', descricao: 'Chaveiro 24 horas.' },
    { nome: 'Sandra Melo', foto: 'https://i.pravatar.cc/400?img=6', nota: '4.7', descricao: 'Costureira, ajustes e consertos de roupa.' },
    { nome: 'Alexandre Vieira', foto: 'https://i.pravatar.cc/400?img=11', nota: '4.8', descricao: 'Montador de móveis planejados e de loja.' },
    { nome: 'Roberta Cunha', foto: 'https://i.pravatar.cc/400?img=17', nota: '4.9', descricao: 'Manicure e pedicure a domicílio.' },
    { nome: 'Marcos Antunes', foto: 'https://i.pravatar.cc/400?img=23', nota: '4.5', descricao: 'Dedetização e desentupimento.' },
    { nome: 'Elaine Barros', foto: 'https://i.pravatar.cc/400?img=28', nota: '4.6', descricao: 'Passadeira profissional, entrega e retirada em casa.' },
    { nome: 'Ricardo Nascimento', foto: 'https://i.pravatar.cc/400?img=33', nota: '4.7', descricao: 'Técnico em ar-condicionado, instalação e manutenção.' },
    { nome: 'Fabiana Rocha', foto: 'https://i.pravatar.cc/400?img=38', nota: '4.8', descricao: 'Personal shopper e consultoria de estilo.' },
    { nome: 'Douglas Ramos', foto: 'https://i.pravatar.cc/400?img=43', nota: '4.5', descricao: 'Frete e carreto para mudanças pequenas.' },
  ],
  'Construção Civil': [
    { nome: 'Amilton Ribeiro', foto: 'images/pro-amilton-ribeiro.jpg', nota: '4.9', descricao: 'Pintor profissional, reformas rápidas e acabamento fino.' },
    { nome: 'Oswaldo Ramos', foto: 'images/pro-oswaldo-ramos.jpg', nota: '5.0', descricao: 'Encanador disponível para emergências e instalações.' },
    { nome: 'Gustavo Figueira', foto: 'images/pro-gustavo-figueira.jpg', nota: '4.7', descricao: 'Marceneiro especializado em móveis planejados.' },
    { nome: 'Paulo Sérgio Duarte', foto: 'https://i.pravatar.cc/400?img=49', nota: '4.8', descricao: 'Pedreiro, reformas e construções pequenas.' },
    { nome: 'Renato Souza', foto: 'https://i.pravatar.cc/400?img=54', nota: '4.9', descricao: 'Mestre de obras, acompanhamento de projetos.' },
    { nome: 'Jorge Almeida', foto: 'https://i.pravatar.cc/400?img=59', nota: '4.6', descricao: 'Gesseiro, forros e sancas.' },
    { nome: 'Wellington Dias', foto: 'https://i.pravatar.cc/400?img=64', nota: '4.7', descricao: 'Azulejista, revestimentos e pisos.' },
    { nome: 'Marcelo Freitas', foto: 'https://i.pravatar.cc/400?img=69', nota: '4.5', descricao: 'Soldador e serralheiro.' },
    { nome: 'César Rocha', foto: 'https://i.pravatar.cc/400?img=2', nota: '4.6', descricao: 'Instalador de piso laminado e vinílico.' },
    { nome: 'Adriano Melo', foto: 'https://i.pravatar.cc/400?img=7', nota: '4.7', descricao: 'Telhadista, reparos e impermeabilização de telhado.' },
    { nome: 'Luiz Fernando Costa', foto: 'https://i.pravatar.cc/400?img=12', nota: '4.8', descricao: 'Vidraceiro, instalação e reparo de vidros.' },
    { nome: 'Anderson Silva', foto: 'https://i.pravatar.cc/400?img=21', nota: '4.6', descricao: "Impermeabilização de lajes e caixas d'água." },
  ],
  'Marketing e Vendas': [
    { nome: 'Bianca Oliveira', foto: 'https://i.pravatar.cc/400?img=26', nota: '4.9', descricao: 'Social media, gestão de redes sociais.' },
    { nome: 'Rodrigo Mendes', foto: 'https://i.pravatar.cc/400?img=30', nota: '4.7', descricao: 'Consultor de vendas e negociação.' },
    { nome: 'Carolina Tavares', foto: 'https://i.pravatar.cc/400?img=35', nota: '4.8', descricao: 'Gestora de tráfego pago.' },
    { nome: 'Pedro Henrique Lima', foto: 'https://i.pravatar.cc/400?img=40', nota: '4.6', descricao: 'Fotógrafo de produtos para e-commerce.' },
    { nome: 'Natália Souza', foto: 'https://i.pravatar.cc/400?img=46', nota: '4.9', descricao: 'Copywriter, textos para vendas e anúncios.' },
    { nome: 'Felipe Andrade', foto: 'https://i.pravatar.cc/400?img=52', nota: '4.5', descricao: 'Representante comercial externo.' },
    { nome: 'Camila Rangel', foto: 'https://i.pravatar.cc/400?img=56', nota: '4.8', descricao: 'Designer de identidade visual para marcas.' },
    { nome: 'Rafael Costa', foto: 'https://i.pravatar.cc/400?img=61', nota: '4.7', descricao: 'Consultor de marketing digital.' },
    { nome: 'Juliana Prado', foto: 'https://i.pravatar.cc/400?img=65', nota: '4.6', descricao: 'Assessoria de imprensa e relações públicas.' },
    { nome: 'Vitor Hugo Martins', foto: 'https://i.pravatar.cc/400?img=70', nota: '4.4', descricao: 'Vendedor porta a porta e catálogo.' },
    { nome: 'Marcela Duarte', foto: 'https://i.pravatar.cc/400?img=1', nota: '4.8', descricao: 'Gestora de e-commerce e marketplaces.' },
    { nome: 'Otávio Ramos', foto: 'https://i.pravatar.cc/400?img=66', nota: '4.6', descricao: 'Consultor de branding e posicionamento.' },
  ],
  'Tecnologia e Design': [
    { nome: 'Eduardo Lima', foto: 'https://i.pravatar.cc/400?img=51', nota: '4.6', descricao: 'Técnico em informática, formatação e redes domésticas.' },
    { nome: 'Aline Ferreira', foto: 'https://i.pravatar.cc/400?img=67', nota: '4.8', descricao: 'Desenvolvedora e suporte técnico.' },
    { nome: 'Rafaela Nogueira', foto: 'https://i.pravatar.cc/400?img=5', nota: '4.9', descricao: 'Designer gráfica, identidade visual e social media.' },
    { nome: 'Bruno Salles', foto: 'https://i.pravatar.cc/400?img=60', nota: '4.7', descricao: 'Desenvolvedor front-end e sites.' },
    { nome: 'Camila Prado', foto: 'https://i.pravatar.cc/400?img=3', nota: '4.9', descricao: 'UX/UI designer, protótipos e telas de app.' },
    { nome: 'Thiago Barbosa', foto: 'https://i.pravatar.cc/400?img=8', nota: '4.5', descricao: 'Suporte técnico remoto e formatação.' },
    { nome: 'Larissa Campos', foto: 'https://i.pravatar.cc/400?img=14', nota: '4.8', descricao: 'Social media e edição de vídeos curtos.' },
    { nome: 'Vinícius Moraes', foto: 'https://i.pravatar.cc/400?img=19', nota: '4.7', descricao: 'Desenvolvedor de aplicativos mobile.' },
    { nome: 'Patrícia Nogueira', foto: 'https://i.pravatar.cc/400?img=25', nota: '4.6', descricao: 'Designer de logotipos e branding.' },
    { nome: 'Rodrigo Salgado', foto: 'https://i.pravatar.cc/400?img=31', nota: '4.5', descricao: 'Montagem e manutenção de computadores.' },
    { nome: 'Fernanda Lacerda', foto: 'https://i.pravatar.cc/400?img=39', nota: '4.8', descricao: 'Social media e gestão de conteúdo.' },
    { nome: 'Gustavo Prado', foto: 'https://i.pravatar.cc/400?img=45', nota: '4.6', descricao: 'Especialista em SEO e sites.' },
  ],
};

const CATEGORIA_PADRAO = 'Serviços Gerais';
const gradeDeProfissionais = document.getElementById('professional-grid');

if (gradeDeProfissionais) {
  const parametros = new URLSearchParams(window.location.search);
  const categoriaDaUrl = parametros.get('categoria');

  // Se a URL não trouxer uma categoria conhecida, cai na categoria padrão
  // — isso também cobre o caso de alguém editar a URL manualmente.
  const categoriaAtiva = PROFISSIONAIS_POR_CATEGORIA[categoriaDaUrl]
    ? categoriaDaUrl
    : CATEGORIA_PADRAO;

  const tituloDaPagina = document.querySelector('.category-results__title');
  if (tituloDaPagina) {
    tituloDaPagina.textContent = `Principais da categoria: ${categoriaAtiva}`;
  }

  const profissionaisDaCategoria = PROFISSIONAIS_POR_CATEGORIA[categoriaAtiva];

  gradeDeProfissionais.innerHTML = '';

  profissionaisDaCategoria.forEach((profissional) => {
    const artigo = document.createElement('article');
    artigo.className = 'professional-card';

    const linkPerfil = profissional.link || '#';

    artigo.innerHTML = `
      <div class="professional-card__photo" style="background-image:url('${profissional.foto}');" aria-hidden="true"></div>
      <div class="professional-card__footer">
        <h2 class="professional-card__name">${profissional.nome}</h2>
        <p class="professional-card__desc">${profissional.descricao}</p>
        <div class="professional-card__row">
          <span class="professional-card__rating">
            <span class="professional-card__star" aria-hidden="true">&#9733;</span> ${profissional.nota}
          </span>
          <a href="${linkPerfil}" class="card__arrow professional-card__arrow" aria-label="Ver perfil de ${profissional.nome}">&rarr;</a>
        </div>
        <p class="professional-card__category">${categoriaAtiva}</p>
      </div>
    `;

    gradeDeProfissionais.appendChild(artigo);
  });
}


// ===================================================================
// PAGINAÇÃO (troca visual de página ativa)
// ===================================================================
// Como este é um site estático (sem um servidor real por trás), os
// botões não carregam profissionais diferentes de verdade — só
// demonstram a interação de "qual página está selecionada agora".
const botoesPaginacao = document.querySelectorAll('.pagination__page');

botoesPaginacao.forEach((botao) => {
  botao.addEventListener('click', () => {
    botoesPaginacao.forEach((b) => b.classList.remove('pagination__page--active'));
    botao.classList.add('pagination__page--active');
  });
});

// ===================================================================
// WIDGET DE CHAT — a mensagem só aparece com o mouse sobre o avatar
// ===================================================================
const chatAvatar = document.querySelector('.chat-widget__avatar');
const chatBubble = document.querySelector('.chat-widget__bubble');

if (chatAvatar && chatBubble) {
  chatAvatar.addEventListener('mouseenter', () => {
    chatBubble.classList.add('chat-widget__bubble--visivel');
  });

  chatAvatar.addEventListener('mouseleave', () => {
    chatBubble.classList.remove('chat-widget__bubble--visivel');
  });
}

// ===================================================================
// PAINEL DE CHAT (FAQ com roteiro fixo)
// ===================================================================
const chatPanel = document.getElementById('chat-panel');
const chatPanelClose = document.getElementById('chat-panel-close');
const chatMessages = document.getElementById('chat-panel-messages');
const chatQuickReplies = document.querySelectorAll('.chat-quick-reply');

// Cria uma "bolha" de mensagem e adiciona no final da conversa.
// "tipo" é 'bot' ou 'usuario' — decide de que lado ela aparece e a cor,
// via a classe CSS correspondente (chat-message--bot / --usuario).
function adicionarMensagem(texto, tipo) {
  const mensagem = document.createElement('p');
  mensagem.className = `chat-message chat-message--${tipo}`;
  mensagem.textContent = texto;
  chatMessages.appendChild(mensagem);

  // Rola a conversa até o final, pra sempre mostrar a mensagem mais
  // recente — sem isso, uma conversa longa deixaria a resposta nova
  // escondida acima da área visível.
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatAvatar && chatPanel && chatPanelClose) {
  function abrirPainelDeChat() {
    chatPanel.hidden = false;
    chatAvatar.setAttribute('aria-expanded', 'true');
  }

  function fecharPainelDeChat() {
    chatPanel.hidden = true;
    chatAvatar.setAttribute('aria-expanded', 'false');
  }

  // O avatar é uma <img>, não um <button> — por isso escutamos tanto
  // "click" (mouse) quanto "keydown" com Enter/Espaço (teclado), já
  // que uma imagem não ativa sozinha com a tecla Enter como um botão
  // de verdade ativaria.
  chatAvatar.addEventListener('click', abrirPainelDeChat);
  chatAvatar.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrirPainelDeChat();
    }
  });

  chatPanelClose.addEventListener('click', fecharPainelDeChat);

  // Cada botão de pergunta pronta gera DUAS mensagens na conversa:
  // a pergunta (como se o usuário tivesse "dito" aquilo) e, na
  // sequência, a resposta fixa guardada em "data-resposta" no HTML.
  chatQuickReplies.forEach((botao) => {
    botao.addEventListener('click', () => {
      adicionarMensagem(botao.textContent.trim(), 'usuario');
      adicionarMensagem(botao.dataset.resposta, 'bot');
    });
  });
}

// ===================================================================
// PÁGINA DE PERFIL
// ===================================================================

// --- Trocar a foto de perfil ---
// O <input type="file"> fica escondido (hidden) — o botão de lápis só
// existe pra "clicar" nesse input escondido por trás dos panos, o que
// abre a janela de escolher arquivo do sistema operacional.
const botaoEditarFoto = document.getElementById('editar-foto');
const inputFotoPerfil = document.getElementById('input-foto-perfil');
const fotoPerfil = document.getElementById('profile-photo');
const avatarNoTopo = document.querySelector('.profile-nav__avatar');

if (botaoEditarFoto && inputFotoPerfil && fotoPerfil) {
  botaoEditarFoto.addEventListener('click', () => {
    inputFotoPerfil.click();
  });

  // Dispara quando a pessoa escolhe um arquivo na janela do sistema
  inputFotoPerfil.addEventListener('change', () => {
    const arquivo = inputFotoPerfil.files[0];
    if (!arquivo) return;

    // URL.createObjectURL cria um endereço temporário, só válido nesta
    // aba, que aponta pro arquivo escolhido — sem precisar enviar nada
    // pra internet. É assim que conseguimos mostrar a prévia na hora.
    const urlDaImagem = URL.createObjectURL(arquivo);
    fotoPerfil.src = urlDaImagem;
    if (avatarNoTopo) {
      avatarNoTopo.src = urlDaImagem;
    }
  });
}

// --- Excluir conta ---
// Como não existe backend neste projeto, não há o que "excluir" de
// verdade — mas ainda vale confirmar a ação, que é o comportamento
// esperado de qualquer botão destrutivo como este.
const botaoExcluirConta = document.getElementById('excluir-conta');

if (botaoExcluirConta) {
  botaoExcluirConta.addEventListener('click', () => {
    const confirmou = window.confirm(
      'Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.'
    );
    if (confirmou) {
      window.location.href = 'index.html';
    }
  });
}

// --- Editar os campos de dados (Nome, Gênero, Email, Telefone) ---
// Os dois ícones (lápis e "check") são pequenos trechos de SVG prontos,
// guardados em variáveis pra não precisar redigitar o desenho toda vez
// que a gente troca de um ícone pro outro.
const ICONE_LAPIS = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;

const ICONE_CONFIRMAR = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// Troca o <span> do valor por um campo editável (<input> ou <select>,
// dependendo do "data-tipo" definido no HTML de cada bloco).
function comecarEdicao(campoEl) {
  const tipo = campoEl.dataset.tipo;
  const textoEl = campoEl.querySelector('.profile-field__value');
  const botaoEl = campoEl.querySelector('.profile-field__edit');
  const valorAtual = textoEl.textContent.trim();

  let elementoEditavel;

  if (tipo === 'select') {
    elementoEditavel = document.createElement('select');
    campoEl.dataset.opcoes.split(',').forEach((opcao) => {
      const optionEl = document.createElement('option');
      optionEl.value = opcao;
      optionEl.textContent = opcao;
      if (opcao === valorAtual) optionEl.selected = true;
      elementoEditavel.appendChild(optionEl);
    });
  } else {
    elementoEditavel = document.createElement('input');
    elementoEditavel.type = tipo; // 'text', 'email' ou 'tel'
    elementoEditavel.value = valorAtual;
  }

  elementoEditavel.className = 'profile-field__input';
  textoEl.replaceWith(elementoEditavel);
  elementoEditavel.focus();
  if (typeof elementoEditavel.select === 'function') {
    elementoEditavel.select(); // já deixa o texto selecionado, pronto pra sobrescrever
  }

  // Enquanto está editando, o botão vira "confirmar" em vez de "editar"
  botaoEl.innerHTML = ICONE_CONFIRMAR;
  botaoEl.setAttribute('aria-label', `Salvar ${campoEl.dataset.nomeCampo}`);

  function salvarEdicao() {
    const novoValor = elementoEditavel.value.trim() || valorAtual;

    const novoSpan = document.createElement('span');
    novoSpan.className = 'profile-field__value';
    novoSpan.textContent = novoValor;
    elementoEditavel.replaceWith(novoSpan);

    botaoEl.innerHTML = ICONE_LAPIS;
    botaoEl.setAttribute('aria-label', `Editar ${campoEl.dataset.nomeCampo}`);
  }

  // Salva ao clicar no botão (agora "confirmar")...
  botaoEl.onclick = salvarEdicao;

  // ...ou ao apertar Enter dentro do campo, sem precisar tirar a mão
  // do teclado pra clicar no botão
  elementoEditavel.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      salvarEdicao();
    }
  });
}

document.querySelectorAll('.profile-field').forEach((campoEl) => {
  const botaoEditar = campoEl.querySelector('.profile-field__edit');
  if (botaoEditar) {
    botaoEditar.onclick = () => comecarEdicao(campoEl);
  }
});

// ===================================================================
// INTEGRAÇÃO COM O GOOGLE AGENDA (perfil do prestador + contratação)
// ===================================================================
// Este é um site estático, sem uma agenda real de verdade por trás —
// então, em vez de só "mostrar" um calendário, os botões abrem a tela
// de "Criar evento" do próprio Google Agenda do visitante, já
// preenchida com data, nome do profissional, categoria e local. A
// pessoa confere/ajusta e salva o evento na conta dela em dois
// cliques — sem precisar de login nem backend.

// Formata uma data JS pro formato exigido pela URL do Google Agenda:
// AAAAMMDDTHHmmSS (hora local — o Google interpreta no fuso de quem
// está logado no navegador).
function formatarDataParaGoogleAgenda(data) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0');
  return (
    data.getFullYear() +
    doisDigitos(data.getMonth() + 1) +
    doisDigitos(data.getDate()) +
    'T' +
    doisDigitos(data.getHours()) +
    doisDigitos(data.getMinutes()) +
    '00'
  );
}

// Monta a URL de "criar evento" do Google Agenda e abre numa aba nova.
// Recebe um objeto { titulo, inicio, fim, local, detalhes } — "inicio"
// e "fim" são objetos Date.
function abrirGoogleAgenda({ titulo, inicio, fim, local, detalhes }) {
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${formatarDataParaGoogleAgenda(inicio)}/${formatarDataParaGoogleAgenda(fim)}`,
    details: detalhes || '',
    location: local || '',
  });

  window.open(`https://calendar.google.com/calendar/render?${parametros.toString()}`, '_blank', 'noopener');
}

// Sugere o próximo horário disponível: começa amanhã às 8h (início do
// expediente) e, se cair num domingo — dia em que o profissional não
// atende, segundo o quadro de "Disponibilidade" do perfil — empurra
// pra segunda-feira. Duração padrão: 1 hora.
function proximoHorarioDisponivel() {
  const agora = new Date();
  const sugestao = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 8, 0, 0);

  if (sugestao.getDay() === 0) { // 0 = domingo
    sugestao.setDate(sugestao.getDate() + 1);
  }

  const fim = new Date(sugestao.getTime() + 60 * 60 * 1000);
  return { inicio: sugestao, fim };
}

// --- Botão "Ver agenda" no perfil do prestador: usa um horário sugerido ---
const botaoVerAgenda = document.getElementById('btn-ver-agenda');

if (botaoVerAgenda) {
  botaoVerAgenda.addEventListener('click', () => {
    const nome = botaoVerAgenda.dataset.nome || 'profissional da Findy';
    const categoria = botaoVerAgenda.dataset.categoria || '';
    const local = botaoVerAgenda.dataset.local || '';
    const { inicio, fim } = proximoHorarioDisponivel();

    abrirGoogleAgenda({
      titulo: `Serviço com ${nome} — Findy`,
      inicio,
      fim,
      local,
      detalhes:
        `Agendamento feito através da Findy.\n` +
        `Profissional: ${nome}${categoria ? ` (${categoria})` : ''}.\n` +
        `Horário sugerido — ajuste o dia e a hora se precisar de outro momento.`,
    });
  });
}

// ===================================================================
// PÁGINA DE CONTRATAÇÃO (contratacao.html)
// ===================================================================
const formularioContratacao = document.getElementById('hire-form');

if (formularioContratacao) {
  // --- 1. Lê os dados do profissional a partir da URL ---
  // Segue o mesmo padrão já usado em categoria.html (?categoria=Nome):
  // a página perfil-prestador.html manda esses dados pelo link do
  // botão "Contratar agora" (?prestador=...&categoria=...&valor=...).
  const parametrosContratacao = new URLSearchParams(window.location.search);
  const prestadorNome = parametrosContratacao.get('prestador') || 'Profissional da Findy';
  const prestadorCategoria = parametrosContratacao.get('categoria') || 'Serviços Gerais';
  const prestadorLocal = parametrosContratacao.get('local') || 'Patos de Minas, MG';
  const prestadorFoto = parametrosContratacao.get('foto');
  const valorDiaria = parseFloat(parametrosContratacao.get('valor')) || 90;

  document.getElementById('hire-prestador-nome').textContent = prestadorNome;
  document.getElementById('hire-prestador-categoria').textContent = prestadorCategoria;
  document.getElementById('hire-prestador-local').textContent = `\u{1F4CD} ${prestadorLocal}`;
  document.getElementById('hire-success-nome').textContent = prestadorNome;
  if (prestadorFoto) {
    document.getElementById('hire-prestador-foto').src = prestadorFoto;
  }

  // --- 2. Data mínima selecionável: hoje (não dá pra contratar no passado) ---
  const campoData = document.getElementById('hire-data');
  const hojeISO = new Date().toISOString().split('T')[0];
  campoData.min = hojeISO;
  campoData.value = hojeISO;

  // --- 3. Cálculo do valor total, a partir da duração escolhida ---
  // O "valor" que chega na URL é a diária (8h). Dividimos por 8 pra
  // achar um valor de referência por hora e multiplicamos pela
  // duração escolhida — só um cálculo de demonstração.
  const valorHora = valorDiaria / 8;
  const campoDuracao = document.getElementById('hire-duracao');
  const LABEL_DURACAO = { '1': '1 hora', '2': '2 horas', '4': 'Meio período (4h)', '8': 'Dia inteiro (8h)' };

  function formatarReais(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function atualizarResumoDeValores() {
    const horas = parseFloat(campoDuracao.value) || 1;
    const subtotal = valorHora * horas;
    const taxa = subtotal * 0.10;
    const total = subtotal + taxa;

    document.getElementById('hire-valor-hora').textContent = `${formatarReais(valorHora)}/h`;
    document.getElementById('hire-duracao-label').textContent = LABEL_DURACAO[campoDuracao.value] || `${horas}h`;
    document.getElementById('hire-subtotal').textContent = formatarReais(subtotal);
    document.getElementById('hire-taxa').textContent = formatarReais(taxa);
    document.getElementById('hire-total').textContent = formatarReais(total);
  }

  campoDuracao.addEventListener('change', atualizarResumoDeValores);
  atualizarResumoDeValores();

  // --- 4. Monta a data/hora de início e fim escolhidas no formulário ---
  function horarioEscolhido() {
    const [ano, mes, dia] = campoData.value.split('-').map(Number);
    const [horaInicio, minutoInicio] = document.getElementById('hire-hora').value.split(':').map(Number);
    const duracaoHoras = parseFloat(campoDuracao.value) || 1;

    const inicio = new Date(ano, mes - 1, dia, horaInicio, minutoInicio, 0);
    const fim = new Date(inicio.getTime() + duracaoHoras * 60 * 60 * 1000);
    return { inicio, fim };
  }

  function detalhesDoAgendamento() {
    return (
      `Serviço agendado através da Findy.\n` +
      `Profissional: ${prestadorNome} (${prestadorCategoria}).\n` +
      `Endereço: ${document.getElementById('hire-endereco').value || 'a combinar'}, ` +
      `${document.getElementById('hire-bairro').value || ''} — ${document.getElementById('hire-cidade').value}.`
    );
  }

  // --- 5. Botões "Adicionar ao Google Agenda" (no resumo e na tela de sucesso) ---
  function adicionarContratacaoNaAgenda() {
    const { inicio, fim } = horarioEscolhido();
    abrirGoogleAgenda({
      titulo: `Serviço com ${prestadorNome} — Findy`,
      inicio,
      fim,
      local: `${document.getElementById('hire-endereco').value || prestadorLocal}, ${document.getElementById('hire-cidade').value}`,
      detalhes: detalhesDoAgendamento(),
    });
  }

  document.getElementById('btn-agenda-contratacao').addEventListener('click', adicionarContratacaoNaAgenda);
  document.getElementById('btn-agenda-sucesso').addEventListener('click', adicionarContratacaoNaAgenda);

  // --- 6. Envio do formulário: sem backend, então só mostramos a
  // confirmação visual (a validação de campos obrigatórios, como data,
  // horário e aceite dos termos, já é feita pelo próprio navegador
  // através dos atributos "required" no HTML). ---
  formularioContratacao.addEventListener('submit', (evento) => {
    evento.preventDefault();

    document.getElementById('hire-layout').hidden = true;
    document.querySelector('.hire-page__title').hidden = true;
    document.querySelector('.hire-page__back').hidden = true;

    const secaoSucesso = document.getElementById('hire-success');
    secaoSucesso.hidden = false;
    secaoSucesso.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Leva pra página de status já com os dados deste atendimento (mesmo
    // padrão de "?prestador=...&categoria=..." usado no resto do site).
    const linkStatus = document.getElementById('link-status-atendimento');
    if (linkStatus) {
      linkStatus.href = `status-atendimento.html?${parametrosContratacao.toString()}`;
    }
  });
}

// ===================================================================
// STATUS DO ATENDIMENTO (status-atendimento.html)
// ===================================================================
// Como o site é estático e não tem login/backend de verdade, não existe
// como o contratante e o prestador acessarem a mesma "sessão" em
// computadores diferentes. Pra simular o fluxo de duas pessoas mesmo
// assim, guardamos o estado do atendimento no localStorage do
// navegador (ele persiste entre recarregamentos de página) e um botão
// "Ver como" alterna qual dos dois painéis fica ativo — só pra fins de
// demonstração do protótipo.
const painelContratante = document.getElementById('painel-contratante');

if (painelContratante) {
  const parametrosStatus = new URLSearchParams(window.location.search);
  const prestadorNomeStatus = parametrosStatus.get('prestador') || 'Camila Duarte';
  const prestadorCategoriaStatus = parametrosStatus.get('categoria') || 'Serviços Domésticos';
  const prestadorLocalStatus = parametrosStatus.get('local') || 'Patos de Minas, MG';
  const prestadorFotoStatus = parametrosStatus.get('foto');
  const contratanteNomeStatus = parametrosStatus.get('contratante') || 'Marcos Vinícius';

  // Preenche o resumo do atendimento
  document.getElementById('status-prestador-nome').textContent = prestadorNomeStatus;
  document.getElementById('status-prestador-categoria').textContent = prestadorCategoriaStatus;
  document.getElementById('status-prestador-local').textContent = `\u{1F4CD} ${prestadorLocalStatus}`;
  document.getElementById('status-contratante-nome').textContent = contratanteNomeStatus;
  document.getElementById('contratante-aguardando-nome').textContent = prestadorNomeStatus;
  document.getElementById('prestador-aguardando-nome').textContent = contratanteNomeStatus;
  if (prestadorFotoStatus) {
    document.getElementById('status-prestador-foto').src = prestadorFotoStatus;
  }

  // A chave de armazenamento é única por par prestador+contratante, pra
  // não misturar o status de atendimentos diferentes no mesmo navegador.
  const chaveEstado = `findy-status:${prestadorNomeStatus}:${contratanteNomeStatus}`;

  function lerEstado() {
    try {
      const salvo = JSON.parse(localStorage.getItem(chaveEstado));
      if (salvo) return salvo;
    } catch (erro) {
      // localStorage indisponível ou dado corrompido — segue com o padrão
    }
    return { contratanteConcluiu: false, prestadorConfirmou: false, nota: null, comentario: '' };
  }

  function salvarEstado(estado) {
    try {
      localStorage.setItem(chaveEstado, JSON.stringify(estado));
    } catch (erro) {
      // se o navegador bloquear localStorage, a simulação some ao
      // recarregar — mas a página continua funcionando normalmente
    }
  }

  let papelAtual = 'contratante';

  const botaoVerContratante = document.getElementById('btn-ver-contratante');
  const botaoVerPrestador = document.getElementById('btn-ver-prestador');
  const painelPrestador = document.getElementById('painel-prestador');

  function estrelas(nota) {
    const cheia = '\u2605';
    const vazia = '\u2606';
    return cheia.repeat(nota) + vazia.repeat(5 - nota);
  }

  function renderizarStatus() {
    const estado = lerEstado();

    // --- Seletor "Ver como" ---
    botaoVerContratante.classList.toggle('status-role-switch__btn--ativo', papelAtual === 'contratante');
    botaoVerPrestador.classList.toggle('status-role-switch__btn--ativo', papelAtual === 'prestador');
    painelContratante.hidden = papelAtual !== 'contratante';
    painelPrestador.hidden = papelAtual !== 'prestador';

    // --- Selo de status ---
    const selo = document.getElementById('status-badge');
    if (estado.prestadorConfirmou) {
      selo.textContent = 'Concluído';
      selo.className = 'status-badge status-badge--concluido';
    } else if (estado.contratanteConcluiu) {
      selo.textContent = 'Aguardando confirmação do prestador';
      selo.className = 'status-badge status-badge--aguardando';
    } else {
      selo.textContent = 'Em andamento';
      selo.className = 'status-badge';
    }

    // --- Linha do tempo ---
    const passo2 = document.getElementById('passo-2');
    const passo3 = document.getElementById('passo-3');
    passo2.className = 'status-steps__item' + (estado.contratanteConcluiu ? ' status-steps__item--concluido' : ' status-steps__item--ativo');
    passo2.querySelector('.status-steps__marker').innerHTML = estado.contratanteConcluiu ? '&#10003;' : '2';
    document.getElementById('passo-2-desc').textContent = estado.contratanteConcluiu
      ? `${contratanteNomeStatus} avaliou o atendimento com nota ${estado.nota}.`
      : 'Aguardando avaliação do contratante.';

    passo3.className = 'status-steps__item' +
      (estado.prestadorConfirmou ? ' status-steps__item--concluido' : (estado.contratanteConcluiu ? ' status-steps__item--ativo' : ''));
    passo3.querySelector('.status-steps__marker').innerHTML = estado.prestadorConfirmou ? '&#10003;' : '3';
    document.getElementById('passo-3-desc').textContent = estado.prestadorConfirmou
      ? `${prestadorNomeStatus} confirmou a conclusão do serviço.`
      : (estado.contratanteConcluiu ? 'Aguardando confirmação do prestador.' : 'Só libera depois que o contratante avaliar.');

    // --- Painel do contratante ---
    document.getElementById('contratante-form-avaliar').hidden = estado.contratanteConcluiu;
    document.getElementById('contratante-aguardando').hidden = !(estado.contratanteConcluiu && !estado.prestadorConfirmou);
    document.getElementById('contratante-concluido').hidden = !estado.prestadorConfirmou;

    if (estado.contratanteConcluiu) {
      document.getElementById('resumo-nota').textContent = estrelas(estado.nota);
      document.getElementById('resumo-comentario').textContent = estado.comentario || '(sem comentário)';
    }
    if (estado.prestadorConfirmou) {
      document.getElementById('resumo-nota-final').textContent = estrelas(estado.nota);
      document.getElementById('resumo-comentario-final').textContent = estado.comentario || '(sem comentário)';
    }

    // --- Painel do prestador ---
    document.getElementById('prestador-aguardando-contratante').hidden = estado.contratanteConcluiu;
    document.getElementById('prestador-decidir').hidden = !(estado.contratanteConcluiu && !estado.prestadorConfirmou);
    document.getElementById('prestador-concluido').hidden = !estado.prestadorConfirmou;

    if (estado.contratanteConcluiu && !estado.prestadorConfirmou) {
      document.getElementById('resumo-nota-prestador').textContent = estrelas(estado.nota);
      document.getElementById('resumo-comentario-prestador').textContent = estado.comentario || '(sem comentário)';
    }
    if (estado.prestadorConfirmou) {
      document.getElementById('resumo-nota-prestador-final').textContent = estrelas(estado.nota);
      document.getElementById('resumo-comentario-prestador-final').textContent = estado.comentario || '(sem comentário)';
    }
  }

  botaoVerContratante.addEventListener('click', () => { papelAtual = 'contratante'; renderizarStatus(); });
  botaoVerPrestador.addEventListener('click', () => { papelAtual = 'prestador'; renderizarStatus(); });

  // --- Ação: contratante marca como concluído ---
  document.getElementById('btn-marcar-concluido').addEventListener('click', () => {
    const notaEscolhida = document.querySelector('input[name="nota"]:checked');
    const erroNota = document.getElementById('status-erro-nota');

    if (!notaEscolhida) {
      erroNota.hidden = false;
      return;
    }
    erroNota.hidden = true;

    const estado = lerEstado();
    estado.contratanteConcluiu = true;
    estado.nota = Number(notaEscolhida.value);
    estado.comentario = document.getElementById('status-comentario').value.trim();
    salvarEstado(estado);
    renderizarStatus();
  });

  // --- Ação: prestador confirma a conclusão ---
  document.getElementById('btn-confirmar-conclusao').addEventListener('click', () => {
    const estado = lerEstado();
    estado.prestadorConfirmou = true;
    salvarEstado(estado);
    renderizarStatus();
  });

  // --- Ação: prestador contesta (reabre pro contratante avaliar de novo) ---
  document.getElementById('btn-contestar').addEventListener('click', () => {
    const confirmou = window.confirm(
      'Contestar reabre o atendimento como "Em andamento" e o contratante precisa avaliar de novo. Continuar?'
    );
    if (!confirmou) return;

    const estado = lerEstado();
    estado.contratanteConcluiu = false;
    estado.prestadorConfirmou = false;
    estado.nota = null;
    estado.comentario = '';
    salvarEstado(estado);
    document.getElementById('status-comentario').value = '';
    document.querySelectorAll('input[name="nota"]').forEach((input) => { input.checked = false; });
    papelAtual = 'contratante';
    renderizarStatus();
  });

  // --- Reiniciar a simulação inteira (só existe pro protótipo) ---
  document.getElementById('btn-reiniciar-simulacao').addEventListener('click', () => {
    localStorage.removeItem(chaveEstado);
    document.getElementById('status-comentario').value = '';
    document.querySelectorAll('input[name="nota"]').forEach((input) => { input.checked = false; });
    document.getElementById('status-erro-nota').hidden = true;
    renderizarStatus();
  });

  renderizarStatus();
}