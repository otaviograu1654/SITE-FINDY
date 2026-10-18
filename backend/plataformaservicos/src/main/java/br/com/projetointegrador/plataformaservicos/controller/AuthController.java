// Realiza login e logout e consulta a conta da sessão atual.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.LoginDTO;
import br.com.projetointegrador.plataformaservicos.dto.UsuarioRespostaDTO;
import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            UsuarioRepository repository,
            PasswordEncoder passwordEncoder) {

        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public UsuarioRespostaDTO login(
            @Valid @RequestBody LoginDTO dados,
            HttpServletRequest request) {

        Usuario usuario = repository
                .findByEmailIgnoreCase(dados.email().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "E-mail ou senha incorretos."
                ));

        if (!usuario.isAtivo()
                || dados.senha().getBytes(StandardCharsets.UTF_8).length > 72
                || !passwordEncoder.matches(
                        dados.senha(), usuario.getSenhaHash())) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "E-mail ou senha incorretos."
            );
        }

        // Encerra uma sessão anterior antes de criar a nova.
        HttpSession anterior = request.getSession(false);

        if (anterior != null) {
            anterior.invalidate();
        }

        HttpSession sessao = request.getSession(true);
        sessao.setAttribute("usuarioId", usuario.getId());
        sessao.setAttribute("senhaDaSessao", usuario.getSenhaHash());

        return resposta(usuario);
    }

    @GetMapping("/me")
    public UsuarioRespostaDTO minhaConta(HttpServletRequest request) {

        HttpSession sessao = request.getSession(false);

        if (sessao == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Long usuarioId = (Long) sessao.getAttribute("usuarioId");

        if (usuarioId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Usuario usuario = repository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED
                ));

        if (!usuario.isAtivo()
                || !usuario.getSenhaHash().equals(sessao.getAttribute("senhaDaSessao"))) {
            sessao.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Entre novamente na sua conta.");
        }

        return resposta(usuario);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {

        HttpSession sessao = request.getSession(false);

        if (sessao != null) {
            sessao.invalidate();
        }
    }

    private UsuarioRespostaDTO resposta(Usuario usuario) {
        return new UsuarioRespostaDTO(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail()
        );
    }
}
