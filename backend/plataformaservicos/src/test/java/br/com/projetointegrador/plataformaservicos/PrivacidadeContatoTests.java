// Verifica contatos após aceite e preserva os dados para consulta no banco de testes.
package br.com.projetointegrador.plataformaservicos;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import java.time.OffsetDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PrivacidadeContatoTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate banco;
    @Autowired UsuarioRepository usuarios;
    Usuario cliente, profissional, administrador;
    MockHttpSession clienteSessao, profissionalSessao, adminSessao;
    Long servicoId;

    @BeforeEach void preparar() {
        // Sem transação de teste ou limpeza: cada rodada cria dados identificáveis.
        assertThat(banco.queryForObject("SELECT current_database()", String.class))
                .isEqualTo("findy_cadastro_test_20261028");
        cliente = conta("cliente", "USUARIO"); profissional = conta("prestador", "USUARIO");
        administrador = conta("admin", "ADMIN");
        clienteSessao = sessao(cliente); profissionalSessao = sessao(profissional); adminSessao = sessao(administrador);
        Long perfil = banco.queryForObject("INSERT INTO prestadores(usuario_id,status_aprovacao) VALUES (?,'APROVADO') RETURNING id",
                Long.class, profissional.getId());
        Long categoria = banco.queryForObject("SELECT MIN(id) FROM categorias", Long.class);
        servicoId = banco.queryForObject("INSERT INTO servicos(prestador_id,categoria_id,titulo) VALUES (?,?,'Teste privacidade de contato') RETURNING id",
                Long.class, perfil, categoria);
    }

    Usuario conta(String nome, String papel) {
        Usuario u = new Usuario(); u.setNome("Teste privacidade " + nome);
        u.setEmail("privacidade." + UUID.randomUUID() + "@example.invalid");
        u.setSenhaHash("hash-teste-privacidade"); u.setPapel(papel); u.setTelefone("34999999999");
        return usuarios.saveAndFlush(u);
    }

    MockHttpSession sessao(Usuario u) {
        var s = new MockHttpSession(); s.setAttribute("usuarioId", u.getId());
        s.setAttribute("senhaDaSessao", u.getSenhaHash()); return s;
    }

    Long criar() throws Exception {
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON).content("""
                {"servicoId":%d,"dataInicio":"%s","quantidade":1,
                "endereco":"Rua privativa de teste, 10","bairro":"Centro","cidade":"Patos de Minas",
                "estado":"MG","mensagem":"Quero combinar um orçamento"}
                """.formatted(servicoId, OffsetDateTime.now().plusDays(3))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contatosLiberados").value(false))
                .andExpect(jsonPath("$.telefoneCliente").doesNotExist())
                .andExpect(jsonPath("$.telefoneProfissional").doesNotExist())
                .andExpect(jsonPath("$.endereco").doesNotExist());
        return banco.queryForObject("SELECT MAX(id) FROM solicitacoes WHERE cliente_id=?", Long.class, cliente.getId());
    }

    void agir(Long id, MockHttpSession s, String acao) throws Exception {
        mvc.perform(patch("/solicitacoes/" + id + "/situacao").session(s)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acao\":\"" + acao + "\"}"))
                .andExpect(status().isOk());
    }

    void oculto(Long id, MockHttpSession s) throws Exception {
        mvc.perform(get("/solicitacoes/" + id).session(s)).andExpect(status().isOk())
                .andExpect(jsonPath("$.contatosLiberados").value(false))
                .andExpect(jsonPath("$.endereco").doesNotExist())
                .andExpect(jsonPath("$.telefoneCliente").doesNotExist())
                .andExpect(jsonPath("$.telefoneProfissional").doesNotExist())
                .andExpect(jsonPath("$.bairro").value("Centro"))
                .andExpect(jsonPath("$.mensagem").value("Quero combinar um orçamento"));
    }

    @Test void pendenteNaoExpoeContatosNemAoClienteNemAoPrestador() throws Exception {
        Long id = criar(); oculto(id, clienteSessao); oculto(id, profissionalSessao);
        mvc.perform(get("/solicitacoes/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(get("/solicitacoes/" + id).session(adminSessao)).andExpect(status().isNotFound());
        assertThat(banco.queryForObject("SELECT endereco FROM solicitacoes WHERE id=?", String.class, id))
                .isEqualTo("Rua privativa de teste, 10");
    }

    @Test void aceiteLiberaSomenteAosDoisParticipantesSemExporNasListagens() throws Exception {
        Long id = criar(); agir(id, profissionalSessao, "ACEITAR");
        for (var sessao : new MockHttpSession[]{clienteSessao, profissionalSessao}) {
            mvc.perform(get("/solicitacoes/" + id).session(sessao)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.contatosLiberados").value(true))
                    .andExpect(jsonPath("$.telefoneCliente").value("34999999999"))
                    .andExpect(jsonPath("$.telefoneProfissional").value("34999999999"))
                    .andExpect(jsonPath("$.endereco").value("Rua privativa de teste, 10"))
                    .andExpect(jsonPath("$.total").doesNotExist());
        }
        mvc.perform(get("/solicitacoes/" + id).session(adminSessao)).andExpect(status().isNotFound());
        for (String tipo : new String[]{"ENVIADAS", "RECEBIDAS"}) {
            mvc.perform(get("/solicitacoes").param("tipo", tipo)
                    .session(tipo.equals("ENVIADAS") ? clienteSessao : profissionalSessao))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.itens[0].endereco").doesNotExist())
                    .andExpect(jsonPath("$.itens[0].telefoneCliente").doesNotExist())
                    .andExpect(jsonPath("$.itens[0].telefoneProfissional").doesNotExist());
        }
    }

    @Test void recusaOuCancelamentoOcultamContatosInclusiveDepoisDoAceite() throws Exception {
        Long recusado = criar(); agir(recusado, profissionalSessao, "RECUSAR");
        oculto(recusado, clienteSessao); oculto(recusado, profissionalSessao);
        Long cancelado = criar(); agir(cancelado, profissionalSessao, "ACEITAR");
        agir(cancelado, clienteSessao, "CANCELAR");
        oculto(cancelado, clienteSessao); oculto(cancelado, profissionalSessao);
    }
}
