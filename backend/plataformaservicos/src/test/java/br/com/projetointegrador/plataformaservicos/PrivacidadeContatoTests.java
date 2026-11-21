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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
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

    @Test void clienteConcluiEAvaliaAposPrestadorIniciar() throws Exception {
        Long id = criar(); agir(id, profissionalSessao, "ACEITAR"); agir(id, profissionalSessao, "INICIAR");
        agir(id, clienteSessao, "CONCLUIR");
        mvc.perform(get("/solicitacoes/" + id).session(clienteSessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDA"))
                .andExpect(jsonPath("$.dataConclusao").isNotEmpty());
        mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(clienteSessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":5,\"comentario\":\"Bom serviço\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.avaliacao.nota").value(5));
        mvc.perform(get("/solicitacoes/" + id).session(profissionalSessao))
                .andExpect(jsonPath("$.avaliacao.comentario").value("Bom serviço"));
        Long perfil = banco.queryForObject("SELECT prestador_id FROM servicos WHERE id=?", Long.class, servicoId);
        mvc.perform(get("/prestadores/" + perfil)).andExpect(status().isOk())
                .andExpect(jsonPath("$.avaliacaoMedia").value(5.0))
                .andExpect(jsonPath("$.totalAvaliacoes").value(1))
                .andExpect(jsonPath("$.avaliacoes[0].cliente").value("Teste"))
                .andExpect(jsonPath("$.avaliacoes[0].email").doesNotExist());
        assertThat(banco.queryForObject("SELECT avaliado_id FROM avaliacoes WHERE solicitacao_id=?", Long.class, id))
                .isEqualTo(profissional.getId());
    }

    @Test void bloqueiaConclusaoAntesDoInicioEPermissoesIncorretas() throws Exception {
        Long id = criar();
        mudarComErro(id, clienteSessao, "INICIAR", 403);
        mudarComErro(id, clienteSessao, "CONCLUIR", 409);
        agir(id, profissionalSessao, "ACEITAR"); mudarComErro(id, clienteSessao, "CONCLUIR", 409);
        mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(clienteSessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":5}"))
                .andExpect(status().isConflict());
        agir(id, profissionalSessao, "INICIAR");
        mudarComErro(id, profissionalSessao, "CONCLUIR", 403);
        mudarComErro(id, clienteSessao, "CANCELAR", 409);
        mudarComErro(id, adminSessao, "CONCLUIR", 404);
        agir(id, clienteSessao, "CONCLUIR");
        mudarComErro(id, clienteSessao, "CONCLUIR", 409);
        mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(profissionalSessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":5}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(adminSessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":5}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/solicitacoes/" + id + "/avaliacao")
                .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":5}"))
                .andExpect(status().isUnauthorized());
        for (String nota : new String[]{"0", "6", "null"}) {
            mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(clienteSessao)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":" + nota + "}"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(clienteSessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":5,\"comentario\":\"" + "x".repeat(1001) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void duasAvaliacoesSimultaneasGeramSomenteUmaNota() throws Exception {
        Long id = criar(); agir(id, profissionalSessao, "ACEITAR"); agir(id, profissionalSessao, "INICIAR"); agir(id, clienteSessao, "CONCLUIR");
        var primeira = CompletableFuture.supplyAsync(() -> enviarNota(id));
        var segunda = CompletableFuture.supplyAsync(() -> enviarNota(id));
        assertThat(new int[]{primeira.get(15, TimeUnit.SECONDS), segunda.get(15, TimeUnit.SECONDS)})
                .containsExactlyInAnyOrder(201, 409);
        assertThat(banco.queryForObject("SELECT COUNT(*) FROM avaliacoes WHERE solicitacao_id=?", Long.class, id)).isEqualTo(1);
    }

    void mudarComErro(Long id, MockHttpSession sessao, String acao, int codigo) throws Exception {
        mvc.perform(patch("/solicitacoes/" + id + "/situacao").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acao\":\"" + acao + "\"}"))
                .andExpect(status().is(codigo));
    }

    int enviarNota(Long id) {
        try {
            return mvc.perform(post("/solicitacoes/" + id + "/avaliacao").session(sessao(cliente))
                    .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":4}"))
                    .andReturn().getResponse().getStatus();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    @Test void sininhoContaSomentePedidosPendentesDoDestinatario() throws Exception {
        Long id=criar();
        mvc.perform(get("/solicitacoes/pendentes/resumo")).andExpect(status().isUnauthorized());
        mvc.perform(get("/solicitacoes/pendentes/resumo").session(clienteSessao)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/solicitacoes/pendentes/resumo").session(profissionalSessao)).andExpect(jsonPath("$.total").value(1));
        agir(id,profissionalSessao,"ACEITAR");
        mvc.perform(get("/solicitacoes/pendentes/resumo").session(profissionalSessao)).andExpect(jsonPath("$.total").value(0));
    }

    @Test void portfolioValidaFotosPermissoesPublicacaoELimiteSemApagarRegistros() throws Exception {
        var original=new java.awt.image.BufferedImage(1400,700,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var saida=new java.io.ByteArrayOutputStream(); javax.imageio.ImageIO.write(original,"png",saida);
        var foto=new org.springframework.mock.web.MockMultipartFile("foto","trabalho.png","image/png",saida.toByteArray());
        Long perfil=banco.queryForObject("SELECT id FROM prestadores WHERE usuario_id=?",Long.class,profissional.getId());
        banco.update("UPDATE prestadores SET status_aprovacao='PENDENTE' WHERE id=?",perfil);
        mvc.perform(multipart("/portfolio/me").file(foto)).andExpect(status().isUnauthorized());
        mvc.perform(multipart("/portfolio/me").file(new org.springframework.mock.web.MockMultipartFile("foto","x.svg","image/png","<svg/>".getBytes())).session(profissionalSessao))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(multipart("/portfolio/me").file(new org.springframework.mock.web.MockMultipartFile("foto","grande.png","image/png",new byte[2097153])).session(profissionalSessao))
                .andExpect(status().isPayloadTooLarge());
        for(int n=0;n<10;n++) mvc.perform(multipart("/portfolio/me").file(foto).param("legenda","Trabalho de teste "+n).session(profissionalSessao))
                .andExpect(status().isCreated());
        Long id=banco.queryForObject("SELECT MIN(id) FROM portfolio_prestadores WHERE prestador_id=?",Long.class,perfil);
        String imagem="/portfolio/fotos/"+id;
        mvc.perform(get(imagem)).andExpect(status().isNotFound());
        mvc.perform(get("/portfolio/prestadores/"+perfil)).andExpect(status().isNotFound());
        byte[] bytes=mvc.perform(get(imagem).session(profissionalSessao)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes)).getWidth()).isEqualTo(1200);
        mvc.perform(get("/portfolio/me").session(profissionalSessao)).andExpect(jsonPath("$.length()").value(10));
        mvc.perform(multipart("/portfolio/me").file(foto).session(profissionalSessao)).andExpect(status().isConflict());
        mvc.perform(delete("/portfolio/me/"+id).session(clienteSessao)).andExpect(status().isNotFound());
        banco.update("UPDATE prestadores SET status_aprovacao='APROVADO' WHERE id=?",perfil);
        mvc.perform(get(imagem)).andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options","nosniff"));
        mvc.perform(get("/portfolio/prestadores/"+perfil)).andExpect(jsonPath("$.length()").value(10));
        mvc.perform(delete("/portfolio/me/"+id).session(profissionalSessao)).andExpect(status().isNoContent());
        mvc.perform(get(imagem)).andExpect(status().isNotFound());
        assertThat(banco.queryForObject("SELECT ativo FROM portfolio_prestadores WHERE id=?",Boolean.class,id)).isFalse();
        mvc.perform(multipart("/portfolio/me").file(foto).session(profissionalSessao)).andExpect(status().isCreated());
        assertThat(banco.queryForObject("SELECT status_aprovacao FROM prestadores WHERE id=?",String.class,perfil)).isEqualTo("APROVADO");
    }
}
