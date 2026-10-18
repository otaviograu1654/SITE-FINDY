// Exige uma conta ativa e uma sessão compatível com a senha atual para acessar rotas protegidas.

package br.com.projetointegrador.plataformaservicos.service;

import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessaoUsuario {
    private final UsuarioRepository usuarios;

    public SessaoUsuario(UsuarioRepository usuarios) { this.usuarios = usuarios; }

    public Usuario exigir(HttpServletRequest request) {
        HttpSession sessao = request.getSession(false);
        if (sessao == null || !(sessao.getAttribute("usuarioId") instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Entre na sua conta.");
        }
        Usuario usuario = usuarios.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Entre na sua conta."));
        if (!usuario.isAtivo()
                || !usuario.getSenhaHash().equals(sessao.getAttribute("senhaDaSessao"))) {
            sessao.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Entre novamente na sua conta.");
        }
        return usuario;
    }
}
