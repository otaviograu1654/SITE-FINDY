// Exercita cadastro até resposta ao pedido pela API e preserva todos os registros de teste.
package br.com.projetointegrador.plataformaservicos;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class FluxoMvpTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate banco;
    final String rodada = UUID.randomUUID().toString();
    // Credencial sintética exclusiva do banco de testes, não pertence a pessoa real.
    final String senha = "TesteFluxo123!";
    Long servico;

    Long cadastrar(String papel) throws Exception {
        String email = papel + "." + rodada + "@example.invalid";
        mvc.perform(post("/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
                {"nome":"Fluxo MVP %s %s","email":"%s","senha":"%s"}
                """.formatted(papel, rodada, email, senha))).andExpect(status().isCreated());
        return banco.queryForObject("SELECT id FROM usuarios WHERE email=?", Long.class, email);
    }

    MockHttpSession entrar(String papel) throws Exception {
        return (MockHttpSession) mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + papel + "." + rodada + "@example.invalid\",\"senha\":\"" + senha + "\"}"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    Long solicitar(Long cliente, MockHttpSession sessao) throws Exception {
        mvc.perform(post("/solicitacoes").session(sessao).contentType(MediaType.APPLICATION_JSON).content("""
                {"servicoId":%d,"dataInicio":"%s","quantidade":1,"endereco":"Rua fluxo teste, 10",
                "bairro":"Centro","cidade":"Patos de Minas","estado":"MG","mensagem":"Preciso de um site"}
                """.formatted(servico, OffsetDateTime.now().plusDays(3))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.contatosLiberados").value(false))
                .andExpect(jsonPath("$.telefoneProfissional").doesNotExist())
                .andExpect(jsonPath("$.endereco").doesNotExist())
                .andExpect(jsonPath("$.estimativaMinima").value(100))
                .andExpect(jsonPath("$.estimativaMaxima").value(500));
        return banco.queryForObject("SELECT MAX(id) FROM solicitacoes WHERE cliente_id=?", Long.class, cliente);
    }

    void agir(Long id, MockHttpSession sessao, String acao, int esperado) throws Exception {
        mvc.perform(patch("/solicitacoes/" + id + "/situacao").session(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acao\":\"" + acao + "\"}"))
                .andExpect(status().is(esperado));
    }

    @Test void cadastroPublicacaoContratacaoERespostasPersistemEntreRequisicoes() throws Exception {
        assertThat(banco.queryForObject("SELECT current_database()", String.class))
                .isEqualTo("findy_cadastro_test_20261028");
        Long cliente = cadastrar("cliente"), prestador = cadastrar("prestador"), admin = cadastrar("admin");
        // Promoção exclusivamente da conta sintética desta rodada no banco separado.
        banco.update("UPDATE usuarios SET papel='ADMIN' WHERE id=?", admin);
        var clienteSessao = entrar("cliente"); var prestadorSessao = entrar("prestador"); var adminSessao = entrar("admin");
        mvc.perform(get("/auth/me").session(clienteSessao)).andExpect(jsonPath("$.id").value(cliente));
        mvc.perform(get("/admin/me").session(clienteSessao)).andExpect(status().isForbidden());
        mvc.perform(get("/admin/me").session(adminSessao)).andExpect(status().isOk());
        mvc.perform(put("/perfil").session(clienteSessao).contentType(MediaType.APPLICATION_JSON).content("""
                {"nome":"Fluxo MVP cliente","telefone":"34999999999","cidade":"Patos de Minas","bairro":"Centro","estado":"MG"}
                """)).andExpect(status().isOk());

        var foto = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "png", foto);
        mvc.perform(multipart("/fotos/me").file(new MockMultipartFile("foto", "teste.png", "image/png", foto.toByteArray()))
                .session(prestadorSessao)).andExpect(status().isOk());
        mvc.perform(get("/fotos/" + prestador)).andExpect(status().isOk());
        mvc.perform(put("/prestadores/me/cadastro").session(prestadorSessao).contentType(MediaType.APPLICATION_JSON).content("""
                {"pessoa":{"nome":"Fluxo MVP prestador %s","telefone":"34988888888","bairro":"Centro","cidade":"Patos de Minas","estado":"MG"},
                "trabalho":{"descricaoProfissional":"Criação de sites %s","iniciante":true,"regiaoAtendimento":"Patos de Minas",
                "habilidades":["Tecnologia e Design: Criação de sites"]}}
                """.formatted(rodada, rodada))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.statusAprovacao").value("PENDENTE"));
        Long perfil = banco.queryForObject("SELECT id FROM prestadores WHERE usuario_id=?", Long.class, prestador);
        Long categoria = banco.queryForObject("SELECT id FROM categorias WHERE nome='Tecnologia e Design'", Long.class);
        String oferta = """
                {"titulo":"Criação de sites %s","descricao":"Oferta de teste","categoriaId":%d,
                "preco":100,"precoMaximo":500,"unidadeCobranca":"SERVICO","ativo":true}
                """.formatted(rodada, categoria);
        mvc.perform(post("/meus-servicos").session(prestadorSessao).contentType(MediaType.APPLICATION_JSON).content(oferta))
                .andExpect(status().isCreated());
        servico = banco.queryForObject("SELECT MAX(id) FROM servicos WHERE prestador_id=?", Long.class, perfil);
        mvc.perform(get("/servicos").param("q", rodada)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/servicos/" + servico)).andExpect(status().isNotFound());
        mvc.perform(patch("/admin/prestadores/" + perfil + "/analise").session(adminSessao)
                .contentType(MediaType.APPLICATION_JSON).content("{\"decisao\":\"APROVADO\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/meus-servicos").session(prestadorSessao).contentType(MediaType.APPLICATION_JSON).content(oferta))
                .andExpect(status().isCreated());
        mvc.perform(get("/servicos").param("q", rodada).param("categoria", "Tecnologia e Design"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/prestadores/" + perfil)).andExpect(status().isOk())
                .andExpect(jsonPath("$.servicos.length()").value(2))
                .andExpect(jsonPath("$.telefone").doesNotExist()).andExpect(jsonPath("$.email").doesNotExist());

        Long pedido = solicitar(cliente, clienteSessao);
        mvc.perform(get("/solicitacoes").session(clienteSessao)).andExpect(jsonPath("$.itens[0].id").value(pedido));
        mvc.perform(get("/solicitacoes").param("tipo", "RECEBIDAS").session(prestadorSessao))
                .andExpect(jsonPath("$.itens[0].id").value(pedido));
        mvc.perform(get("/solicitacoes/" + pedido).session(adminSessao)).andExpect(status().isNotFound());
        agir(pedido, clienteSessao, "ACEITAR", 403);
        agir(pedido, prestadorSessao, "ACEITAR", 200);
        for (var s : new MockHttpSession[]{clienteSessao, prestadorSessao}) {
            mvc.perform(get("/solicitacoes/" + pedido).session(s)).andExpect(jsonPath("$.status").value("ACEITA"))
                    .andExpect(jsonPath("$.contatosLiberados").value(true))
                    .andExpect(jsonPath("$.telefoneCliente").value("34999999999"))
                    .andExpect(jsonPath("$.telefoneProfissional").value("34988888888"));
        }
        agir(pedido, prestadorSessao, "ACEITAR", 409);
        agir(pedido, clienteSessao, "CANCELAR", 200);
        mvc.perform(get("/solicitacoes/" + pedido).session(prestadorSessao))
                .andExpect(jsonPath("$.contatosLiberados").value(false)).andExpect(jsonPath("$.endereco").doesNotExist());
        Long recusado = solicitar(cliente, clienteSessao); agir(recusado, prestadorSessao, "RECUSAR", 200);
        agir(recusado, prestadorSessao, "ACEITAR", 409);
        Long aceito = solicitar(cliente, clienteSessao); agir(aceito, prestadorSessao, "ACEITAR", 200);
        assertThat(banco.queryForObject("SELECT COUNT(*) FROM solicitacoes WHERE cliente_id=?", Long.class, cliente)).isEqualTo(3);
        mvc.perform(post("/auth/logout").session(clienteSessao)).andExpect(status().isNoContent());
        mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
        // Nova sessão lê o estado persistido, sem depender da sessão anterior.
        mvc.perform(get("/solicitacoes/" + aceito).session(entrar("cliente")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACEITA"));
        System.out.println("FLUXO_MVP_OK rodada=" + rodada + " cliente=" + cliente + " prestador=" + prestador
                + " pedidos=" + pedido + "," + recusado + "," + aceito);
    }
}
