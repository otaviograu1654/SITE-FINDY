package br.com.projetointegrador.plataformaservicos.dto;
import jakarta.validation.constraints.*;
import java.util.List;
public record PrestadorDTO(
 @NotBlank @Size(max=5000) String descricaoProfissional,
 @Size(max=2000) String experiencia,
 @NotBlank @Size(max=255) String regiaoAtendimento,
 boolean iniciante,
 @NotEmpty @Size(max=40) List<@NotBlank @Size(max=180) String> habilidades) {}
