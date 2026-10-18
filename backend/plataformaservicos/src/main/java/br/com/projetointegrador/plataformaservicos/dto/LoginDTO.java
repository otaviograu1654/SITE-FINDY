// Define e valida o e-mail e a senha recebidos no login.

package br.com.projetointegrador.plataformaservicos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginDTO(

    @NotBlank
    @Email
    @Size(max = 100)
    String email,

    @NotBlank
    @Size(max = 72)
    String senha

) {
}