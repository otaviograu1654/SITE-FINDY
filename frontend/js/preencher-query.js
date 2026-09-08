// Para todo campo marcado com o atributo data-preencher-de-url, preenche o
// valor inicial a partir do parametro de mesmo "name" na query string da
// URL (ex.: ...?servico_id=7 preenche <input name="servico_id"
// data-preencher-de-url>). Usado quando o usuario chega a um formulario a
// partir de um link de outra tela (ex.: "Solicitar orcamento" na busca).
// JavaScript puro, sem biblioteca.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var parametros = new URLSearchParams(window.location.search);
        document.querySelectorAll('[data-preencher-de-url]').forEach(function (campo) {
            var valor = parametros.get(campo.name);
            if (valor !== null) {
                campo.value = valor;
            }
        });
    });
})();
