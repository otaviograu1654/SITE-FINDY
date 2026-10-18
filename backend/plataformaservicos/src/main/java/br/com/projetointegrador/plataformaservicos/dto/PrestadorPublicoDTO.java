package br.com.projetointegrador.plataformaservicos.dto;

public record PrestadorPublicoDTO(
        Long id, String nome, String cidade, String estado, String foto,
        String descricaoProfissional, String experiencia, String regiaoAtendimento) {
}
