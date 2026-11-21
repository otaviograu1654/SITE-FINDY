package br.com.projetointegrador.plataformaservicos.service;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
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
import java.util.Locale;

@Service
public class ImagemService {
    public record Imagem(byte[] conteudo, String tipo) {}
    public Imagem preparar(MultipartFile arquivo, int limitePixels) {
        if (arquivo.isEmpty()) throw erro(HttpStatus.BAD_REQUEST, "Selecione uma foto.");
        if (arquivo.getSize() > 2 * 1024 * 1024) throw erro(HttpStatus.PAYLOAD_TOO_LARGE, "A foto deve ter até 2 MB.");
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
                double escala = Math.min(1.0, (double) limitePixels / Math.max(largura, altura));
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
