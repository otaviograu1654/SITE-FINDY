// Recebe a foto da conta conectada e disponibiliza a imagem salva no PostgreSQL.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.service.SessaoUsuario;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import br.com.projetointegrador.plataformaservicos.service.ImagemService;
import br.com.projetointegrador.plataformaservicos.service.ImagemService.Imagem;

@RestController
@RequestMapping("/fotos")
public class FotoController {
    private final ImagemService imagens;
    private final JdbcTemplate banco;
    private final SessaoUsuario sessao;

    public FotoController(JdbcTemplate banco, SessaoUsuario sessao, ImagemService imagens) {
        this.imagens = imagens;
        this.banco = banco;
        this.sessao = sessao;
    }


    @PostMapping(path = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public Map<String, String> salvar(@RequestParam("foto") MultipartFile arquivo,
                                    HttpServletRequest request) {
        Long usuarioId = sessao.exigir(request).getId();
        Imagem imagem = imagens.preparar(arquivo, 512);
        banco.update("""
                INSERT INTO fotos_usuarios (usuario_id, conteudo, tipo)
                VALUES (?, ?, ?)
                ON CONFLICT (usuario_id) DO UPDATE
                SET conteudo=EXCLUDED.conteudo,
                    tipo=EXCLUDED.tipo,
                    atualizado_em=clock_timestamp()
                """, usuarioId, imagem.conteudo(), imagem.tipo());

        // A versão na URL faz o navegador carregar a foto recém-substituída.
        String endereco = "/fotos/" + usuarioId + "?v=" + UUID.randomUUID();
        banco.update("UPDATE usuarios SET foto=? WHERE id=?", endereco, usuarioId);
        return Map.of("foto", endereco);
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> consultar(@PathVariable Long id) {
        List<Imagem> fotos = banco.query("""
                SELECT f.conteudo, f.tipo
                FROM fotos_usuarios f
                JOIN usuarios u ON u.id=f.usuario_id
                WHERE f.usuario_id=? AND u.ativo
                """, (linha, numero) -> new Imagem(
                linha.getBytes("conteudo"), linha.getString("tipo")), id);
        if (fotos.isEmpty()) throw erro(HttpStatus.NOT_FOUND, "Foto não encontrada.");
        Imagem imagem = fotos.getFirst();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imagem.tipo()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(imagem.conteudo());
    }

    private ResponseStatusException erro(HttpStatus status, String mensagem) {
        return new ResponseStatusException(status, mensagem);
    }
}
