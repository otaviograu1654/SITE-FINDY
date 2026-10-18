// Permite ao administrador editar, aprovar, recusar e ativar ou desativar cadastros.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.AtivacaoPrestadorDTO;
import br.com.projetointegrador.plataformaservicos.dto.PrestadorDTO;
import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.service.SessaoUsuario;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@Transactional
public class AdminController {

    private final JdbcTemplate banco;
    private final SessaoUsuario sessao;

    public AdminController(JdbcTemplate banco, SessaoUsuario sessao) {
        this.banco = banco;
        this.sessao = sessao;
    }

    public record EdicaoContaDTO(
            @NotBlank @Size(max = 100) String nome,
            @NotBlank @Email @Size(max = 100) String email,
            @Size(max = 20) String telefone,
            @Size(max = 100) String cidade,
            @Pattern(regexp = "[A-Z]{2}") String estado,
            @Size(max = 500) String foto) {
    }

    public record AnaliseDTO(
            @NotNull Boolean aprovado,
            @Size(max = 1000) String motivo) {
    }

    @GetMapping("/me")
    public Map<String, Object> minhaPermissao(HttpServletRequest request) {
        Usuario admin = exigirAdmin(request);
        return Map.of("id", admin.getId(), "nome", admin.getNome());
    }

    @GetMapping("/cadastros")
    public List<Map<String, Object>> listar(HttpServletRequest request) {
        exigirAdmin(request);

        return banco.queryForList("""
                SELECT
                    u.id AS usuario_id,
                    u.nome, u.email, u.telefone,
                    u.cidade, u.estado, u.foto,
                    u.papel, u.ativo,
                    p.id AS prestador_id,
                    p.descricao_profissional,
                    p.experiencia,
                    p.regiao_atendimento,
                    p.status_aprovacao,
                    p.motivo_recusa,
                    p.ativo AS ativo_profissional
                FROM usuarios u
                LEFT JOIN prestadores p ON p.usuario_id = u.id
                ORDER BY u.id
                """);
    }

    @PutMapping("/usuarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void editarConta(
            @PathVariable Long id,
            @Valid @RequestBody EdicaoContaDTO dados,
            HttpServletRequest request) {

        exigirAdmin(request);

        String email = dados.email().trim().toLowerCase(Locale.ROOT);

        Integer repetidos = banco.queryForObject("""
                SELECT COUNT(*)
                FROM usuarios
                WHERE LOWER(TRIM(email)) = ? AND id <> ?
                """, Integer.class, email, id);

        if (repetidos != null && repetidos > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "E-mail já cadastrado."
            );
        }

        conferirAlteracao(banco.update("""
                UPDATE usuarios
                SET nome=?, email=?, telefone=?, cidade=?, estado=?, foto=?
                WHERE id=?
                """,
                dados.nome().trim(), email, dados.telefone(),
                dados.cidade(), dados.estado(), dados.foto(), id
        ));
    }

    @PatchMapping("/usuarios/{id}/ativacao")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ativarConta(
            @PathVariable Long id,
            @Valid @RequestBody AtivacaoPrestadorDTO dados,
            HttpServletRequest request) {

        exigirAdmin(request);

        Integer administradores = banco.queryForObject("""
                SELECT COUNT(*) FROM usuarios
                WHERE id=? AND papel='ADMIN'
                """, Integer.class, id);

        if (!dados.ativo() && administradores != null
                && administradores > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A conta administrativa não pode ser desativada por este painel."
            );
        }

        conferirAlteracao(banco.update(
                "UPDATE usuarios SET ativo=? WHERE id=?",
                dados.ativo(), id
        ));
    }

    @PutMapping("/prestadores/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void editarPrestador(
            @PathVariable Long id,
            @Valid @RequestBody PrestadorDTO dados,
            HttpServletRequest request) {

        exigirAdmin(request);

        conferirAlteracao(banco.update("""
                UPDATE prestadores
                SET descricao_profissional=?,
                    experiencia=?,
                    regiao_atendimento=?,
                    status_aprovacao='PENDENTE',
                    motivo_recusa=NULL,
                    analisado_por=NULL,
                    data_analise=NULL
                WHERE id=?
                """,
                dados.descricaoProfissional().trim(),
                dados.experiencia(),
                dados.regiaoAtendimento().trim(), id
        ));
    }

    @PatchMapping("/prestadores/{id}/analise")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void analisar(
            @PathVariable Long id,
            @Valid @RequestBody AnaliseDTO dados,
            HttpServletRequest request) {

        Usuario admin = exigirAdmin(request);

        String motivo = dados.motivo() == null
                ? "" : dados.motivo().trim();

        if (!dados.aprovado() && motivo.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe o motivo da recusa."
            );
        }

        conferirAlteracao(banco.update("""
                UPDATE prestadores
                SET status_aprovacao=?,
                    motivo_recusa=?,
                    analisado_por=?,
                    data_analise=CURRENT_TIMESTAMP
                WHERE id=?
                """,
                dados.aprovado() ? "APROVADO" : "RECUSADO",
                dados.aprovado() ? null : motivo,
                admin.getId(), id
        ));
    }

    @PatchMapping("/prestadores/{id}/ativacao")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ativarPrestador(
            @PathVariable Long id,
            @Valid @RequestBody AtivacaoPrestadorDTO dados,
            HttpServletRequest request) {

        exigirAdmin(request);

        conferirAlteracao(banco.update(
                "UPDATE prestadores SET ativo=? WHERE id=?",
                dados.ativo(), id
        ));
    }

    private Usuario exigirAdmin(HttpServletRequest request) {
        Usuario usuario = sessao.exigir(request);

        if (!"ADMIN".equals(usuario.getPapel())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acesso permitido somente ao administrador."
            );
        }

        return usuario;
    }

    private void conferirAlteracao(int quantidade) {
        if (quantidade == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Cadastro não encontrado."
            );
        }
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflito() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of("mensagem",
                        "Não foi possível salvar. Confira os dados e o e-mail informado.")
        );
    }
}