// Permite ao prestador cadastrar, listar e editar somente seus próprios serviços.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.service.SessaoUsuario;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/meus-servicos")
@Transactional
public class MeuServicoController {

    private final JdbcTemplate banco;
    private final SessaoUsuario sessao;

    public MeuServicoController(
            JdbcTemplate banco,
            SessaoUsuario sessao) {
        this.banco = banco;
        this.sessao = sessao;
    }

    public record DadosServico(
            @NotBlank @Size(max = 120) String titulo,
            @Size(max = 5000) String descricao,
            @NotNull @Positive Long categoriaId,
            @DecimalMin("0.00")
            @Digits(integer = 8, fraction = 2) BigDecimal preco,
            @NotNull
            @Pattern(regexp = "HORA|DIARIA|SERVICO")
            String unidadeCobranca,
            @NotNull Boolean ativo) {
    }

    @GetMapping("/categorias")
    public List<Map<String, Object>> categorias(
            HttpServletRequest request) {

        sessao.exigir(request);

        return banco.queryForList(
                "SELECT id, nome FROM categorias ORDER BY nome"
        );
    }

    @GetMapping
    public List<Map<String, Object>> listar(
            HttpServletRequest request) {

        Long prestadorId = exigirPrestador(request);

        return banco.queryForList("""
                SELECT
                    s.id,
                    s.titulo,
                    s.descricao,
                    s.categoria_id,
                    c.nome AS categoria,
                    s.preco,
                    s.unidade_cobranca,
                    s.ativo
                FROM servicos s
                JOIN categorias c ON c.id = s.categoria_id
                WHERE s.prestador_id = ?
                ORDER BY s.id DESC
                """, prestadorId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> criar(
            @Valid @RequestBody DadosServico dados,
            HttpServletRequest request) {

        Long prestadorId = exigirPrestador(request);
        conferirCategoria(dados.categoriaId());

        Long id = banco.queryForObject("""
                INSERT INTO servicos (
                    prestador_id,
                    categoria_id,
                    titulo,
                    descricao,
                    preco,
                    unidade_cobranca,
                    ativo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """,
                Long.class,
                prestadorId,
                dados.categoriaId(),
                dados.titulo().trim(),
                dados.descricao() == null
                        ? null : dados.descricao().trim(),
                dados.preco(),
                dados.unidadeCobranca(),
                dados.ativo()
        );

        return Map.of("id", id);
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void editar(
            @PathVariable Long id,
            @Valid @RequestBody DadosServico dados,
            HttpServletRequest request) {

        Long prestadorId = exigirPrestador(request);
        conferirCategoria(dados.categoriaId());

        int alterados = banco.update("""
                UPDATE servicos
                SET categoria_id = ?,
                    titulo = ?,
                    descricao = ?,
                    preco = ?,
                    unidade_cobranca = ?,
                    ativo = ?
                WHERE id = ?
                  AND prestador_id = ?
                """,
                dados.categoriaId(),
                dados.titulo().trim(),
                dados.descricao() == null
                        ? null : dados.descricao().trim(),
                dados.preco(),
                dados.unidadeCobranca(),
                dados.ativo(),
                id,
                prestadorId
        );

        if (alterados == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Serviço não encontrado na sua conta."
            );
        }
    }

    private Long exigirPrestador(HttpServletRequest request) {
        Long usuarioId = sessao.exigir(request).getId();

        List<Long> ids = banco.queryForList("""
                SELECT id
                FROM prestadores
                WHERE usuario_id = ?
                """, Long.class, usuarioId);

        if (ids.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Primeiro preencha seu perfil profissional."
            );
        }

        return ids.getFirst();
    }

    private void conferirCategoria(Long categoriaId) {
        Integer quantidade = banco.queryForObject(
                "SELECT COUNT(*) FROM categorias WHERE id = ?",
                Integer.class,
                categoriaId
        );

        if (quantidade == null || quantidade == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Categoria inválida."
            );
        }
    }
}