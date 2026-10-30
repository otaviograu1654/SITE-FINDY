package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.*;
import br.com.projetointegrador.plataformaservicos.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/prestadores")
@Transactional
public class PrestadorController {
 private final JdbcTemplate banco;
 private final SessaoUsuario sessao;
 private final CadastroProfissionalService cadastro;
 public PrestadorController(JdbcTemplate banco,SessaoUsuario sessao,CadastroProfissionalService cadastro) {
  this.banco=banco; this.sessao=sessao; this.cadastro=cadastro;
 }
 public record DadosPessoais(@NotBlank @Size(max=100) String nome,
  @NotBlank @Size(max=20) String telefone,@NotBlank @Size(max=100) String bairro,
  @NotBlank @Size(max=100) String cidade,@NotBlank @Pattern(regexp="[A-Z]{2}") String estado) {}
 public record Cadastro(@NotNull @Valid DadosPessoais pessoa,@NotNull @Valid PrestadorDTO trabalho) {}
 @GetMapping("/habilidades")
 public Map<String,List<String>> habilidades() { return CadastroProfissionalService.CATALOGO; }
 @GetMapping("/me")
 public Map<String,Object> consultar(HttpServletRequest request) { return cadastro.perfil(proprio(sessao.exigir(request).getId()),false); }
 @PutMapping("/me/cadastro")
 public ResponseEntity<Map<String,Object>> cadastrar(@Valid @RequestBody Cadastro dados,HttpServletRequest request) {
  Long usuarioId=sessao.exigir(request).getId();
  var pessoa=dados.pessoa();
  banco.update("UPDATE usuarios SET nome=?,telefone=?,bairro=?,cidade=?,estado=? WHERE id=?",
   pessoa.nome().trim(),pessoa.telefone().trim(),pessoa.bairro().trim(),pessoa.cidade().trim(),pessoa.estado(),usuarioId);
  return salvar(usuarioId,dados.trabalho());
 }
 @PutMapping("/me")
 public ResponseEntity<Map<String,Object>> editar(@Valid @RequestBody PrestadorDTO dados,HttpServletRequest request) {
  return salvar(sessao.exigir(request).getId(),dados);
 }
 private ResponseEntity<Map<String,Object>> salvar(Long usuarioId,PrestadorDTO dados) {
  banco.queryForList("SELECT id FROM usuarios WHERE id=? FOR UPDATE",usuarioId);
  cadastro.exigirCompleto(usuarioId); cadastro.validarHabilidades(dados.habilidades());
  if (!dados.iniciante() && (dados.experiencia()==null || dados.experiencia().isBlank()))
   throw CadastroProfissionalService.erro("Conte sua experiência ou marque Estou começando agora.");
  List<Long> ids=banco.queryForList("SELECT id FROM prestadores WHERE usuario_id=? FOR UPDATE",Long.class,usuarioId);
  boolean novo=ids.isEmpty(); Long id;
  if (novo) id=banco.queryForObject("INSERT INTO prestadores(usuario_id) VALUES (?) RETURNING id",Long.class,usuarioId);
  else { id=ids.getFirst(); cadastro.impedirRecusaDefinitiva(id); }
  banco.update("""
   UPDATE prestadores SET descricao_profissional=?,experiencia=?,regiao_atendimento=?,iniciante=?,
   status_aprovacao='PENDENTE',motivo_recusa=NULL,analisado_por=NULL,data_analise=NULL WHERE id=?
   """,dados.descricaoProfissional().trim(),dados.experiencia()==null?null:dados.experiencia().trim(),
   dados.regiaoAtendimento().trim(),dados.iniciante(),id);
  banco.update("DELETE FROM prestador_habilidades WHERE prestador_id=?",id);
  for (String habilidade:dados.habilidades()) banco.update("INSERT INTO prestador_habilidades VALUES (?,?)",id,habilidade);
  return ResponseEntity.status(novo?HttpStatus.CREATED:HttpStatus.OK).body(cadastro.perfil(id,false));
 }
 @PatchMapping("/me/ativacao")
 public Map<String,Object> ativacao(@Valid @RequestBody AtivacaoPrestadorDTO dados,HttpServletRequest request) {
  Long usuarioId=sessao.exigir(request).getId(); Long id=proprio(usuarioId);
  banco.queryForList("SELECT id FROM prestadores WHERE id=? FOR UPDATE",id);
  cadastro.impedirRecusaDefinitiva(id);
  if (dados.ativo()) {
   cadastro.exigirCompleto(usuarioId);
   cadastro.validarHabilidades(banco.queryForList("SELECT habilidade FROM prestador_habilidades WHERE prestador_id=?",String.class,id));
   banco.update("UPDATE prestadores SET ativo=true,status_aprovacao='PENDENTE',motivo_recusa=NULL,analisado_por=NULL,data_analise=NULL WHERE id=? AND NOT ativo",id);
  } else banco.update("UPDATE prestadores SET ativo=false WHERE id=?",id);
  return cadastro.perfil(id,false);
 }
 @GetMapping("/{id}")
 public Map<String,Object> publico(@PathVariable Long id) { return cadastro.perfil(id,true); }
 private Long proprio(Long usuarioId) {
  List<Long> ids=banco.queryForList("SELECT id FROM prestadores WHERE usuario_id=?",Long.class,usuarioId);
  if(ids.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Perfil profissional ainda não criado.");
  return ids.getFirst();
 }
}
