// Cadastra novas contas com e-mail único e senha protegida por hash.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.CadastroUsuarioDTO;
import br.com.projetointegrador.plataformaservicos.dto.UsuarioRespostaDTO;
import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;

import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository repository,
            PasswordEncoder passwordEncoder) {

        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioRespostaDTO cadastrar(
            @Valid @RequestBody CadastroUsuarioDTO dados) {

        String email = dados.email().trim().toLowerCase(Locale.ROOT);

        if (repository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "E-mail já cadastrado."
            );
        }

        // BCrypt aceita senhas de até 72 bytes.
        if (dados.senha().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Senha muito longa."
            );
        }

        Usuario usuario = new Usuario();
        usuario.setNome(dados.nome().trim());
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(dados.senha()));

        try {
            usuario = repository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException erro) {
            // Protege também contra dois cadastros simultâneos.
            if (repository.existsByEmailIgnoreCase(email)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "E-mail já cadastrado.",
                        erro
                );
            }
            throw erro;
        }

        return new UsuarioRespostaDTO(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail()
        );
    }
}