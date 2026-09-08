// Carrega GET /solicitacoes/recebidas (do prestador logado, via sessao) e
// monta a tabela com botoes de acao (aceitar/recusar/concluir), que sao
// pequenos <form> gerados dinamicamente postando para
// /solicitacoes/{id}/status. JavaScript puro, sem biblioteca.
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

        function botaoStatus(id, status, rotulo) {
            var formulario = document.createElement('form');
            formulario.className = 'formulario-status';
            formulario.method = 'POST';
            formulario.action = '/solicitacoes/' + id + '/status';

            var campoStatus = document.createElement('input');
            campoStatus.type = 'hidden';
            campoStatus.name = 'status';
            campoStatus.value = status;
            formulario.appendChild(campoStatus);

            var botao = document.createElement('button');
            botao.type = 'submit';
            botao.className = 'botao-acao';
            botao.textContent = rotulo;
            formulario.appendChild(botao);

            return formulario;
        }

        function linhaDaSolicitacao(solicitacao) {
            var linha = document.createElement('tr');
            linha.appendChild(celula(solicitacao.servicoTitulo));
            linha.appendChild(celula(solicitacao.clienteNome));
            linha.appendChild(celula(solicitacao.clienteTelefone));
            linha.appendChild(celula(solicitacao.status));
            linha.appendChild(celula(solicitacao.dataSolicitacao));

            var celulaAcoes = document.createElement('td');
            if (solicitacao.status === 'PENDENTE') {
                celulaAcoes.appendChild(botaoStatus(solicitacao.id, 'ACEITA', 'Aceitar'));
                celulaAcoes.appendChild(botaoStatus(solicitacao.id, 'RECUSADA', 'Recusar'));
            } else if (solicitacao.status === 'ACEITA') {
                celulaAcoes.appendChild(botaoStatus(solicitacao.id, 'CONCLUIDA', 'Concluir'));
            }
            linha.appendChild(celulaAcoes);
            return linha;
        }

        fetch('/solicitacoes/recebidas')
            .then(function (resposta) {
                if (!resposta.ok) {
                    throw new Error('Falha ao carregar');
                }
                return resposta.json();
            })
            .then(function (solicitacoes) {
                corpoTabela.innerHTML = '';
                solicitacoes.forEach(function (solicitacao) {
                    corpoTabela.appendChild(linhaDaSolicitacao(solicitacao));
                });
            })
            .catch(function () {
                var erro = document.querySelector('.mensagem-erro');
                if (erro) {
                    erro.textContent = 'Nao foi possivel carregar as solicitacoes recebidas. Faca login como prestador.';
                    erro.hidden = false;
                }
            });
    });
})();
