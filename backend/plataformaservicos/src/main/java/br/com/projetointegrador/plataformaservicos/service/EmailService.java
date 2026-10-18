// Envia e-mails pela API do Brevo usando as credenciais configuradas no backend.

package br.com.projetointegrador.plataformaservicos.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private final RestClient cliente;
    private final String chave;
    private final String remetente;

    public EmailService(
            @Value("${findy.brevo.api-key}") String chave,
            @Value("${findy.email.remetente}") String remetente) {

        this.chave = chave;
        this.remetente = remetente;

        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory fabrica =
                new JdkClientHttpRequestFactory(http);

        fabrica.setReadTimeout(Duration.ofSeconds(10));

        this.cliente = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .requestFactory(fabrica)
                .build();
    }

    public void enviar(
            String destinatario,
            String assunto,
            String texto) {

        if (chave.isBlank() || remetente.isBlank()) {
            throw new IllegalStateException(
                    "Configure BREVO_API_KEY e EMAIL_FROM."
            );
        }

        String html = "<html><body><p>"
                + HtmlUtils.htmlEscape(texto)
                    .replace("\n", "<br>")
                + "</p></body></html>";

        Map<String, Object> dados = Map.of(
                "sender", Map.of(
                        "name", "Findy",
                        "email", remetente
                ),
                "to", List.of(
                        Map.of("email", destinatario)
                ),
                "subject", assunto,
                "textContent", texto,
                "htmlContent", html
        );

        cliente.post()
                .uri("/smtp/email")
                .header("api-key", chave)
                .contentType(MediaType.APPLICATION_JSON)
                .body(dados)
                .retrieve()
                .toBodilessEntity();
    }
}