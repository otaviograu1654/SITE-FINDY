package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.service.ImagemService;
import br.com.projetointegrador.plataformaservicos.service.SessaoUsuario;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/portfolio")
public class PortfolioController {
    private final JdbcTemplate banco;
    private final SessaoUsuario sessao;
    private final ImagemService imagens;
    private static final String CAMPOS = "SELECT id, legenda, '/portfolio/fotos/' || id AS foto FROM portfolio_prestadores ";
    public PortfolioController(JdbcTemplate banco, SessaoUsuario sessao, ImagemService imagens) {
        this.banco=banco; this.sessao=sessao; this.imagens=imagens;
    }
    private Long perfil(HttpServletRequest request, boolean travar) {
        var ids=banco.queryForList("SELECT id FROM prestadores WHERE usuario_id=?" + (travar ? " FOR UPDATE" : ""),
                Long.class, sessao.exigir(request).getId());
        if(ids.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Crie seu cadastro profissional antes de enviar fotos.");
        return ids.getFirst();
    }
    @GetMapping("/me")
    public List<Map<String,Object>> minhas(HttpServletRequest request) {
        return banco.queryForList(CAMPOS+"WHERE prestador_id=? AND ativo ORDER BY id DESC", perfil(request,false));
    }
    @PostMapping(path="/me", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<Map<String,Object>> enviar(@RequestParam("foto") MultipartFile foto,
            @RequestParam(defaultValue="") String legenda, HttpServletRequest request) {
        Long perfil=perfil(request,true);
        if(legenda.length()>160) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A legenda deve ter até 160 caracteres.");
        String status=banco.queryForObject("SELECT status_aprovacao FROM prestadores WHERE id=?",String.class,perfil);
        if("RECUSADO_DEFINITIVO".equals(status)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Perfil rejeitado definitivamente.");
        Integer total=banco.queryForObject("SELECT COUNT(*) FROM portfolio_prestadores WHERE prestador_id=? AND ativo",Integer.class,perfil);
        if(total!=null && total>=10) throw new ResponseStatusException(HttpStatus.CONFLICT,"Seu portfólio já tem 10 fotos. Remova uma antes de enviar outra.");
        var imagem=imagens.preparar(foto,1200);
        if(imagem.conteudo().length>2*1024*1024) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"A imagem processada excedeu 2 MB. Escolha uma foto menor.");
        Long id=banco.queryForObject("INSERT INTO portfolio_prestadores(prestador_id,legenda,conteudo,tipo) VALUES (?,?,?,?) RETURNING id",
                Long.class,perfil,legenda.trim(),imagem.conteudo(),imagem.tipo());
        return ResponseEntity.created(URI.create("/portfolio/fotos/"+id)).body(
                banco.queryForMap(CAMPOS+"WHERE id=?",id));
    }
    @DeleteMapping("/me/{id}")
    @Transactional
    public ResponseEntity<Void> remover(@PathVariable Long id,HttpServletRequest request) {
        int alterados=banco.update("UPDATE portfolio_prestadores SET ativo=false WHERE id=? AND prestador_id=? AND ativo",id,perfil(request,true));
        if(alterados==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Foto não encontrada.");
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/prestadores/{id}")
    public List<Map<String,Object>> publico(@PathVariable Long id) {
        Integer visivel=banco.queryForObject("SELECT COUNT(*) FROM prestadores p JOIN usuarios u ON u.id=p.usuario_id WHERE p.id=? AND p.ativo AND u.ativo AND p.status_aprovacao='APROVADO'",Integer.class,id);
        if(visivel==null || visivel==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Perfil não encontrado.");
        return banco.queryForList(CAMPOS+"WHERE prestador_id=? AND ativo ORDER BY id DESC",id);
    }
    @GetMapping("/fotos/{id}")
    public ResponseEntity<byte[]> foto(@PathVariable Long id,HttpServletRequest request) {
        Long usuario=0L;
        try { usuario=sessao.exigir(request).getId(); }
        catch(ResponseStatusException erro) { if(erro.getStatusCode().value()!=401) throw erro; }
        var lista=banco.query("""
                SELECT f.conteudo,f.tipo FROM portfolio_prestadores f
                JOIN prestadores p ON p.id=f.prestador_id JOIN usuarios u ON u.id=p.usuario_id
                WHERE f.id=? AND f.ativo AND u.ativo
                AND (p.usuario_id=? OR (p.ativo AND p.status_aprovacao='APROVADO'))
                """,(linha,n)->new ImagemService.Imagem(linha.getBytes("conteudo"),linha.getString("tipo")),id,usuario);
        if(lista.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Foto não encontrada.");
        var imagem=lista.getFirst();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(imagem.tipo()))
                .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").body(imagem.conteudo());
    }
}
