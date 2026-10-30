// Lista profissionais com ofertas ativas e consulta um serviço público pelo ID.

package br.com.projetointegrador.plataformaservicos.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/servicos")
public class ServicoConsultaController {

    private final JdbcTemplate banco;

    public ServicoConsultaController(JdbcTemplate banco) {
        this.banco = banco;
    }

    public record Pagina(
            List<Map<String, Object>> itens,
            int pagina,
            long totalPaginas,
            long total) {
    }

    @GetMapping("/{id}")
    public Map<String, Object> consultar(@PathVariable Long id) {
        var ofertas = banco.queryForList("""
                SELECT s.id AS servico_id, p.id AS prestador_id, u.nome, u.foto,
                    s.titulo, s.descricao, s.preco, s.preco_maximo, s.unidade_cobranca,
                    c.nome AS categoria, u.bairro, u.cidade, u.estado,
                    u.email LIKE 'demo.%@example.invalid' AS demonstracao
                FROM servicos s JOIN prestadores p ON p.id=s.prestador_id
                JOIN usuarios u ON u.id=p.usuario_id JOIN categorias c ON c.id=s.categoria_id
                WHERE s.id=? AND s.ativo AND p.ativo AND u.ativo
                  AND p.status_aprovacao='APROVADO'
                """, id);
        if (ofertas.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Serviço indisponível para contratação.");
        return ofertas.getFirst();
    }

    @GetMapping
    public Pagina listar(
            @RequestParam(defaultValue = "") String categoria,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "1") int pagina) {

        pagina = Math.max(1, pagina);

        String termo = q.trim().toLowerCase(Locale.ROOT);
        String busca = "%" + termo + "%";

        String origem = """
                FROM prestadores p
                JOIN usuarios u ON u.id=p.usuario_id
                WHERE p.ativo AND u.ativo
                  AND p.status_aprovacao='APROVADO'
                  AND EXISTS (
                      SELECT 1
                      FROM servicos s
                      JOIN categorias c ON c.id=s.categoria_id
                      WHERE s.prestador_id=p.id
                        AND s.ativo
                        AND (?='' OR c.nome=?)
                        AND (
                            ?=''
                            OR LOWER(u.nome) LIKE ?
                            OR LOWER(p.descricao_profissional) LIKE ?
                            OR LOWER(s.titulo) LIKE ?
                            OR LOWER(s.descricao) LIKE ?
                        )
                  )
                """;

        Object[] filtros = {
                categoria.trim(), categoria.trim(),
                termo, busca, busca, busca, busca
        };

        Long quantidade = banco.queryForObject(
                "SELECT COUNT(*) " + origem,
                Long.class, filtros
        );

        long total = quantidade == null ? 0 : quantidade;

        Object[] parametros = Arrays.copyOf(
                filtros, filtros.length + 2
        );

        parametros[filtros.length] = 12;
        parametros[filtros.length + 1] = (long) (pagina - 1) * 12;

        List<Map<String, Object>> itens = banco.queryForList("""
                SELECT
                    p.id AS prestador_id,
                    u.nome,
                    u.foto,
                    u.bairro,
                    u.cidade,
                    u.estado,
                    p.descricao_profissional AS descricao,
                    u.email LIKE 'demo.%@example.invalid' AS demonstracao
                """ + origem + """
                ORDER BY u.nome, p.id
                LIMIT ? OFFSET ?
                """, parametros);

        return new Pagina(
                itens,
                pagina,
                Math.max(1, (total + 11) / 12),
                total
        );
    }
}
