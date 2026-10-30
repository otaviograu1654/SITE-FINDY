// Valida os dados enviados pelo cliente ao solicitar um serviço.
package br.com.projetointegrador.plataformaservicos.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SolicitacaoDTO(
        @NotNull @Positive Long servicoId,
        @NotNull @Future OffsetDateTime dataInicio,
        @NotNull @DecimalMin("0.01") @Digits(integer = 4, fraction = 2) BigDecimal quantidade,
        @NotBlank @Size(max = 255) String endereco,
        @NotBlank @Size(max = 100) String bairro,
        @NotBlank @Size(max = 100) String cidade,
        @NotBlank @Pattern(regexp = "[A-Z]{2}") String estado,
        @Size(max = 5000) String mensagem) {
}
