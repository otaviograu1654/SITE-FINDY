package br.com.projetointegrador.plataformaservicos;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
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

@SpringBootTest @AutoConfigureMockMvc @Transactional
class CadastroProfissionalTests {
 @Autowired MockMvc mvc; @Autowired UsuarioRepository usuarios; @Autowired JdbcTemplate banco;
 @Autowired EntityManager entidades;
 Usuario dono,admin; MockHttpSession sessao,administrativa;
 static final String TRABALHO="""
  {"descricaoProfissional":"Faço pequenos reparos", "experiencia":"Aprendi em reformas",
   "regiaoAtendimento":"Região reservada", "iniciante":true,
   "habilidades":["Construção Civil: Tirar nível","Construção Civil: Assentar piso"]}
  """;
 @BeforeEach void preparar(){
  dono=usuario("Dono","USUARIO");admin=usuario("Admin","ADMIN");
  sessao=sessao(dono);administrativa=sessao(admin);
 }
 Usuario usuario(String nome,String papel){
  Usuario u=new Usuario();u.setNome(nome);u.setEmail(UUID.randomUUID()+"@example.invalid");
  u.setSenhaHash("hash-teste");u.setPapel(papel);u.setTelefone("34999999999");
  u.setBairro("Centro");u.setCidade("Patos de Minas");u.setEstado("MG");
  u.setFoto("https://example.invalid/foto.jpg");return usuarios.saveAndFlush(u);
 }
 MockHttpSession sessao(Usuario u){MockHttpSession s=new MockHttpSession();s.setAttribute("usuarioId",u.getId());s.setAttribute("senhaDaSessao",u.getSenhaHash());return s;}
 Long criar() throws Exception {
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.habilidades.length()").value(2));
  return banco.queryForObject("SELECT id FROM prestadores WHERE usuario_id=?",Long.class,dono.getId());
 }
 void analisar(Long id,String decisao,String motivo) throws Exception {
  mvc.perform(patch("/admin/prestadores/"+id+"/analise").session(administrativa)
   .contentType(MediaType.APPLICATION_JSON).content("{\"decisao\":\""+decisao+"\",\"motivo\":\""+motivo+"\"}"))
   .andExpect(status().isNoContent());
 }
 @Test void exigeFotoEContatoInclusiveNaApiAntiga() throws Exception {
  banco.update("UPDATE usuarios SET foto=NULL WHERE id=?",dono.getId());entidades.clear();
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO)).andExpect(status().isBadRequest());
  banco.update("UPDATE usuarios SET foto='https://example.invalid/foto.jpg',telefone='123' WHERE id=?",dono.getId());entidades.clear();
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO)).andExpect(status().isBadRequest());
  assertThat(banco.queryForObject("SELECT COUNT(*) FROM prestadores WHERE usuario_id=?",Integer.class,dono.getId())).isZero();
 }
 @Test void rejeitaHabilidadeInventadaOuDuplicada() throws Exception {
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO.replace("Tirar nível","Inventada"))).andExpect(status().isBadRequest());
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO.replace("Assentar piso","Tirar nível"))).andExpect(status().isBadRequest());
 }
 @Test void iniciantePodeEnviarSemExperienciaMasExperienteNao() throws Exception {
  String dados=TRABALHO.replace("Aprendi em reformas","");
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(dados.replace("true","false"))).andExpect(status().isBadRequest());
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(dados)).andExpect(status().isCreated());
 }
 @Test void cadastroUnificadoSalvaPessoaETrabalho() throws Exception {
  String dados="""
   {"pessoa":{"nome":"Nome atualizado","telefone":"34988888888","bairro":"Jardim",
   "cidade":"Patos de Minas","estado":"MG"},"trabalho":%s}
   """.formatted(TRABALHO);
  mvc.perform(put("/prestadores/me/cadastro").session(sessao).contentType(MediaType.APPLICATION_JSON).content(dados))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.bairro").value("Jardim"));
  assertThat(banco.queryForObject("SELECT nome FROM usuarios WHERE id=?",String.class,dono.getId())).isEqualTo("Nome atualizado");
 }
 @Test void correcaoPermiteReenvioEPreservaHistorico() throws Exception {
  Long id=criar();analisar(id,"CORRECAO_SOLICITADA","Detalhe sua experiência");
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO))
   .andExpect(status().isOk()).andExpect(jsonPath("$.statusAprovacao").value("PENDENTE"))
   .andExpect(jsonPath("$.historico[0].motivo").value("Detalhe sua experiência"));
  analisar(id,"APROVADO","");
  mvc.perform(get("/admin/prestadores/"+id+"/ficha").session(administrativa)).andExpect(status().isOk()).andExpect(jsonPath("$.historico.length()").value(2));
 }
 @Test void exigeAdminEMotivo() throws Exception {
  Long id=criar();
  mvc.perform(get("/admin/prestadores/"+id+"/ficha").session(sessao)).andExpect(status().isForbidden());
  mvc.perform(patch("/admin/prestadores/"+id+"/analise").session(administrativa).contentType(MediaType.APPLICATION_JSON)
   .content("{\"decisao\":\"CORRECAO_SOLICITADA\",\"motivo\":\"  \"}")).andExpect(status().isBadRequest());
  assertThat(banco.queryForObject("SELECT COUNT(*) FROM analises_prestadores WHERE prestador_id=?",Integer.class,id)).isZero();
 }
 @Test void recusaDefinitivaBloqueiaReenvioEReativacaoMasPreservaConta() throws Exception {
  Long id=criar();analisar(id,"RECUSADO_DEFINITIVO","Fora do escopo");
  mvc.perform(put("/prestadores/me").session(sessao).contentType(MediaType.APPLICATION_JSON).content(TRABALHO)).andExpect(status().isConflict());
  mvc.perform(patch("/prestadores/me/ativacao").session(sessao).contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}")).andExpect(status().isConflict());
  mvc.perform(patch("/admin/prestadores/"+id+"/ativacao").session(administrativa).contentType(MediaType.APPLICATION_JSON).content("{\"ativo\":true}")).andExpect(status().isConflict());
  mvc.perform(get("/perfil").session(sessao)).andExpect(status().isOk());
  mvc.perform(get("/prestadores/"+id)).andExpect(status().isNotFound());
 }
 @Test void publicoExpoeHabilidadesEBairroSemDadosReservados() throws Exception {
  Long id=criar();analisar(id,"APROVADO","");
  mvc.perform(get("/prestadores/"+id)).andExpect(status().isOk())
   .andExpect(jsonPath("$.bairro").value("Centro")).andExpect(jsonPath("$.habilidades.length()").value(2))
   .andExpect(jsonPath("$.email").doesNotExist()).andExpect(jsonPath("$.telefone").doesNotExist())
   .andExpect(jsonPath("$.regiaoAtendimento").doesNotExist()).andExpect(jsonPath("$.historico").doesNotExist());
 }
}
