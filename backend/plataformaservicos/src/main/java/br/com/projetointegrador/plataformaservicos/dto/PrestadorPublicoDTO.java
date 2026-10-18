// Retorna os dados públicos do prestador, sem expor informações privadas da conta.

package br.com.projetointegrador.plataformaservicos.dto;

public record PrestadorPublicoDTO(
        Long id, String nome, String cidade, String estado, String foto,
        String descricaoProfissional, String experiencia, String regiaoAtendimento) {
}
