package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.PerfilDTO;
import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/perfil")
public class PerfilController {

    private final UsuarioRepository repository;

    public PerfilController(UsuarioRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public PerfilDTO consultar(HttpServletRequest request) {
        Usuario usuario = usuarioLogado(request);
        return resposta(usuario);
    }

    @PutMapping
    public PerfilDTO atualizar(
            @Valid @RequestBody PerfilDTO dados,
            HttpServletRequest request) {

        Usuario usuario = usuarioLogado(request);

        usuario.setNome(dados.nome().trim());
        usuario.setTelefone(dados.telefone());
        usuario.setCidade(dados.cidade());
        usuario.setEstado(dados.estado());
        usuario.setFoto(dados.foto());

        usuario = repository.saveAndFlush(usuario);

        return resposta(usuario);
    }

    private Usuario usuarioLogado(HttpServletRequest request) {

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

        if (!usuario.isAtivo()) {
            sessao.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        return usuario;
    }

    private PerfilDTO resposta(Usuario usuario) {
        return new PerfilDTO(
                usuario.getNome(),
                usuario.getTelefone(),
                usuario.getCidade(),
                usuario.getEstado(),
                usuario.getFoto()
        );
    }
}