// Popula todo <select class="campo-categoria"> da pagina com as categorias
// cadastradas no banco (GET /categorias.json), conforme pedido na Etapa 3:
// o <select> nunca vem com opcoes fixas no HTML. JavaScript puro, sem
// biblioteca.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var selects = document.querySelectorAll('.campo-categoria');
        if (selects.length === 0) {
            return;
        }
        fetch('/categorias.json')
            .then(function (resposta) {
                return resposta.json();
            })
            .then(function (categorias) {
                selects.forEach(function (select) {
                    categorias.forEach(function (categoria) {
                        var opcao = document.createElement('option');
                        opcao.value = categoria.id;
                        opcao.textContent = categoria.nome;
                        select.appendChild(opcao);
                    });
                });
            })
            .catch(function () {
                console.error('Nao foi possivel carregar as categorias.');
            });
    });
})();
