// Recebe pedidos de recuperação e troca de senha, validando os dados e limitando tentativas.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.service.RecuperacaoSenhaService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class RecuperacaoSenhaController {

    private final RecuperacaoSenhaService service;

    private final Map<String, Janela> tentativas = new HashMap<>();

    public RecuperacaoSenhaController(
            RecuperacaoSenhaService service) {
        this.service = service;
    }

    public record Pedido(
            @NotBlank @Email @Size(max = 100) String email) {
    }

    public record NovaSenha(
            @NotBlank
            @Pattern(regexp = "[A-Za-z0-9_-]{43}")
            String token,

            @NotBlank @Size(min = 8, max = 72)
            String novaSenha,

            @NotBlank @Size(min = 8, max = 72)
            String confirmacao) {
    }

    private record Janela(long expiraEm, int quantidade) {
    }

    @PostMapping("/recuperar-senha")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> solicitar(
            @Valid @RequestBody Pedido dados,
            HttpServletRequest request) {

        limitar(request.getRemoteAddr());

        try {
            service.solicitar(dados.email());

        } catch (TaskRejectedException erro) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Serviço ocupado. Tente novamente em instantes."
            );
        }

        return Map.of(
                "mensagem",
                "Se existir uma conta ativa com esse e-mail, "
                        + "você receberá as instruções."
        );
    }

    @PostMapping("/redefinir-senha")
    public Map<String, String> redefinir(
            @Valid @RequestBody NovaSenha dados,
            HttpServletRequest request) {

        limitar(request.getRemoteAddr());

        if (!dados.novaSenha().equals(dados.confirmacao())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "As senhas não coincidem."
            );
        }

        service.redefinir(dados.token(), dados.novaSenha());

        return Map.of(
                "mensagem",
                "Senha alterada! Entre novamente na sua conta."
        );
    }

    private synchronized void limitar(String endereco) {
        long agora = System.currentTimeMillis();

        tentativas.entrySet().removeIf(
                item -> item.getValue().expiraEm() <= agora
        );

        Janela janela = tentativas.get(endereco);

        if (janela == null) {
            if (tentativas.size() >= 10000) {
                throw excesso();
            }

            janela = new Janela(
                    agora + 10 * 60 * 1000L,
                    0
            );
        }

        if (janela.quantidade() >= 20) {
            throw excesso();
        }

        tentativas.put(
                endereco,
                new Janela(
                        janela.expiraEm(),
                        janela.quantidade() + 1
                )
        );
    }

    private ResponseStatusException excesso() {
        return new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Muitas tentativas. Aguarde até 10 minutos."
        );
    }
}