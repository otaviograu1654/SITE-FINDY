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

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/fotos")
public class FotoController {
    private static final long MAX_BYTES = 2 * 1024 * 1024;
    private final JdbcTemplate banco;
    private final SessaoUsuario sessao;

    public FotoController(JdbcTemplate banco, SessaoUsuario sessao) {
        this.banco = banco;
        this.sessao = sessao;
    }

    private record Imagem(byte[] conteudo, String tipo) {}

    @PostMapping(path = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public Map<String, String> salvar(@RequestParam("foto") MultipartFile arquivo,
                                    HttpServletRequest request) {
        Long usuarioId = sessao.exigir(request).getId();
        if (arquivo.isEmpty()) throw erro(HttpStatus.BAD_REQUEST, "Selecione uma foto.");
        if (arquivo.getSize() > MAX_BYTES) {
            throw erro(HttpStatus.PAYLOAD_TOO_LARGE, "A foto deve ter até 2 MB.");
        }

        Imagem imagem = preparar(arquivo);
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

    private Imagem preparar(MultipartFile arquivo) {
        try (var entrada = new MemoryCacheImageInputStream(
                new ByteArrayInputStream(arquivo.getBytes()))) {
            var leitores = ImageIO.getImageReaders(entrada);
            if (!leitores.hasNext()) {
                throw erro(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Escolha uma imagem JPG ou PNG válida.");
            }
            ImageReader leitor = leitores.next();
            try {
                String formato = leitor.getFormatName().toLowerCase(Locale.ROOT);
                boolean png = formato.equals("png");
                if (!png && !formato.equals("jpeg") && !formato.equals("jpg")) {
                    throw erro(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Escolha uma imagem JPG ou PNG.");
                }
                leitor.setInput(entrada, true, true);
                int largura = leitor.getWidth(0);
                int altura = leitor.getHeight(0);
                if (largura < 1 || altura < 1 || largura > 4096 || altura > 4096) {
                    throw erro(HttpStatus.BAD_REQUEST, "A imagem deve ter até 4096 pixels de largura e altura.");
                }

                BufferedImage original = leitor.read(0);
                double escala = Math.min(1.0, 512.0 / Math.max(largura, altura));
                BufferedImage reduzida = new BufferedImage(
                        Math.max(1, (int) Math.round(largura * escala)),
                        Math.max(1, (int) Math.round(altura * escala)),
                        png ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
                Graphics2D desenho = reduzida.createGraphics();
                try {
                    desenho.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                            RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                    desenho.drawImage(original, 0, 0, reduzida.getWidth(), reduzida.getHeight(), null);
                } finally {
                    desenho.dispose();
                }
                // Regrava só a imagem, sem conservar metadados do arquivo original.
                ByteArrayOutputStream saida = new ByteArrayOutputStream();
                if (!ImageIO.write(reduzida, png ? "png" : "jpg", saida)) {
                    throw new IOException("Formato sem gravador.");
                }
                return new Imagem(saida.toByteArray(), png ? "image/png" : "image/jpeg");
            } finally {
                leitor.dispose();
            }
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException falha) {
            throw erro(HttpStatus.BAD_REQUEST, "Não foi possível ler essa foto. Escolha outro arquivo JPG ou PNG.");
        }
    }

    private ResponseStatusException erro(HttpStatus status, String mensagem) {
        return new ResponseStatusException(status, mensagem);
    }
}
