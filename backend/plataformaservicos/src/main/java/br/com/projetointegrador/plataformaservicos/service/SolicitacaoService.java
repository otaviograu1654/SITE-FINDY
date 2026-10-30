// Salva pedidos com estimativas de preço e controla consultas e mudanças de situação.
package br.com.projetointegrador.plataformaservicos.service;

import br.com.projetointegrador.plataformaservicos.dto.SolicitacaoDTO;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class SolicitacaoService {
    private final JdbcTemplate banco;
    private static final String ORIGEM = """
            FROM solicitacoes so
            JOIN servicos s ON s.id=so.servico_id
            JOIN prestadores p ON p.id=s.prestador_id
            JOIN usuarios cliente ON cliente.id=so.cliente_id
            JOIN usuarios profissional ON profissional.id=p.usuario_id
            """;
    private static final String RESUMO = """
            SELECT so.id, so.status, so.servico_id AS "servicoId",
                so.cliente_id AS "clienteId", p.usuario_id AS "profissionalId",
                p.id AS "prestadorId", s.titulo AS servico,
                cliente.nome AS cliente, profissional.nome AS profissional,
                so.quantidade, so.unidade_cobranca AS "unidadeCobranca",
                so.valor_unitario AS "valorUnitario", so.valor_unitario_maximo AS "valorUnitarioMaximo",
                ROUND(so.valor_unitario*so.quantidade,2) AS "estimativaMinima",
                ROUND(COALESCE(so.valor_unitario_maximo,so.valor_unitario)*so.quantidade,2) AS "estimativaMaxima",
                so.subtotal, so.taxa, so.total,
                so.data_inicio AS "dataInicio", so.data_solicitacao AS "dataSolicitacao"
            """;

    public SolicitacaoService(JdbcTemplate banco) { this.banco = banco; }

    public record Pagina(List<Map<String, Object>> itens, int pagina, long totalPaginas, long total) {}

    public Map<String, Object> criar(Long clienteId, SolicitacaoDTO dados) {
        Integer contatos = banco.queryForObject("""
                SELECT COUNT(*) FROM usuarios WHERE id=? AND ativo
                AND LENGTH(REGEXP_REPLACE(COALESCE(telefone,''),'[^0-9]','','g')) BETWEEN 10 AND 13
                """, Integer.class, clienteId);
        if (contatos == null || contatos == 0)
            throw erro(HttpStatus.BAD_REQUEST, "Preencha seu telefone com DDD em Minha conta antes de solicitar.");
        // As travas mantêm preço e disponibilidade consistentes durante a criação.
        var ofertas = banco.queryForList("""
                SELECT s.preco, s.preco_maximo, s.unidade_cobranca, p.usuario_id
                FROM servicos s JOIN prestadores p ON p.id=s.prestador_id
                JOIN usuarios u ON u.id=p.usuario_id
                WHERE s.id=? AND s.ativo AND p.ativo AND u.ativo
                  AND p.status_aprovacao='APROVADO'
                FOR SHARE OF s,p,u
                """, dados.servicoId());
        if (ofertas.isEmpty()) throw naoEncontrado("Serviço indisponível para contratação.");
        var oferta = ofertas.getFirst();
        if (clienteId.equals(oferta.get("usuario_id")))
            throw erro(HttpStatus.BAD_REQUEST, "Você não pode contratar seu próprio serviço.");
        if (!dados.dataInicio().isAfter(OffsetDateTime.now()))
            throw erro(HttpStatus.BAD_REQUEST, "Escolha uma data e horário futuros.");

        String unidade = (String) oferta.get("unidade_cobranca");
        BigDecimal quantidade = dados.quantidade();
        if ("SERVICO".equals(unidade) && quantidade.compareTo(BigDecimal.ONE) != 0)
            throw erro(HttpStatus.BAD_REQUEST, "Por serviço, informe quantidade 1.");
        if ("DIARIA".equals(unidade) && quantidade.stripTrailingZeros().scale() > 0)
            throw erro(HttpStatus.BAD_REQUEST, "Informe um número inteiro de diárias.");

        BigDecimal preco = (BigDecimal) oferta.get("preco");
        BigDecimal maximo = (BigDecimal) oferta.get("preco_maximo");
        BigDecimal referencia = maximo == null ? preco : maximo;
        BigDecimal estimativa = referencia == null ? null : referencia.multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
        if (estimativa != null && estimativa.compareTo(new BigDecimal("99999999.99")) > 0)
            throw erro(HttpStatus.BAD_REQUEST, "O valor total excede o limite permitido.");

        Long id = banco.queryForObject("""
                INSERT INTO solicitacoes(cliente_id,servico_id,mensagem,data_inicio,
                    duracao_horas,quantidade,endereco,bairro,cidade,estado,
                    valor_unitario,valor_unitario_maximo,unidade_cobranca,taxa)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0) RETURNING id
                """, Long.class, clienteId, dados.servicoId(),
                dados.mensagem() == null ? null : dados.mensagem().trim(), dados.dataInicio(),
                "HORA".equals(unidade) ? quantidade : null, quantidade,
                dados.endereco().trim(), dados.bairro().trim(), dados.cidade().trim(), dados.estado(),
                preco, maximo, unidade);
        return consultar(clienteId, id);
    }

    @Transactional(readOnly = true)
    public Pagina listar(Long usuarioId, String tipo, int pagina) {
        if (!List.of("ENVIADAS", "RECEBIDAS").contains(tipo) || pagina < 1)
            throw erro(HttpStatus.BAD_REQUEST, "Use tipo ENVIADAS ou RECEBIDAS e página a partir de 1.");
        String filtro = " WHERE " + ("ENVIADAS".equals(tipo) ? "so.cliente_id=?" : "p.usuario_id=?");
        Long total = banco.queryForObject("SELECT COUNT(*) " + ORIGEM + filtro, Long.class, usuarioId);
        var itens = banco.queryForList(RESUMO + ORIGEM + filtro
                + " ORDER BY so.data_solicitacao DESC,so.id DESC LIMIT 20 OFFSET ?",
                usuarioId, (long) (pagina - 1) * 20);
        return new Pagina(itens, pagina, Math.max(1, (total + 19) / 20), total);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> consultar(Long usuarioId, Long id) {
        // Contato e endereço só são entregues aos dois participantes autenticados.
        var pedidos = banco.queryForList(RESUMO + """
                ,so.mensagem,so.endereco,so.bairro,so.cidade,so.estado,
                cliente.telefone AS "telefoneCliente", profissional.telefone AS "telefoneProfissional"
                """ + ORIGEM + " WHERE so.id=? AND (so.cliente_id=? OR p.usuario_id=?)",
                id, usuarioId, usuarioId);
        if (pedidos.isEmpty()) throw naoEncontrado("Solicitação não encontrada na sua conta.");
        return pedidos.getFirst();
    }

    public Map<String, Object> agir(Long usuarioId, Long id, String acao) {
        // Uma única mudança por vez: aceitar e cancelar não podem sobrescrever um ao outro.
        var pedidos = banco.query("""
                SELECT so.status, so.cliente_id, p.usuario_id, so.data_inicio, so.servico_id
                """ + ORIGEM + " WHERE so.id=? AND (so.cliente_id=? OR p.usuario_id=?) FOR UPDATE OF so",
                (r, n) -> new Situacao(r.getString("status"), r.getLong("cliente_id"),
                        r.getLong("usuario_id"), r.getObject("data_inicio", OffsetDateTime.class),
                        r.getLong("servico_id")), id, usuarioId, usuarioId);
        if (pedidos.isEmpty()) throw naoEncontrado("Solicitação não encontrada na sua conta.");
        var pedido = pedidos.getFirst();
        String destino;
        switch (acao) {
            case "ACEITAR", "RECUSAR" -> {
                if (!usuarioId.equals(pedido.profissional()))
                    throw erro(HttpStatus.FORBIDDEN, "Somente o profissional pode aceitar ou recusar.");
                if (!"PENDENTE".equals(pedido.status())) throw conflito();
                if ("ACEITAR".equals(acao)) {
                    if (pedido.inicio() == null || !pedido.inicio().isAfter(OffsetDateTime.now()))
                        throw erro(HttpStatus.CONFLICT, "O horário solicitado já passou. Peça uma nova solicitação.");
                    var disponivel = banco.queryForList("""
                            SELECT s.id FROM servicos s JOIN prestadores p ON p.id=s.prestador_id
                            JOIN usuarios u ON u.id=p.usuario_id
                            WHERE s.id=? AND s.ativo AND p.ativo AND u.ativo
                              AND p.status_aprovacao='APROVADO' FOR SHARE OF s,p,u
                            """, pedido.servico());
                    if (disponivel.isEmpty()) throw erro(HttpStatus.CONFLICT, "O serviço ou perfil não está disponível.");
                }
                destino = "ACEITAR".equals(acao) ? "ACEITA" : "RECUSADA";
            }
            case "CANCELAR" -> {
                if (!usuarioId.equals(pedido.cliente()))
                    throw erro(HttpStatus.FORBIDDEN, "Somente o cliente pode cancelar.");
                if (!List.of("PENDENTE", "ACEITA").contains(pedido.status())) throw conflito();
                if (pedido.inicio() == null || !pedido.inicio().isAfter(OffsetDateTime.now()))
                    throw erro(HttpStatus.CONFLICT, "O cancelamento só é permitido antes do horário marcado.");
                destino = "CANCELADA";
            }
            default -> throw erro(HttpStatus.BAD_REQUEST, "Ação inválida.");
        }
        banco.update("UPDATE solicitacoes SET status=? WHERE id=?", destino, id);
        return consultar(usuarioId, id);
    }

    private record Situacao(String status, Long cliente, Long profissional, OffsetDateTime inicio, Long servico) {}
    private ResponseStatusException conflito() { return erro(HttpStatus.CONFLICT, "A situação atual não permite essa ação."); }
    private ResponseStatusException naoEncontrado(String mensagem) { return erro(HttpStatus.NOT_FOUND, mensagem); }
    private ResponseStatusException erro(HttpStatus status, String mensagem) { return new ResponseStatusException(status, mensagem); }
}
