package br.com.projetointegrador.plataformaservicos.repository;

import br.com.projetointegrador.plataformaservicos.model.Prestador;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PrestadorRepository extends JpaRepository<Prestador, Long> {
    Optional<Prestador> findByUsuarioId(Long usuarioId);
    Optional<Prestador> findByIdAndAtivoTrueAndStatusAprovacaoAndUsuarioAtivoTrue(
            Long id, String statusAprovacao);
}
