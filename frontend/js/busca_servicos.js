// Busca de servicos (GET /servicos?categoria_id=&cidade=) sem navegar para
// fora da pagina: intercepta o submit do formulario e monta a tabela de
// resultados via fetch. JavaScript puro, sem biblioteca.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var formulario = document.querySelector('.formulario-busca');
        var corpoTabela = document.querySelector('.tabela-dados tbody');
        if (!formulario || !corpoTabela) {
            return;
        }

        formulario.addEventListener('submit', function (evento) {
            evento.preventDefault();
            buscar();
        });

        function celula(texto) {
            var td = document.createElement('td');
            td.textContent = texto == null ? '' : texto;
            return td;
        }

        function buscar() {
            var categoriaId = formulario.querySelector('[name="categoria_id"]').value;
            var cidade = formulario.querySelector('[name="cidade"]').value;
            var parametros = new URLSearchParams({ categoria_id: categoriaId, cidade: cidade });

            fetch('/servicos?' + parametros.toString())
                .then(function (resposta) {
                    if (!resposta.ok) {
                        throw new Error('Falha na busca');
                    }
                    return resposta.json();
                })
                .then(function (servicos) {
                    corpoTabela.innerHTML = '';
                    servicos.forEach(function (servico) {
                        var linha = document.createElement('tr');
                        linha.appendChild(celula(servico.titulo));
                        linha.appendChild(celula(servico.categoriaNome));
                        linha.appendChild(celula(servico.prestadorNome + ' - ' + servico.prestadorCidade));
                        linha.appendChild(celula(servico.descricao));

                        var celulaAcao = document.createElement('td');
                        var link = document.createElement('a');
                        link.className = 'link-navegacao';
                        link.href = '/pages/enviar_solicitacao.html?servico_id=' + servico.id;
                        link.textContent = 'Solicitar orcamento';
                        celulaAcao.appendChild(link);
                        linha.appendChild(celulaAcao);

                        corpoTabela.appendChild(linha);
                    });
                })
                .catch(function () {
                    var erro = document.querySelector('.mensagem-erro');
                    if (erro) {
                        erro.textContent = 'Nao foi possivel buscar os servicos.';
                        erro.hidden = false;
                    }
                });
        }
    });
})();
