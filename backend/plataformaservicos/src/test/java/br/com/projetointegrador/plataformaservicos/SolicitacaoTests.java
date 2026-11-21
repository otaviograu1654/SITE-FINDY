// Testa pedidos, faixas de preço, privacidade e concorrência em banco separado.
package br.com.projetointegrador.plataformaservicos;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SolicitacaoTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate banco;
    @Autowired UsuarioRepository usuarios;
    Usuario cliente, profissional, estranho;
    MockHttpSession clienteSessao, profissionalSessao, estranhoSessao;
    Long prestadorId, servicoId, categoriaId;
    String inicio;

    @BeforeEach void preparar() {
        cliente = conta(); profissional = conta(); estranho = conta();
        clienteSessao = sessao(cliente); profissionalSessao = sessao(profissional); estranhoSessao = sessao(estranho);
        categoriaId = banco.queryForObject("SELECT MIN(id) FROM categorias", Long.class);
        prestadorId = banco.queryForObject("INSERT INTO prestadores(usuario_id,status_aprovacao) VALUES (?,'APROVADO') RETURNING id",
                Long.class, profissional.getId());
        servicoId = banco.queryForObject("""
                INSERT INTO servicos(prestador_id,categoria_id,titulo,preco,preco_maximo,unidade_cobranca)
                VALUES (?,?,'Serviço de teste',100,500,'SERVICO') RETURNING id
                """, Long.class, prestadorId, categoriaId);
        inicio = OffsetDateTime.now().plusDays(3).toString();
    }

    Usuario conta() {
        Usuario u = new Usuario(); u.setNome("Conta de teste");
        u.setEmail(UUID.randomUUID() + "@example.invalid"); u.setSenhaHash("hash-teste");
        u.setTelefone("34999999999"); return usuarios.saveAndFlush(u);
    }

    MockHttpSession sessao(Usuario u) {
        MockHttpSession s = new MockHttpSession(); s.setAttribute("usuarioId", u.getId());
        s.setAttribute("senhaDaSessao", u.getSenhaHash()); return s;
    }

    String dados(String quantidade) {
        return """
                {"servicoId":%d,"dataInicio":"%s","quantidade":%s,
                "endereco":"Rua de teste, 10","bairro":"Centro","cidade":"Patos de Minas",
                "estado":"MG","mensagem":"Preciso de um orçamento"}
                """.formatted(servicoId, inicio, quantidade);
    }

    Long criar() throws Exception {
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isCreated());
        return banco.queryForObject("SELECT MAX(id) FROM solicitacoes WHERE cliente_id=?", Long.class, cliente.getId());
    }

    void agir(Long id, MockHttpSession s, String acao, int codigo) throws Exception {
        mvc.perform(patch("/solicitacoes/" + id + "/situacao").session(s)
                .contentType(MediaType.APPLICATION_JSON).content("{\"acao\":\"" + acao + "\"}"))
                .andExpect(status().is(codigo));
    }

    @Test void exigeLoginEmTodasAsRotas() throws Exception {
        mvc.perform(post("/solicitacoes").contentType(MediaType.APPLICATION_JSON).content(dados("1")))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/solicitacoes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/solicitacoes/1")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/solicitacoes/1/situacao").contentType(MediaType.APPLICATION_JSON)
                .content("{\"acao\":\"ACEITAR\"}")).andExpect(status().isUnauthorized());
    }

    @Test void consultaOfertaPeloIdSemExporContatoENaoMostraIndisponivel() throws Exception {
        mvc.perform(get("/servicos/" + servicoId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.servico_id").value(servicoId))
                .andExpect(jsonPath("$.prestador_id").value(prestadorId))
                .andExpect(jsonPath("$.preco_maximo").value(500))
                .andExpect(jsonPath("$.telefone").doesNotExist())
                .andExpect(jsonPath("$.email").doesNotExist());
        banco.update("UPDATE prestadores SET status_aprovacao='PENDENTE' WHERE id=?", prestadorId);
        mvc.perform(get("/servicos/" + servicoId)).andExpect(status().isNotFound());
    }

    @Test void catalogoMostraUmProfissionalMesmoComDuasOfertasNaMesmaCategoria() throws Exception {
        String termo = "catalogo-" + UUID.randomUUID();
        banco.update("UPDATE servicos SET titulo=? WHERE id=?", termo, servicoId);
        banco.update("UPDATE prestadores SET descricao_profissional='Apresentação do profissional' WHERE id=?", prestadorId);
        banco.update("INSERT INTO servicos(prestador_id,categoria_id,titulo) VALUES (?,?,?)",
                prestadorId,categoriaId,termo + " segunda oferta");
        mvc.perform(get("/servicos").param("q", termo)).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.itens.length()").value(1))
                .andExpect(jsonPath("$.itens[0].prestador_id").value(prestadorId))
                .andExpect(jsonPath("$.itens[0].descricao").value("Apresentação do profissional"))
                .andExpect(jsonPath("$.itens[0].preco").doesNotExist())
                .andExpect(jsonPath("$.itens[0].servico_id").doesNotExist());
        mvc.perform(get("/prestadores/" + prestadorId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.servicos.length()").value(2));
        mvc.perform(get("/servicos/" + servicoId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.preco").value(100));
    }

    @Test void catalogoMantemFiltroDaCategoriaEBloqueiaOfertasOuPerfisIndisponiveis() throws Exception {
        String termo = "catalogo-" + UUID.randomUUID();
        Long outra = banco.queryForObject("SELECT MIN(id) FROM categorias WHERE id<>?",Long.class,categoriaId);
        String categoria = banco.queryForObject("SELECT nome FROM categorias WHERE id=?",String.class,categoriaId);
        String outraCategoria = banco.queryForObject("SELECT nome FROM categorias WHERE id=?",String.class,outra);
        banco.update("UPDATE servicos SET titulo=? WHERE id=?",termo,servicoId);
        banco.update("INSERT INTO servicos(prestador_id,categoria_id,titulo) VALUES (?,?,?)",prestadorId,outra,termo);
        for (String filtro : new String[]{categoria,outraCategoria,""})
            mvc.perform(get("/servicos").param("q",termo).param("categoria",filtro))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        banco.update("UPDATE servicos SET ativo=false WHERE id=?",servicoId);
        mvc.perform(get("/servicos").param("q",termo).param("categoria",categoria))
                .andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/servicos").param("q",termo).param("categoria",outraCategoria))
                .andExpect(jsonPath("$.total").value(1));
        banco.update("UPDATE prestadores SET status_aprovacao='PENDENTE' WHERE id=?",prestadorId);
        mvc.perform(get("/servicos").param("q",termo)).andExpect(jsonPath("$.total").value(0));
    }

    @Test void paginacaoDoCatalogoContaProfissionaisEmVezDasOfertas() throws Exception {
        String termo = "catalogo-" + UUID.randomUUID();
        banco.update("UPDATE servicos SET titulo=? WHERE id=?",termo,servicoId);
        banco.update("INSERT INTO servicos(prestador_id,categoria_id,titulo) VALUES (?,?,?)",prestadorId,categoriaId,termo);
        for (int i=0;i<12;i++) {
            Usuario u = conta();
            Long p = banco.queryForObject("INSERT INTO prestadores(usuario_id,status_aprovacao) VALUES (?,'APROVADO') RETURNING id",
                    Long.class,u.getId());
            for(int j=0;j<2;j++) banco.update("INSERT INTO servicos(prestador_id,categoria_id,titulo) VALUES (?,?,?)",p,categoriaId,termo);
        }
        mvc.perform(get("/servicos").param("q",termo)).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(13)).andExpect(jsonPath("$.totalPaginas").value(2))
                .andExpect(jsonPath("$.itens.length()").value(12));
        mvc.perform(get("/servicos").param("q",termo).param("pagina","2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.itens.length()").value(1));
    }

    @Test void salvaPendenteComFaixaSemCobrarNemConfiarNoNavegador() throws Exception {
        String json = dados("1").trim().replaceFirst("\\}$",
                ",\"total\":0.01,\"taxa\":99,\"clienteId\":" + estranho.getId() + ",\"status\":\"ACEITA\"}");
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.clienteId").value(cliente.getId()))
                .andExpect(jsonPath("$.estimativaMinima").value(100))
                .andExpect(jsonPath("$.estimativaMaxima").value(500))
                .andExpect(jsonPath("$.total").isEmpty()).andExpect(jsonPath("$.taxa").value(0));
    }

    @Test void preservaFaixaAntigaQuandoServicoMuda() throws Exception {
        Long id = criar(); banco.update("UPDATE servicos SET preco=200,preco_maximo=800 WHERE id=?", servicoId);
        mvc.perform(get("/solicitacoes/" + id).session(clienteSessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.valorUnitario").value(100))
                .andExpect(jsonPath("$.valorUnitarioMaximo").value(500));
    }

    @Test void semPrecoNaoInventaEstimativa() throws Exception {
        banco.update("UPDATE servicos SET preco=NULL,preco_maximo=NULL WHERE id=?", servicoId);
        Long id = criar();
        mvc.perform(get("/solicitacoes/" + id).session(clienteSessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.estimativaMinima").isEmpty())
                .andExpect(jsonPath("$.estimativaMaxima").isEmpty()).andExpect(jsonPath("$.total").isEmpty());
    }

    @Test void calculaHorasFracionadasEDiariasSemInventarConversao() throws Exception {
        banco.update("UPDATE servicos SET unidade_cobranca='HORA' WHERE id=?", servicoId);
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1.5"))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.estimativaMinima").value(150))
                .andExpect(jsonPath("$.estimativaMaxima").value(750));
        banco.update("UPDATE servicos SET unidade_cobranca='DIARIA' WHERE id=?", servicoId);
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1.5"))).andExpect(status().isBadRequest());
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("2"))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.estimativaMaxima").value(1000));
    }

    @Test void validaDataEnderecoQuantidadeEUnidade() throws Exception {
        for (String json : new String[]{dados("0"),dados("2"),dados("1").replace(inicio, OffsetDateTime.now().minusDays(1).toString()),
                dados("1").replace("Rua de teste, 10", "   "),dados("1").replace("\"MG\"", "\"XX1\"")}) {
            mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                    .content(json)).andExpect(status().isBadRequest());
        }
    }

    @Test void naoPermiteContratarProprioServico() throws Exception {
        mvc.perform(post("/solicitacoes").session(profissionalSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isBadRequest());
    }

    @Test void exigeTelefoneDoClienteParaNegociar() throws Exception {
        banco.update("UPDATE usuarios SET telefone=NULL WHERE id=?", cliente.getId());
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isBadRequest());
        assertThat(banco.queryForObject("SELECT COUNT(*) FROM solicitacoes WHERE cliente_id=?",
                Integer.class, cliente.getId())).isZero();
    }

    @Test void bloqueiaServicoContaOuPerfilIndisponivel() throws Exception {
        banco.update("UPDATE servicos SET ativo=false WHERE id=?", servicoId);
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isNotFound());
        banco.update("UPDATE servicos SET ativo=true WHERE id=?", servicoId);
        banco.update("UPDATE prestadores SET status_aprovacao='PENDENTE' WHERE id=?", prestadorId);
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isNotFound());
        banco.update("UPDATE prestadores SET status_aprovacao='APROVADO',ativo=false WHERE id=?", prestadorId);
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isNotFound());
        banco.update("UPDATE prestadores SET ativo=true WHERE id=?", prestadorId);
        banco.update("UPDATE usuarios SET ativo=false WHERE id=?", profissional.getId());
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("1"))).andExpect(status().isNotFound());
    }

    @Test void listaSomenteEnviadosOuRecebidosDoUsuario() throws Exception {
        Long id = criar();
        mvc.perform(get("/solicitacoes").session(clienteSessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.itens[0].id").value(id))
                .andExpect(jsonPath("$.itens[0].endereco").doesNotExist());
        mvc.perform(get("/solicitacoes?tipo=RECEBIDAS").session(profissionalSessao))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/solicitacoes").session(estranhoSessao)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/solicitacoes?tipo=RECEBIDAS").session(estranhoSessao)).andExpect(jsonPath("$.total").value(0));
    }

    @Test void protegeDetalhesEAcoesInclusiveContraAdminNaoParticipante() throws Exception {
        Long id = criar(); banco.update("UPDATE usuarios SET papel='ADMIN' WHERE id=?", estranho.getId());
        mvc.perform(get("/solicitacoes/" + id).session(estranhoSessao)).andExpect(status().isNotFound());
        agir(id, estranhoSessao, "ACEITAR", 404);
        mvc.perform(get("/solicitacoes/" + id).session(profissionalSessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.contatosLiberados").value(false))
                .andExpect(jsonPath("$.endereco").doesNotExist());
        agir(id, profissionalSessao, "ACEITAR", 200);
        mvc.perform(get("/solicitacoes/" + id).session(profissionalSessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.endereco").value("Rua de teste, 10"));
    }

    @Test void somenteProfissionalAceitaOuRecusaESomenteClienteCancela() throws Exception {
        Long id = criar(); agir(id, clienteSessao, "ACEITAR", 403); agir(id, clienteSessao, "RECUSAR", 403);
        agir(id, profissionalSessao, "CANCELAR", 403); agir(id, profissionalSessao, "ACEITAR", 200);
        agir(id, profissionalSessao, "RECUSAR", 409); agir(id, clienteSessao, "CANCELAR", 200);
        agir(id, profissionalSessao, "ACEITAR", 409);
        assertThat(banco.queryForObject("SELECT status FROM solicitacoes WHERE id=?",String.class,id)).isEqualTo("CANCELADA");
    }

    @Test void recusaEImpedeReabrirPedidoEncerrado() throws Exception {
        Long id = criar(); agir(id, profissionalSessao, "RECUSAR", 200);
        agir(id, profissionalSessao, "ACEITAR", 409); agir(id, clienteSessao, "CANCELAR", 409);
        agir(id, clienteSessao, "CONCLUIR", 409);
    }

    @Test void cancelaPendenteEBloqueiaAcoesAposHorario() throws Exception {
        agir(criar(), clienteSessao, "CANCELAR", 200);
        Long id = criar(); banco.update("UPDATE solicitacoes SET data_inicio=now()-interval '1 hour' WHERE id=?",id);
        agir(id, profissionalSessao, "ACEITAR", 409); agir(id, clienteSessao, "CANCELAR", 409);
        agir(id, profissionalSessao, "RECUSAR", 200);
    }

    @Test void naoAceitaPedidoSePerfilFoiDesativadoDepois() throws Exception {
        Long id = criar(); banco.update("UPDATE prestadores SET ativo=false WHERE id=?", prestadorId);
        agir(id, profissionalSessao, "ACEITAR", 409);
        mvc.perform(get("/solicitacoes/" + id).session(clienteSessao)).andExpect(status().isOk());
    }

    @Test void paginaResultadosEValidaFiltros() throws Exception {
        for (int i=0;i<21;i++) criar();
        mvc.perform(get("/solicitacoes").session(clienteSessao)).andExpect(jsonPath("$.itens.length()").value(20))
                .andExpect(jsonPath("$.total").value(21)).andExpect(jsonPath("$.totalPaginas").value(2));
        mvc.perform(get("/solicitacoes?pagina=2").session(clienteSessao)).andExpect(jsonPath("$.itens.length()").value(1));
        mvc.perform(get("/solicitacoes?pagina=0").session(clienteSessao)).andExpect(status().isBadRequest());
        mvc.perform(get("/solicitacoes?tipo=TODAS").session(clienteSessao)).andExpect(status().isBadRequest());
    }

    @Test void validaFaixaDePrecoNoCadastroDeServicoEPreservaCompatibilidade() throws Exception {
        String dados = """
                {"titulo":"Reparo","categoriaId":%d,"preco":100,"precoMaximo":500,
                 "unidadeCobranca":"SERVICO","ativo":true}
                """.formatted(categoriaId);
        mvc.perform(post("/meus-servicos").session(profissionalSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados)).andExpect(status().isCreated());
        mvc.perform(post("/meus-servicos").session(profissionalSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados.replace("\"precoMaximo\":500", "\"precoMaximo\":50"))).andExpect(status().isBadRequest());
        mvc.perform(post("/meus-servicos").session(profissionalSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados.replace("\"preco\":100", "\"preco\":null"))).andExpect(status().isBadRequest());
        mvc.perform(post("/meus-servicos").session(profissionalSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados.replace(",\"precoMaximo\":500", ""))).andExpect(status().isCreated());
        mvc.perform(get("/meus-servicos").session(profissionalSessao)).andExpect(jsonPath("$[0].preco_maximo").isEmpty());
    }

    @Test void limitaEstimativaSemEstourarTipoDoBanco() throws Exception {
        banco.update("UPDATE servicos SET preco=99999999.99,preco_maximo=99999999.99,unidade_cobranca='HORA' WHERE id=?",servicoId);
        mvc.perform(post("/solicitacoes").session(clienteSessao).contentType(MediaType.APPLICATION_JSON)
                .content(dados("2"))).andExpect(status().isBadRequest());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void duasAceitacoesConcorrentesNaoSobrescrevemSituacao() throws Exception {
        try {
            Long id = criar();
            var primeira = CompletableFuture.supplyAsync(() -> aceitar(id));
            var segunda = CompletableFuture.supplyAsync(() -> aceitar(id));
            assertThat(new int[]{primeira.get(15,TimeUnit.SECONDS),segunda.get(15,TimeUnit.SECONDS)})
                    .containsExactlyInAnyOrder(200,409);
            // Releitura em outra requisição, fora de qualquer transação do teste.
            mvc.perform(get("/solicitacoes/"+id).session(clienteSessao)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACEITA"));
        } finally {
            banco.update("DELETE FROM solicitacoes WHERE servico_id=?",servicoId);
            banco.update("DELETE FROM servicos WHERE prestador_id=?",prestadorId);
            banco.update("DELETE FROM prestadores WHERE id=?",prestadorId);
            for(Usuario u: new Usuario[]{cliente,profissional,estranho})
                banco.update("DELETE FROM usuarios WHERE id=? AND email=?",u.getId(),u.getEmail());
        }
    }

    int aceitar(Long id) {
        try {
            return mvc.perform(patch("/solicitacoes/"+id+"/situacao").session(sessao(profissional))
                    .contentType(MediaType.APPLICATION_JSON).content("{\"acao\":\"ACEITAR\"}"))
                    .andReturn().getResponse().getStatus();
        } catch(Exception e) { throw new IllegalStateException(e); }
    }
}
