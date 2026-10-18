package br.com.projetointegrador.plataformaservicos.dto;

import jakarta.validation.constraints.NotNull;

public record AtivacaoPrestadorDTO(@NotNull Boolean ativo) {
}
