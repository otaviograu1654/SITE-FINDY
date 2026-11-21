// Recebe pedidos autenticados e restringe as ações aos participantes da contratação.
package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.SolicitacaoDTO;
import br.com.projetointegrador.plataformaservicos.service.SessaoUsuario;
import br.com.projetointegrador.plataformaservicos.service.SolicitacaoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/solicitacoes")
public class SolicitacaoController {
    private final SolicitacaoService solicitacoes;
    private final SessaoUsuario sessao;

    public SolicitacaoController(SolicitacaoService solicitacoes, SessaoUsuario sessao) {
        this.solicitacoes = solicitacoes;
        this.sessao = sessao;
    }

    public record Acao(@NotBlank @Pattern(regexp = "ACEITAR|RECUSAR|CANCELAR|INICIAR|CONCLUIR") String acao) {}
    public record Avaliacao(@NotNull @Min(1) @Max(5) Integer nota, @Size(max = 1000) String comentario) {}

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@Valid @RequestBody SolicitacaoDTO dados,
                                                    HttpServletRequest request) {
        var pedido = solicitacoes.criar(sessao.exigir(request).getId(), dados);
        return ResponseEntity.created(URI.create("/solicitacoes/" + pedido.get("id"))).body(pedido);
    }

    @GetMapping
    public SolicitacaoService.Pagina listar(@RequestParam(defaultValue = "ENVIADAS") String tipo,
                                            @RequestParam(defaultValue = "1") int pagina,
                                            HttpServletRequest request) {
        return solicitacoes.listar(sessao.exigir(request).getId(), tipo, pagina);
    }

    @GetMapping("/pendentes/resumo")
    public Map<String, Object> pendentes(HttpServletRequest request) {
        return solicitacoes.pendentes(sessao.exigir(request).getId());
    }

    @GetMapping("/{id}")
    public Map<String, Object> consultar(@PathVariable Long id, HttpServletRequest request) {
        return solicitacoes.consultar(sessao.exigir(request).getId(), id);
    }

    @PatchMapping("/{id}/situacao")
    public Map<String, Object> agir(@PathVariable Long id, @Valid @RequestBody Acao dados,
                                    HttpServletRequest request) {
        return solicitacoes.agir(sessao.exigir(request).getId(), id, dados.acao());
    }

    @PostMapping("/{id}/avaliacao")
    public ResponseEntity<Map<String, Object>> avaliar(@PathVariable Long id,
            @Valid @RequestBody Avaliacao dados, HttpServletRequest request) {
        return ResponseEntity.created(URI.create("/solicitacoes/" + id))
                .body(solicitacoes.avaliar(sessao.exigir(request).getId(), id, dados.nota(), dados.comentario()));
    }
}
