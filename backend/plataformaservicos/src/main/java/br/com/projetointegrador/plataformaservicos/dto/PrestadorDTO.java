package br.com.projetointegrador.plataformaservicos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PrestadorDTO(
        @NotBlank @Size(max = 5000) String descricaoProfissional,
        @Size(max = 2000) String experiencia,
        @NotBlank @Size(max = 255) String regiaoAtendimento) {
}
