// Le ?sucesso=1 ou ?erro=... da query string (preenchidos pelos controllers
// apos o redirect de um formulario classico) e mostra a mensagem na area
// correspondente da pagina. JavaScript puro do navegador, sem biblioteca.
(function () {
    function mostrar(seletor, texto) {
        var elemento = document.querySelector(seletor);
        if (!elemento) {
            return;
        }
        elemento.textContent = texto;
        elemento.hidden = false;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var parametros = new URLSearchParams(window.location.search);
        if (parametros.has('sucesso')) {
            mostrar('.mensagem-sucesso', 'Operacao realizada com sucesso.');
        }
        if (parametros.has('erro')) {
            // URLSearchParams ja decodifica o valor - nao decodificar de novo.
            mostrar('.mensagem-erro', parametros.get('erro'));
        }
    });
})();
