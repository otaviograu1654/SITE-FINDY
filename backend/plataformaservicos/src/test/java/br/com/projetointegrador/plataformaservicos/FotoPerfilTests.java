// Testa envio, validação, consulta e isolamento das fotos de perfil com rollback no banco local.

package br.com.projetointegrador.plataformaservicos;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FotoPerfilTests {
    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired JdbcTemplate banco;
    @Autowired EntityManager entidades;
    Usuario dono;
    Usuario outro;
    MockHttpSession sessao;
    MockHttpSession outraSessao;

    @BeforeEach
    void preparar() {
        dono = criarConta();
        outro = criarConta();
        sessao = sessao(dono);
        outraSessao = sessao(outro);
    }

    private Usuario criarConta() {
        Usuario usuario = new Usuario();
        usuario.setNome("Teste de foto");
        usuario.setEmail(UUID.randomUUID() + "@example.invalid");
        usuario.setSenhaHash("hash-apenas-para-teste-transacional");
        return usuarios.saveAndFlush(usuario);
    }

    private MockHttpSession sessao(Usuario usuario) {
        MockHttpSession resultado = new MockHttpSession();
        resultado.setAttribute("usuarioId", usuario.getId());
        resultado.setAttribute("senhaDaSessao", usuario.getSenhaHash());
        return resultado;
    }

    private byte[] imagem(String formato, int largura, int altura, Color cor) throws Exception {
        BufferedImage imagem = new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB);
        var desenho = imagem.createGraphics();
        desenho.setColor(cor);
        desenho.fillRect(0, 0, largura, altura);
        desenho.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        assertThat(ImageIO.write(imagem, formato, bytes)).isTrue();
        return bytes.toByteArray();
    }

    private MockMultipartFile foto(String formato, int largura, int altura, Color cor) throws Exception {
        return new MockMultipartFile("foto", "minha-foto." + formato, "image/" + formato,
                imagem(formato, largura, altura, cor));
    }

    private String endereco(Usuario usuario) {
        return banco.queryForObject("SELECT foto FROM usuarios WHERE id=?", String.class, usuario.getId());
    }

    @Test
    void exigeSessaoParaEnviar() throws Exception {
        mvc.perform(multipart("/fotos/me").file(foto("png", 8, 8, Color.BLUE)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void salvaPngEPermiteConsultaPublicaSemExporDadosDaConta() throws Exception {
        mvc.perform(multipart("/fotos/me").file(foto("png", 16, 12, Color.BLUE)).session(sessao))
                .andExpect(status().isOk()).andExpect(jsonPath("$.foto").isString());
        String url = endereco(dono);
        assertThat(url).startsWith("/fotos/" + dono.getId() + "?v=");
        byte[] bytes = mvc.perform(get(url)).andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn().getResponse().getContentAsByteArray();
        BufferedImage salva = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(salva.getWidth()).isEqualTo(16);
        assertThat(salva.getHeight()).isEqualTo(12);
        // O controller usa JDBC: limpa o contexto JPA antes de consultar o perfil.
        entidades.clear();
        mvc.perform(get("/perfil").session(sessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.foto").value(url));
    }

    @Test
    void reduzJpegPreservandoProporcao() throws Exception {
        mvc.perform(multipart("/fotos/me").file(foto("jpg", 1024, 512, Color.RED)).session(sessao))
                .andExpect(status().isOk());
        byte[] bytes = mvc.perform(get(endereco(dono))).andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andReturn().getResponse().getContentAsByteArray();
        BufferedImage salva = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(salva.getWidth()).isEqualTo(512);
        assertThat(salva.getHeight()).isEqualTo(256);
    }

    @Test
    void substituiImagemSemDuplicarEAtualizaVersao() throws Exception {
        mvc.perform(multipart("/fotos/me").file(foto("png", 8, 8, Color.RED)).session(sessao))
                .andExpect(status().isOk());
        String anterior = endereco(dono);
        mvc.perform(multipart("/fotos/me").file(foto("png", 10, 10, Color.BLUE)).session(sessao))
                .andExpect(status().isOk());
        assertThat(endereco(dono)).isNotEqualTo(anterior);
        assertThat(banco.queryForObject("SELECT COUNT(*) FROM fotos_usuarios WHERE usuario_id=?",
                Integer.class, dono.getId())).isEqualTo(1);
        BufferedImage salva = ImageIO.read(new ByteArrayInputStream(
                banco.queryForObject("SELECT conteudo FROM fotos_usuarios WHERE usuario_id=?",
                        byte[].class, dono.getId())));
        assertThat(salva.getWidth()).isEqualTo(10);
        assertThat(salva.getRGB(0, 0)).isEqualTo(Color.BLUE.getRGB());
    }

    @Test
    void usaDonoDaSessaoIgnorandoIdEArquivoDoCliente() throws Exception {
        mvc.perform(multipart("/fotos/me").file(foto("png", 8, 8, Color.RED)).session(sessao))
                .andExpect(status().isOk());
        String doDono = endereco(dono);
        MockMultipartFile disfarce = new MockMultipartFile("foto", "../../foto.jpg", "image/jpeg",
                imagem("png", 6, 6, Color.BLUE));
        mvc.perform(multipart("/fotos/me").file(disfarce)
                .param("usuario_id", dono.getId().toString()).session(outraSessao))
                .andExpect(status().isOk());
        assertThat(endereco(dono)).isEqualTo(doDono);
        assertThat(endereco(outro)).startsWith("/fotos/" + outro.getId() + "?v=");
        mvc.perform(get(endereco(outro))).andExpect(content().contentType(MediaType.IMAGE_PNG));
    }

    @Test
    void recusaArquivoVazioAusenteOuAcimaDoLimite() throws Exception {
        mvc.perform(multipart("/fotos/me").session(sessao)).andExpect(status().isBadRequest());
        mvc.perform(multipart("/fotos/me")
                .file(new MockMultipartFile("foto", "vazio.png", "image/png", new byte[0]))
                .session(sessao)).andExpect(status().isBadRequest());
        mvc.perform(multipart("/fotos/me")
                .file(new MockMultipartFile("foto", "grande.png", "image/png", new byte[2097153]))
                .session(sessao)).andExpect(status().isPayloadTooLarge());
        assertThat(endereco(dono)).isNull();
    }

    @Test
    void recusaConteudoFalsoGifEDimensoesExcessivas() throws Exception {
        mvc.perform(multipart("/fotos/me").file(new MockMultipartFile("foto", "falsa.jpg", "image/jpeg",
                "<svg><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8)))
                .session(sessao)).andExpect(status().isUnsupportedMediaType());
        mvc.perform(multipart("/fotos/me").file(foto("gif", 2, 2, Color.RED)).session(sessao))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(multipart("/fotos/me").file(foto("png", 4097, 1, Color.RED)).session(sessao))
                .andExpect(status().isBadRequest());
        assertThat(endereco(dono)).isNull();
    }

    @Test
    void naoPublicaFotoDeContaDesativada() throws Exception {
        mvc.perform(multipart("/fotos/me").file(foto("png", 8, 8, Color.BLUE)).session(sessao))
                .andExpect(status().isOk());
        String url = endereco(dono);
        dono.setAtivo(false);
        usuarios.saveAndFlush(dono);
        mvc.perform(get(url)).andExpect(status().isNotFound());
        mvc.perform(multipart("/fotos/me").file(foto("png", 8, 8, Color.BLUE)).session(sessao))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void fotoAusenteRetorna404ECorsAceitaLiveServer() throws Exception {
        mvc.perform(get("/fotos/" + dono.getId())).andExpect(status().isNotFound());
        mvc.perform(options("/fotos/me").header(HttpHeaders.ORIGIN, "http://localhost:5501")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5501"));
    }
}
