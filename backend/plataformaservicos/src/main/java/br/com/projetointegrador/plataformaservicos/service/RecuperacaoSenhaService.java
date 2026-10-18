// Gera links temporários de recuperação e troca a senha após validar o token.

package br.com.projetointegrador.plataformaservicos.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
public class RecuperacaoSenhaService {

    private static final Logger LOG =
            LoggerFactory.getLogger(RecuperacaoSenhaService.class);

    private final JdbcTemplate banco;
    private final EmailService emailService;
    private final PasswordEncoder encoder;
    private final String appUrl;

    private final SecureRandom aleatorio = new SecureRandom();

    public RecuperacaoSenhaService(
            JdbcTemplate banco,
            EmailService emailService,
            PasswordEncoder encoder,
            @Value("${findy.app-url}") String appUrl) {

        this.banco = banco;
        this.emailService = emailService;
        this.encoder = encoder;
        this.appUrl = appUrl.replaceAll("/+$", "");
    }

    @Async("recuperacaoExecutor")
    @Transactional
    public void solicitar(String email) {
        try {
            String endereco = email.trim().toLowerCase(Locale.ROOT);

            // Bloqueia a conta durante a operação para evitar pedidos concorrentes.
            List<Long> usuarios = banco.queryForList("""
                    SELECT id
                    FROM usuarios
                    WHERE LOWER(TRIM(email)) = ?
                      AND ativo
                    FOR UPDATE
                    """, Long.class, endereco);

            if (usuarios.isEmpty()) {
                return;
            }

            Long usuarioId = usuarios.getFirst();

            // No máximo um novo envio por minuto para esta conta.
            Integer recentes = banco.queryForObject("""
                    SELECT COUNT(*)
                    FROM recuperacoes_senha
                    WHERE usuario_id = ?
                      AND criado_em >
                          clock_timestamp() - INTERVAL '1 minute'
                    """, Integer.class, usuarioId);

            if (recentes != null && recentes > 0) {
                return;
            }

            byte[] bytes = new byte[32];
            aleatorio.nextBytes(bytes);

            String token = Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(bytes);

            // Um novo pedido substitui os links anteriores.
            banco.update("""
                    UPDATE recuperacoes_senha
                    SET usado_em = clock_timestamp()
                    WHERE usuario_id = ?
                      AND usado_em IS NULL
                    """, usuarioId);

            banco.update("""
                    INSERT INTO recuperacoes_senha (
                        usuario_id,
                        token_hash,
                        expira_em
                    )
                    VALUES (
                        ?,
                        ?,
                        clock_timestamp() + INTERVAL '30 minutes'
                    )
                    """, usuarioId, hash(token));

            String link = appUrl
                    + "/recuperar-senha.html#token="
                    + token;

            emailService.enviar(
                    endereco,
                    "Findy - Recuperação de senha",
                    """
                    Recebemos um pedido para redefinir sua senha.

                    Abra este link:
                    %s

                    O link vale por 30 minutos e pode ser usado uma única vez.

                    Se você não fez esse pedido, ignore esta mensagem.
                    """.formatted(link)
            );

        } catch (RuntimeException erro) {
            // Desfaz a criação do token se o envio falhar.
            TransactionAspectSupport.currentTransactionStatus()
                    .setRollbackOnly();

            // Não registra chave, token ou conteúdo do e-mail.
            LOG.warn(
                    "Falha no pedido de recuperação. Tipo: {}",
                    erro.getClass().getSimpleName()
            );
        }
    }

    @Transactional
    public void redefinir(String token, String novaSenha) {
        if (novaSenha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A senha deve ter no máximo 72 bytes."
            );
        }

        String tokenHash = hash(token);

        List<Long> candidatos = banco.queryForList("""
                SELECT usuario_id
                FROM recuperacoes_senha
                WHERE token_hash = ?
                """, Long.class, tokenHash);

        if (candidatos.isEmpty()) {
            throw linkInvalido();
        }

        Long usuarioId = candidatos.getFirst();

        // Serializa as trocas de senha da mesma conta.
        List<Long> usuarios = banco.queryForList("""
                SELECT id
                FROM usuarios
                WHERE id = ?
                  AND ativo
                FOR UPDATE
                """, Long.class, usuarioId);

        if (usuarios.isEmpty()) {
            throw linkInvalido();
        }

        List<Long> tokens = banco.queryForList("""
                SELECT id
                FROM recuperacoes_senha
                WHERE token_hash = ?
                  AND usuario_id = ?
                  AND usado_em IS NULL
                  AND expira_em > clock_timestamp()
                """, Long.class, tokenHash, usuarioId);

        if (tokens.isEmpty()) {
            throw linkInvalido();
        }

        banco.update("""
                UPDATE usuarios
                SET senha_hash = ?
                WHERE id = ?
                """, encoder.encode(novaSenha), usuarioId);

        // Inutiliza todos os links restantes dessa conta.
        banco.update("""
                UPDATE recuperacoes_senha
                SET usado_em = clock_timestamp()
                WHERE usuario_id = ?
                  AND usado_em IS NULL
                """, usuarioId);
    }

    private String hash(String token) {
        try {
            byte[] resultado = MessageDigest
                    .getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));

            return HexFormat.of().formatHex(resultado);

        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException(
                    "SHA-256 indisponível.",
                    erro
            );
        }
    }

    private ResponseStatusException linkInvalido() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Link inválido, expirado ou já utilizado. Solicite outro."
        );
    }
}