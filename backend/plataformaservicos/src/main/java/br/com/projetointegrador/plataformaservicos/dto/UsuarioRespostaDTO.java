// Retorna identificação, nome e e-mail da conta, sem incluir a senha.

package br.com.projetointegrador.plataformaservicos.dto;

public record UsuarioRespostaDTO (
    Long id,
    String nome,
    String email
)
{}
