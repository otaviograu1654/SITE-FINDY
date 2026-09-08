// Carrega GET /solicitacoes/enviadas (do cliente logado, via sessao) e
// monta a tabela; quando o status e CONCLUIDA, mostra um link para avaliar
// aquela solicitacao. JavaScript puro, sem biblioteca.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var corpoTabela = document.querySelector('.tabela-dados tbody');
        if (!corpoTabela) {
            return;
        }

        function celula(texto) {
            var td = document.createElement('td');
            td.textContent = texto == null ? '' : texto;
            return td;
        }

        fetch('/solicitacoes/enviadas')
            .then(function (resposta) {
                if (!resposta.ok) {
                    throw new Error('Falha ao carregar');
                }
                return resposta.json();
            })
            .then(function (solicitacoes) {
                corpoTabela.innerHTML = '';
                solicitacoes.forEach(function (solicitacao) {
                    var linha = document.createElement('tr');
                    linha.appendChild(celula(solicitacao.servicoTitulo));
                    linha.appendChild(celula(solicitacao.prestadorNome));
                    linha.appendChild(celula(solicitacao.status));
                    linha.appendChild(celula(solicitacao.dataSolicitacao));

                    var celulaAcao = document.createElement('td');
                    if (solicitacao.status === 'CONCLUIDA') {
                        var link = document.createElement('a');
                        link.className = 'link-navegacao';
                        link.href = '/pages/avaliar.html?solicitacao_id=' + solicitacao.id;
                        link.textContent = 'Avaliar';
                        celulaAcao.appendChild(link);
                    }
                    linha.appendChild(celulaAcao);

                    corpoTabela.appendChild(linha);
                });
            })
            .catch(function () {
                var erro = document.querySelector('.mensagem-erro');
                if (erro) {
                    erro.textContent = 'Nao foi possivel carregar as solicitacoes enviadas. Faca login como cliente.';
                    erro.hidden = false;
                }
            });
    });
})();
