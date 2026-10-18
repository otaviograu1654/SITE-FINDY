package br.com.projetointegrador.plataformaservicos.dto;

import java.time.OffsetDateTime;

public record PrestadorRespostaDTO(
        Long id, String descricaoProfissional, String experiencia,
        String regiaoAtendimento, boolean ativo, String statusAprovacao,
        String motivoRecusa, OffsetDateTime dataAnalise) {
}
