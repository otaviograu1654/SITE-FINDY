// Testa edição, ativação, aprovação e permissões dos perfis profissionais com rollback no banco.

package br.com.projetointegrador.plataformaservicos;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.PrestadorRepository;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PerfilPrestadorTests {
    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired PrestadorRepository prestadores;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entidades;
    Usuario dono;
    Usuario outro;
    MockHttpSession sessao;
    MockHttpSession outraSessao;
    static final String DADOS = """
            {"descricaoProfissional":"Limpeza residencial", "experiencia":"Dois anos",
             "regiaoAtendimento":"Patos de Minas"}
            """;

    @BeforeEach
    void preparar() {
        dono = usuario("Dono");
        outro = usuario("Outro");
        sessao = new MockHttpSession();
        sessao.setAttribute("usuarioId", dono.getId());
        sessao.setAttribute("senhaDaSessao", dono.getSenhaHash());
        outraSessao = new MockHttpSession();
        outraSessao.setAttribute("usuarioId", outro.getId());
        outraSessao.setAttribute("senhaDaSessao", outro.getSenhaHash());
    }

    private Usuario usuario(String nome) {
        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(UUID.randomUUID() + "@example.com");
        usuario.setSenhaHash("hash-apenas-para-teste-transacional");
        return usuarios.saveAndFlush(usuario);
    }

    private Long criar() throws Exception {
        mvc.perform(put("/prestadores/me").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(DADOS))
                .andExpect(status().isCreated());
        return prestadores.findByUsuarioId(dono.getId()).orElseThrow().getId();
    }

    private void aprovar(Long id) {
        jdbc.update("UPDATE prestadores SET status_aprovacao='APROVADO', analisado_por=?, data_analise=now() WHERE id=?",
                outro.getId(), id);
        entidades.clear();
    }

    @Test
    void exigeLoginNasOperacoesPrivadas() throws Exception {
        mvc.perform(get("/prestadores/me")).andExpect(status().isUnauthorized());
        mvc.perform(put("/prestadores/me").contentType(MediaType.APPLICATION_JSON).content(DADOS))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/prestadores/me/ativacao").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ativo\":true}")).andExpect(status().isUnauthorized());
    }

    @Test
    void criaUmPerfilPendenteSemAceitarDonoOuAprovacaoDoCliente() throws Exception {
        String dados = DADOS.trim().replaceFirst("\\}$", ", \"statusAprovacao\":\"APROVADO\", \"usuarioId\":" + outro.getId() + "}");
        mvc.perform(put("/prestadores/me").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(dados))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statusAprovacao").value("PENDENTE"))
                .andExpect(jsonPath("$.ativo").value(true));
        assertThat(prestadores.findByUsuarioId(outro.getId())).isEmpty();
        mvc.perform(put("/prestadores/me").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(DADOS)).andExpect(status().isOk());
        assertThat(prestadores.findByUsuarioId(dono.getId())).isPresent();
    }

    @Test
    void validaApresentacaoEAtivacao() throws Exception {
        mvc.perform(get("/prestadores/me").session(sessao)).andExpect(status().isNotFound());
        mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"descricaoProfissional\":\"   \",\"regiaoAtendimento\":\"MG\"}"))
                .andExpect(status().isBadRequest());
        criar();
        mvc.perform(patch("/prestadores/me/ativacao").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void edicaoNaoAlteraPerfilDeOutroUsuario() throws Exception {
        Long id = criar();
        mvc.perform(put("/prestadores/me").session(outraSessao)
                .contentType(MediaType.APPLICATION_JSON).content(DADOS.replace("Limpeza residencial", "Outro profissional")))
                .andExpect(status().isCreated());
        mvc.perform(put("/prestadores/me").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(DADOS.replace("Limpeza residencial", "Apresentacao alterada")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/prestadores/me").session(outraSessao))
                .andExpect(jsonPath("$.descricaoProfissional").value("Outro profissional"));
    }

    @Test
    void publicaSomenteAprovadoEReenviaAlteracoesParaAnalise() throws Exception {
        Long id = criar();
        mvc.perform(get("/prestadores/" + id)).andExpect(status().isNotFound());
        aprovar(id);
        mvc.perform(get("/prestadores/" + id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Dono"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist())
                .andExpect(jsonPath("$.motivoRecusa").doesNotExist());
        mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(DADOS.replace("Dois anos", "Tres anos")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusAprovacao").value("PENDENTE"))
                .andExpect(jsonPath("$.dataAnalise").isEmpty());
        mvc.perform(get("/prestadores/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void desativaSemExcluirContaEReativaComMesmoId() throws Exception {
        Long id = criar();
        aprovar(id);
        mvc.perform(patch("/prestadores/me/ativacao").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ativo").value(false));
        mvc.perform(get("/prestadores/" + id)).andExpect(status().isNotFound());
        mvc.perform(get("/perfil").session(sessao)).andExpect(status().isOk());
        mvc.perform(patch("/prestadores/me/ativacao").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.statusAprovacao").value("PENDENTE"));
        mvc.perform(get("/prestadores/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void recusadoPodeCorrigirEReenviar() throws Exception {
        Long id = criar();
        jdbc.update("UPDATE prestadores SET status_aprovacao='RECUSADO', motivo_recusa='Complete a apresentacao', analisado_por=?, data_analise=now() WHERE id=?",
                outro.getId(), id);
        entidades.clear();
        mvc.perform(get("/prestadores/me").session(sessao))
                .andExpect(jsonPath("$.motivoRecusa").value("Complete a apresentacao"));
        mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(DADOS))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statusAprovacao").value("PENDENTE"))
                .andExpect(jsonPath("$.motivoRecusa").isEmpty());
    }

    @Test
    void contaInativaPerdeAcessoEPublicacao() throws Exception {
        Long id = criar();
        aprovar(id);
        jdbc.update("UPDATE usuarios SET ativo=false WHERE id=?", dono.getId());
        entidades.clear();
        mvc.perform(get("/prestadores/me").session(sessao)).andExpect(status().isUnauthorized());
        mvc.perform(get("/prestadores/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void entregaTelasEScriptsPeloBackend() throws Exception {
        mvc.perform(get("/minha-conta.html")).andExpect(status().isOk());
        mvc.perform(get("/perfil-prestador.html")).andExpect(status().isOk());
        mvc.perform(get("/prestador.js")).andExpect(status().isOk());
        mvc.perform(get("/login.html")).andExpect(status().isOk());
    }

    @Test
    void corsPermiteLiveServerLocalEBloqueiaOutraOrigem() throws Exception {
        mvc.perform(options("/prestadores/me").header("Origin", "http://localhost:5501")
                .header("Access-Control-Request-Method", "PUT").header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        mvc.perform(options("/prestadores/me").header("Origin", "https://outro.example")
                .header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isForbidden());
    }
}
