// Transporta os dados pessoais usados na consulta e edição da conta.

package br.com.projetointegrador.plataformaservicos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PerfilDTO(

    @NotBlank
    @Size(max = 100)
    String nome,

    @Size(max = 20)
    String telefone,

    @Size(max = 100)
    String cidade,

    @Pattern(regexp = "[A-Z]{2}")
    String estado,

    @Size(max = 500)
    String foto,

    @Size(max = 100) String bairro

) {
}
