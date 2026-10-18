// Testa recuperação de senha, validade dos links e bloqueio de sessões antigas com e-mail simulado.

package br.com.projetointegrador.plataformaservicos;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import br.com.projetointegrador.plataformaservicos.service.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RecuperacaoSenhaTests {
    private static final AtomicInteger IPS = new AtomicInteger();
    private static final String ANTIGA = "SenhaAnterior123!";
    private static final String NOVA = "SenhaNova456!";

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate banco;
    @Autowired UsuarioRepository usuarios;
    @Autowired PasswordEncoder encoder;
    @Autowired @Qualifier("recuperacaoExecutor") ThreadPoolTaskExecutor executor;
    @MockitoBean EmailService emailService;

    private Usuario usuario;
    private String ip;
    private Map<String, String> dadosAntes;

    @BeforeEach
    void preparar() {
        dadosAntes = snapshot();
        ip = "192.0.2." + IPS.incrementAndGet();
        usuario = new Usuario();
        usuario.setNome("Teste recuperação");
        usuario.setEmail("teste.recuperacao." + UUID.randomUUID() + "@example.invalid");
        usuario.setSenhaHash(encoder.encode(ANTIGA));
        usuario = usuarios.saveAndFlush(usuario);
    }

    @AfterEach
    void limpar() throws Exception {
        aguardarEnvios();
        if (usuario != null && usuario.getId() != null) {
            // A FK remove também os tokens desta conta temporária.
            banco.update("DELETE FROM usuarios WHERE id=? AND email=?",
                    usuario.getId(), usuario.getEmail());
        }
        assertThat(snapshot()).as("dados preexistentes preservados").isEqualTo(dadosAntes);
    }

    private Map<String, String> snapshot() {
        Map<String, String> resultado = new LinkedHashMap<>();
        for (String tabela : List.of("usuarios", "prestadores", "categorias", "servicos",
                "solicitacoes", "avaliacoes", "recuperacoes_senha")) {
            resultado.put(tabela, banco.queryForObject(
                    "SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text,'[]')) FROM "
                            + tabela + " t", String.class));
        }
        return resultado;
    }

    private MockHttpServletRequestBuilder pedido(String caminho, String json) {
        return post(caminho).with(request -> {
            request.setRemoteAddr(ip);
            return request;
        }).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private String solicitar(String endereco) throws Exception {
        return mvc.perform(pedido("/auth/recuperar-senha", "{\"email\":\"" + endereco + "\"}"))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
    }

    private void aguardarEnvios() throws Exception {
        long limite = System.nanoTime() + 10_000_000_000L;
        while (executor.getActiveCount() > 0 || !executor.getThreadPoolExecutor().getQueue().isEmpty()) {
            if (System.nanoTime() > limite) throw new AssertionError("Envio assíncrono não concluiu.");
            Thread.sleep(20);
        }
    }

    private String pedirToken() throws Exception {
        clearInvocations(emailService);
        solicitar(usuario.getEmail());
        aguardarEnvios();
        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(emailService).enviar(eq(usuario.getEmail()), eq("Findy - Recuperação de senha"), texto.capture());
        var matcher = Pattern.compile("#token=([A-Za-z0-9_-]{43})").matcher(texto.getValue());
        assertThat(matcher.find()).as("link contém token aleatório").isTrue();
        return matcher.group(1);
    }

    private MockHttpServletRequestBuilder redefinir(String token, String senha, String confirmacao) {
        return pedido("/auth/redefinir-senha", """
                {"token":"%s","novaSenha":"%s","confirmacao":"%s"}
                """.formatted(token, senha, confirmacao));
    }

    private MockHttpSession entrar(String senha) throws Exception {
        return (MockHttpSession) mvc.perform(pedido("/auth/login", """
                {"email":"%s","senha":"%s"}
                """.formatted(usuario.getEmail(), senha)))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private String senhaHash() {
        return banco.queryForObject("SELECT senha_hash FROM usuarios WHERE id=?",
                String.class, usuario.getId());
    }

    @Test
    void geraHashComExpiracaoSemRevelarConta() throws Exception {
        String conhecida = solicitar(usuario.getEmail());
        aguardarEnvios();
        String desconhecida = solicitar(UUID.randomUUID() + "@example.invalid");
        banco.update("UPDATE usuarios SET ativo=false WHERE id=?", usuario.getId());
        String inativa = solicitar(usuario.getEmail());
        aguardarEnvios();
        assertThat(conhecida).isEqualTo(desconhecida).isEqualTo(inativa);
        verify(emailService, times(1)).enviar(anyString(), anyString(), anyString());
        String hash = banco.queryForObject("SELECT token_hash FROM recuperacoes_senha WHERE usuario_id=?",
                String.class, usuario.getId());
        assertThat(hash).matches("[a-f0-9]{64}");
        Double segundos = banco.queryForObject("""
                SELECT EXTRACT(EPOCH FROM (expira_em-criado_em))::float8
                FROM recuperacoes_senha WHERE usuario_id=?
                """, Double.class, usuario.getId());
        assertThat(segundos).isBetween(1800.0, 1830.0);
    }

    @Test
    void respeitaIntervaloEntrePedidos() throws Exception {
        pedirToken();
        solicitar(usuario.getEmail());
        aguardarEnvios();
        verify(emailService, times(1)).enviar(anyString(), anyString(), anyString());
        assertThat(banco.queryForObject("SELECT COUNT(*) FROM recuperacoes_senha WHERE usuario_id=?",
                Integer.class, usuario.getId())).isEqualTo(1);
    }

    @Test
    void trocaSenhaEEncerraTodasAsRotasDasSessoesAntigas() throws Exception {
        List<String> rotas = List.of("/auth/me", "/perfil", "/prestadores/me",
                "/meus-servicos", "/admin/me", "/admin/cadastros");
        List<MockHttpSession> sessoes = new ArrayList<>();
        for (String rota : rotas) sessoes.add(entrar(ANTIGA));
        String token = pedirToken();
        mvc.perform(redefinir(token, NOVA, NOVA)).andExpect(status().isOk());
        assertThat(encoder.matches(NOVA, senhaHash())).isTrue();
        assertThat(encoder.matches(ANTIGA, senhaHash())).isFalse();
        assertThat(senhaHash()).isNotEqualTo(NOVA);
        for (int i = 0; i < rotas.size(); i++) {
            mvc.perform(get(rotas.get(i)).session(sessoes.get(i))).andExpect(status().isUnauthorized());
            assertThat(sessoes.get(i).isInvalid()).isTrue();
        }
        mvc.perform(pedido("/auth/login", """
                {"email":"%s","senha":"%s"}
                """.formatted(usuario.getEmail(), ANTIGA))).andExpect(status().isUnauthorized());
        MockHttpSession nova = entrar(NOVA);
        mvc.perform(get("/auth/me").session(nova)).andExpect(status().isOk());
        mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void linkSoPodeSerUsadoUmaVez() throws Exception {
        String token = pedirToken();
        mvc.perform(redefinir(token, NOVA, NOVA)).andExpect(status().isOk());
        mvc.perform(redefinir(token, "OutraSenha789!", "OutraSenha789!")).andExpect(status().isBadRequest());
        assertThat(encoder.matches(NOVA, senhaHash())).isTrue();
    }

    @Test
    void recusaLinkExpiradoOuInexistente() throws Exception {
        String token = pedirToken();
        banco.update("""
                UPDATE recuperacoes_senha
                SET criado_em=clock_timestamp()-INTERVAL '2 hours',
                    expira_em=clock_timestamp()-INTERVAL '1 hour'
                WHERE usuario_id=?
                """, usuario.getId());
        mvc.perform(redefinir(token, NOVA, NOVA)).andExpect(status().isBadRequest());
        mvc.perform(redefinir("A".repeat(43), NOVA, NOVA)).andExpect(status().isBadRequest());
        mvc.perform(redefinir("invalido", NOVA, NOVA)).andExpect(status().isBadRequest());
        assertThat(encoder.matches(ANTIGA, senhaHash())).isTrue();
    }

    @Test
    void validaConfirmacaoTamanhoEBytesDaSenha() throws Exception {
        String token = pedirToken();
        mvc.perform(redefinir(token, NOVA, "Diferente123!")).andExpect(status().isBadRequest());
        mvc.perform(redefinir(token, "curta", "curta")).andExpect(status().isBadRequest());
        String longa = "é".repeat(37); // 37 caracteres, mas 74 bytes em UTF-8.
        mvc.perform(redefinir(token, longa, longa)).andExpect(status().isBadRequest());
        assertThat(encoder.matches(ANTIGA, senhaHash())).isTrue();
        mvc.perform(redefinir(token, NOVA, NOVA)).andExpect(status().isOk());
    }

    @Test
    void novoPedidoInvalidaLinkAnterior() throws Exception {
        String antigo = pedirToken();
        banco.update("UPDATE recuperacoes_senha SET criado_em=clock_timestamp()-INTERVAL '2 minutes' WHERE usuario_id=?",
                usuario.getId());
        String novo = pedirToken();
        assertThat(novo).isNotEqualTo(antigo);
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(novo.getBytes(StandardCharsets.UTF_8)));
        assertThat(banco.queryForObject("SELECT token_hash FROM recuperacoes_senha WHERE usuario_id=? AND usado_em IS NULL",
                String.class, usuario.getId())).isEqualTo(hash).isNotEqualTo(novo);
        mvc.perform(redefinir(antigo, NOVA, NOVA)).andExpect(status().isBadRequest());
        mvc.perform(redefinir(novo, NOVA, NOVA)).andExpect(status().isOk());
    }

    @Test
    void falhaNoEnvioDesfazPedidoEPreservaLinkAnterior() throws Exception {
        String anterior = pedirToken();
        banco.update("UPDATE recuperacoes_senha SET criado_em=clock_timestamp()-INTERVAL '2 minutes' WHERE usuario_id=?",
                usuario.getId());
        doThrow(new IllegalStateException("falha simulada")).when(emailService)
                .enviar(anyString(), anyString(), anyString());
        solicitar(usuario.getEmail());
        aguardarEnvios();
        assertThat(banco.queryForObject("SELECT COUNT(*) FROM recuperacoes_senha WHERE usuario_id=? AND usado_em IS NULL",
                Integer.class, usuario.getId())).isEqualTo(1);
        mvc.perform(redefinir(anterior, NOVA, NOVA)).andExpect(status().isOk());
    }

    @Test
    void recusaRedefinicaoDeContaDesativada() throws Exception {
        String token = pedirToken();
        banco.update("UPDATE usuarios SET ativo=false WHERE id=?", usuario.getId());
        mvc.perform(redefinir(token, NOVA, NOVA)).andExpect(status().isBadRequest());
        assertThat(encoder.matches(ANTIGA, senhaHash())).isTrue();
    }

    @Test
    void duasRedefinicoesConcorrentesNaoReutilizamToken() throws Exception {
        String token = pedirToken();
        var primeira = CompletableFuture.supplyAsync(() -> trocarEmParalelo(token, NOVA));
        var segunda = CompletableFuture.supplyAsync(() -> trocarEmParalelo(token, "OutraSenha789!"));
        assertThat(List.of(primeira.get(), segunda.get())).containsExactlyInAnyOrder(200, 400);
    }

    private int trocarEmParalelo(String token, String senha) {
        try {
            return mvc.perform(redefinir(token, senha, senha)).andReturn().getResponse().getStatus();
        } catch (Exception erro) {
            throw new IllegalStateException(erro);
        }
    }

    @Test
    void limitaPedidosPorEndereco() throws Exception {
        String json = "{\"email\":\"inexistente@example.invalid\"}";
        for (int i = 0; i < 20; i++) {
            mvc.perform(pedido("/auth/recuperar-senha", json)).andExpect(status().isAccepted());
        }
        mvc.perform(pedido("/auth/recuperar-senha", json)).andExpect(status().isTooManyRequests());
        aguardarEnvios();
        verifyNoInteractions(emailService);
    }

    @Test
    void validaEmailERecusaSessoesSemMarcadorDeSenha() throws Exception {
        mvc.perform(pedido("/auth/recuperar-senha", "{\"email\":\"invalido\"}"))
                .andExpect(status().isBadRequest());
        for (String rota : List.of("/auth/me", "/perfil", "/meus-servicos")) {
            MockHttpSession antiga = new MockHttpSession();
            antiga.setAttribute("usuarioId", usuario.getId());
            mvc.perform(get(rota).session(antiga)).andExpect(status().isUnauthorized());
        }
    }
}
