// Carrega GET /usuarios/{id}/avaliacoes. Se a URL trouxer ?id=, usa esse id
// (perfil publico de qualquer usuario); senao, descobre o usuario logado via
// GET /sessao/usuario-logado e mostra "minhas avaliacoes". JavaScript puro,
// sem biblioteca.
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var corpoTabela = document.querySelector('.tabela-dados tbody');
        var elementoResumo = document.querySelector('.resumo-avaliacoes');
        var elementoErro = document.querySelector('.mensagem-erro');
        if (!corpoTabela) {
            return;
        }

        function celula(texto) {
            var td = document.createElement('td');
            td.textContent = texto == null ? '' : texto;
            return td;
        }

        function mostrarErro(texto) {
            if (elementoErro) {
                elementoErro.textContent = texto;
                elementoErro.hidden = false;
            }
        }

        function carregarAvaliacoes(id) {
            fetch('/usuarios/' + id + '/avaliacoes')
                .then(function (resposta) {
                    if (!resposta.ok) {
                        throw new Error('Falha ao carregar');
                    }
                    return resposta.json();
                })
                .then(function (avaliacoes) {
                    corpoTabela.innerHTML = '';
                    avaliacoes.forEach(function (avaliacao) {
                        var linha = document.createElement('tr');
                        linha.appendChild(celula(avaliacao.avaliadorNome));
                        linha.appendChild(celula(avaliacao.nota));
                        linha.appendChild(celula(avaliacao.comentario));
                        linha.appendChild(celula(avaliacao.dataAvaliacao));
                        corpoTabela.appendChild(linha);
                    });

                    if (elementoResumo) {
                        if (avaliacoes.length === 0) {
                            elementoResumo.textContent = 'Ainda sem avaliacoes.';
                        } else {
                            var soma = avaliacoes.reduce(function (total, a) {
                                return total + a.nota;
                            }, 0);
                            var media = (soma / avaliacoes.length).toFixed(1);
                            elementoResumo.textContent = 'Media: ' + media + ' (' + avaliacoes.length + ' avaliacao(oes))';
                        }
                    }
                })
                .catch(function () {
                    mostrarErro('Nao foi possivel carregar as avaliacoes.');
                });
        }

        var parametros = new URLSearchParams(window.location.search);
        var idDaUrl = parametros.get('id');
        if (idDaUrl) {
            carregarAvaliacoes(idDaUrl);
        } else {
            fetch('/sessao/usuario-logado')
                .then(function (resposta) {
                    if (!resposta.ok) {
                        throw new Error('nao autenticado');
                    }
                    return resposta.json();
                })
                .then(function (sessao) {
                    carregarAvaliacoes(sessao.id);
                })
                .catch(function () {
                    mostrarErro('Faca login para ver suas avaliacoes recebidas, ou acesse com ?id=<id-do-usuario>.');
                });
        }
    });
})();
