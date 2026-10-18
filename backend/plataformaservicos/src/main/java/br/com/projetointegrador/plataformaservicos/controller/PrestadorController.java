// Gerencia o perfil profissional da conta e consulta perfis públicos aprovados.

package br.com.projetointegrador.plataformaservicos.controller;

import br.com.projetointegrador.plataformaservicos.dto.*;
import br.com.projetointegrador.plataformaservicos.model.Prestador;
import br.com.projetointegrador.plataformaservicos.model.Usuario;
import br.com.projetointegrador.plataformaservicos.repository.PrestadorRepository;
import br.com.projetointegrador.plataformaservicos.service.SessaoUsuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Objects;

@RestController
@RequestMapping("/prestadores")
public class PrestadorController {
    private final PrestadorRepository prestadores;
    private final SessaoUsuario sessao;

    public PrestadorController(PrestadorRepository prestadores, SessaoUsuario sessao) {
        this.prestadores = prestadores;
        this.sessao = sessao;
    }

    @GetMapping("/me")
    public PrestadorRespostaDTO consultar(HttpServletRequest request) {
        return resposta(proprio(sessao.exigir(request)));
    }

    @PutMapping("/me")
    public ResponseEntity<PrestadorRespostaDTO> salvar(
            @Valid @RequestBody PrestadorDTO dados, HttpServletRequest request) {
        Usuario usuario = sessao.exigir(request);
        Prestador perfil = prestadores.findByUsuarioId(usuario.getId()).orElseGet(Prestador::new);
        boolean novo = perfil.getId() == null;
        String descricao = dados.descricaoProfissional().trim();
        String experiencia = dados.experiencia() == null ? null : dados.experiencia().trim();
        String regiao = dados.regiaoAtendimento().trim();
        boolean mudou = !Objects.equals(descricao, perfil.getDescricaoProfissional())
                || !Objects.equals(experiencia, perfil.getExperiencia())
                || !Objects.equals(regiao, perfil.getRegiaoAtendimento());
        perfil.setUsuario(usuario);
        perfil.setDescricaoProfissional(descricao);
        perfil.setExperiencia(experiencia);
        perfil.setRegiaoAtendimento(regiao);
        // Alteracoes profissionais e reenvios de recusados precisam de nova analise.
        if (novo || mudou || "RECUSADO".equals(perfil.getStatusAprovacao())) {
            perfil.solicitarAnalise();
        }
        try {
            perfil = prestadores.saveAndFlush(perfil);
        } catch (DataIntegrityViolationException erro) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O perfil foi alterado em outra requisicao. Recarregue a pagina.", erro);
        }
        return ResponseEntity.status(novo ? HttpStatus.CREATED : HttpStatus.OK).body(resposta(perfil));
    }

    @PatchMapping("/me/ativacao")
    public PrestadorRespostaDTO ativacao(
            @Valid @RequestBody AtivacaoPrestadorDTO dados, HttpServletRequest request) {
        Prestador perfil = proprio(sessao.exigir(request));
        if (dados.ativo() && !perfil.isAtivo()) {
            perfil.solicitarAnalise();
        }
        perfil.setAtivo(dados.ativo());
        return resposta(prestadores.saveAndFlush(perfil));
    }

    @GetMapping("/{id}")
    public PrestadorPublicoDTO publico(@PathVariable Long id) {
        Prestador perfil = prestadores.findByIdAndAtivoTrueAndStatusAprovacaoAndUsuarioAtivoTrue(
                id, "APROVADO").orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Usuario usuario = perfil.getUsuario();
        return new PrestadorPublicoDTO(perfil.getId(), usuario.getNome(), usuario.getCidade(),
                usuario.getEstado(), usuario.getFoto(), perfil.getDescricaoProfissional(),
                perfil.getExperiencia(), perfil.getRegiaoAtendimento());
    }

    private Prestador proprio(Usuario usuario) {
        return prestadores.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil profissional ainda nao criado."));
    }

    private PrestadorRespostaDTO resposta(Prestador perfil) {
        return new PrestadorRespostaDTO(perfil.getId(), perfil.getDescricaoProfissional(),
                perfil.getExperiencia(), perfil.getRegiaoAtendimento(), perfil.isAtivo(),
                perfil.getStatusAprovacao(), perfil.getMotivoRecusa(), perfil.getDataAnalise());
    }
}
