//Globais
var token = '', course = '', assignment = '';
var tabelaDados;
var notas_copias = [];
var notas_serializadas_canvas = "";
var nota_maxima = 0;
var relatorio_avaliacao = new Map();
var avaliacaoIniciada = false;

$(document).ready(function() {
    // Carrega os parâmetros caso tenham sido passados na query string
    const params = new URLSearchParams(window.location.search);
    // Lista dos campos esperados
    const campos = ['token', 'course', 'assignment'];
    campos.forEach(param => {
      const valor = params.get(param);
      if (valor !== null) {
        const input = document.getElementById(param);
        if (input) {
          input.value = valor;
        }
      }
    });

    //Botão de abrir notas
    $('#bt_Abrir').on('click', function () {

        if ($('#token').val() == "" || $('#course').val() == "" || $('#assignment').val() == "") {
            alert('Por favor preencha todos os dados.');
        } else {
            token = $('#token').val();
            course = $('#course').val();
            assignment = $('#assignment').val();

            notas_copias = [];
            processador();
        }

    });

    //Botão para copiar notas
    $('#bt_Copiar').on('click', function () {
        copiarNotas();
    });

    //Botão para gravar notas
    $('#bt_Gravar').on('click', function () {
        enviarNotas();
    });

    //Botão para aplicar penalidades
    $('#bt_Penalidades').on('click', function () {
        aplicarPenalidades();
    });

    //Botão para limpar notas
    $('#bt_Limpar').on('click', function () {
        tabelaDados.column(6).nodes().each(function(node,index,dt){
            html = '<input type="number" min="0" max="'+nota_maxima+'" indice="'+$($(node).html()).attr('indice')+'" value="" class="nota_canvas alterado" id="'+$($(node).html()).attr('id')+'">';
            tabelaDados.cell(node).data(html);
        });

    });

    //Quando modificar o valor do input
    $(document).on('change', '.nota_canvas', function (e) {
        if($(this).val() >= 0 && $(this).val() <= nota_maxima) {
            html = '<input type="number" min="0" max="' + nota_maxima + '" indice="'+$(this).attr('indice')+'" value="' + $(this).val() + '" class="nota_canvas alterado" id="' + $(this).attr('id') + '">';
        }
        else{
            alert("A nota que você está tentando atribuir é maior que a máxima permitida ou menor que 0.");
            html = '<input type="number" min="0" max="' + nota_maxima + '" indice="'+$(this).attr('indice')+'" value="" class="nota_canvas alterado" id="' + $(this).attr('id') + '">';
        }

        tabelaDados.cell({row: Number($(this).attr('indice')), column: 6}).data(html);
    });

     document.addEventListener('input', (event) => {
        const target = event.target;

        // Ignora campos com atributo data-ignore-unsaved="true"
        if (target.tagName === 'INPUT' && target.dataset.ignoreUnsaved !== "true") {
            avaliacaoIniciada = true;
        }
      });

    // Intercepta a tentativa de sair da página
    window.addEventListener('beforeunload', function (e) {
        if (avaliacaoIniciada) {
          // Alguns navegadores modernos não exibem a mensagem personalizada
          e.preventDefault();
          e.returnValue = ''; // Necessário para que o prompt seja exibido
        }
    });

});

var processador = function(){
    $('.principal').css('display','none');
    $('.carregar').css('display','block');

    $.ajax({
        url : "dados_avaliacao.php",
        type : 'post',
        data : {
            token : token,
            course : course,
            assignment : assignment
        },

    })
    .done(function(data){
        $('.carregar').css('display','none');

        relatorio_avaliacao = new Map();

        if(data.length == 0 || data == null || data == false || data == "" || data.length == 0){
            alert('Houve um erro ao processar sua solicitação. Por favor tente novamente.');
        }
        else {
            $('.aguardando').css('display','none');
            $('#dados').DataTable().clear().destroy();
            $('#resultados').empty();
            $('#curso_text').html(data.curso);
            $('#atividade_text').html(data.atividade);
            $('#nota_text').html(data.nota_maxima);
            nota_maxima = data.nota_maxima;
            let penalidade_maxima = $('#valorPenalidade').val();

            mapTableRows = new Map();

            $.each(data.dados, function (key, item) {
                var download = item.url_download != '---' ? '<a href ="'+item.url_download+'" target="_blank" title="Entrega do aluno">📦</a>' : '<span title="Sem entrega">🚫</span>';

                var nota_canvas = item.nota_canvas == null ? "" : item.nota_canvas;

                //MONTANDO AVALIADORES
                var quant = 0;
                var html_avaliadores = "";
                $.each(item.avaliadores, function (key, avaliador) {
                    html_avaliadores += '<li><strong>['+ avaliador.nota +']</strong> <span class="avaliador">'+avaliador.nome+'</span></li>';
                    if(avaliador.nota != '---') {
                        quant++;
                    }

                    let texto_avaliacao = relatorio_avaliacao.get(avaliador.nome)
                    if (texto_avaliacao) {
                        let item_avaliacao = JSON.parse (texto_avaliacao);
                        if (avaliador.nota != '---') {
                            (item_avaliacao.total_notas)? item_avaliacao.total_notas++ : item_avaliacao.total_notas = 1;
                            (item_avaliacao.notas)? item_avaliacao.notas.push(avaliador.nota) : item_avaliacao.notas = [avaliador.nota];
                        }
                        texto_avaliacao = JSON.stringify (item_avaliacao);
                    }
                    else {
                        if (avaliador.nota != '---') {
                            texto_avaliacao = JSON.stringify ({id: avaliador.id, autor: avaliador.nome, total_notas: 1, 
                                  notas: [avaliador.nota], total_comentarios: 0, comentarios: [] })    
                        } else {
                            texto_avaliacao = JSON.stringify ({id: avaliador.id, autor: avaliador.nome, total_notas: 0, 
                                  notas: [], total_comentarios: 0, comentarios: [] })
                        }
                    }
                    relatorio_avaliacao.set (avaliador.nome, texto_avaliacao)
                });
                
                if (html_avaliadores == ""){
                    html_avaliadores = "Sem avaliador";
                } else {
                    html_avaliadores = `<ul>${html_avaliadores}</ul>`
                }

                // MONTANDO COMENTÁRIOS
                var htmlComentariosAvaliadores = "";
                var htmlComentariosAvaliados = "";

                $.each(item.comentarios, function (key, comentario) {
                    htmlComentariosAvaliadores+=`<li><span class="avaliador"><strong>${comentario.nome_autor}</strong> - ${comentario.texto}</span></li>`;
                    let texto_avaliacao = relatorio_avaliacao.get(comentario.nome_autor)
                    if (texto_avaliacao) {
                        let item_avaliacao = JSON.parse (texto_avaliacao);
                        (item_avaliacao.total_comentarios) ? item_avaliacao.total_comentarios++ : item_avaliacao.total_comentarios = 1;
                        (item_avaliacao.comentarios) ? item_avaliacao.comentarios.push(comentario.texto) : item_avaliacao.comentarios = [comentario.texto];
                        texto_avaliacao = JSON.stringify (item_avaliacao);
                        relatorio_avaliacao.set(comentario.nome_autor, texto_avaliacao)
                    }
                });
                if (htmlComentariosAvaliadores == ""){
                    htmlComentariosAvaliadores = "Sem comentários de avaliadores";
                } else {
                    htmlComentariosAvaliadores = `<ul>${htmlComentariosAvaliadores}</ul>`
                }

                //DESCOBRINDO SE ESTÁ ESTREGUE
                cor = (item.estado == null)? '#FFE4E4': '#E6FFE4';

                if(item.estado != null && quant == 0){
                    cor = '#ffdfb0';
                }

                notas_copias.push([item.id_aluno, item.nota_media]);

                var html = `<tr style="background: ${cor}">
                    <td><strong>${item.nome}</strong> <span  class="float-right">${download}</span></td>
                    <td>${item.grupo_num} - ${item.grupo_nome}</td>
                    <td>
                        <button class="float-right" data-toggle="collapse" data-target="#div_msg_${item.id_aluno}" title="Comentário a ser enviado para o aluno com a nota">✉️</button>
                        ${html_avaliadores}
                        <div id="div_msg_${item.id_aluno}" class="collapse mt-3"><input type="text" class="w-100" id="input_msg_${item.id_aluno}"></div>
                    </td>
                    <td>
                        <div class="pl-5">
                            <p>⬅️ <strong>AVALIAÇÕES RECEBIDAS</strong> <br><i>Comentários recebidos no trabalho do aluno por revisores</i><br>
                            ${htmlComentariosAvaliadores}</p>
                            <p>➡️ <strong>AVALIAÇÕES FEITAS</strong> <br><i>Comentários aplicados pelo aluno a colegas</i><br>
                            ***COMENTARIOS_AVALIADOS***</p>
                            <p>Notas aplicadas pelo aluno a colegas: ***NOTAS_APLICADAS***</p>
                        </div>
                    </td>
                    <td>${item.nota_media.toFixed(1)}</td>
                    <td>
                        <input type="checkbox" id="ckb_pena_aluno_${item.id_aluno}">
                        <input type="number" min="0" max="${penalidade_maxima}" value="0" class="nota_canvas" id="pena_aluno_${item.id_aluno}">
                    </td>
                    <td>
                        <input type="number" min="0" max="${nota_maxima}" indice="${key}" value="${nota_canvas}" class="nota_canvas" id="aluno_${item.id_aluno}">
                    </td></tr>`;

                mapTableRows.set(item.nome, html)

            });

            // Substitui no texto HTML dados consolidados so no final do processo (notas e comentários aplicados pelo aluno)
            mapTableRows.forEach ((value_html, key_aluno) => {
                strJSON = relatorio_avaliacao.get (key_aluno)
                let result = ''
                if (strJSON) {
                    let avaliacao = JSON.parse (strJSON)
                    let comments = avaliacao.comentarios.map(x => "<li>" + ((typeof x == 'string') ? x : x.join ('|')) + "</li>").join('')
                    result = value_html.replace('***COMENTARIOS_AVALIADOS***', '<ul>' + comments + '</ul>')
                    let notas = avaliacao.notas.join(' | ').toString()
                    result = result.replace ('***NOTAS_APLICADAS***', notas)
                }
                else {
                    result = value_html.replace('***COMENTARIOS_AVALIADOS***', 'Sem comentários')
                    result = result.replace ('***NOTAS_APLICADAS***', '---')
                }
                $('#resultados').append(result);
            })

            procesarTabela();

            //$('.principal').css('display','block');
            $('.principal').fadeIn(1000);
        }

    })
    .always (() => {
        let texto = []
        relatorio_avaliacao.forEach ((value, key) => {
            obj = JSON.parse (value)
            texto.push (`${obj.autor} - Notas aplicadas [${(obj.notas)?obj.notas.toString():"[]"}] | Total de notas [${(obj.total_notas)?obj.total_notas:0}] | Total de comentarios [${(obj.total_comentarios)?obj.total_comentarios:0}]\n`)
        })
        console.log (texto.sort((a,b) => a.localeCompare(b)).join('\n'))
    })
    .fail(function(jqXHR, textStatus, msg){
        $('.carregar').css('display','none');
        alert('Houve um erro ao processar sua solicitação. Por favor tente novamente.');
    });

}

var procesarTabela = function(){
    tabelaDados = $('#dados').DataTable({
        responsive: true,
        columnDefs: [
            { targets: [0, 2, 4, 5, 6], responsivePriority: 1 },
            { targets: [1, 3], responsivePriority: 2 },
            { targets: [1, 3], className: "text-wrap" },
            { targets: 4, className: "text-right" },
            { targets: [5, 6], className: "text-center"}
        ],
        lengthMenu:[[25,50,100,-1],[25,50,100,"Todos"]],
        "pageLength":100,
        "language": {
            "url": "https://cdn.datatables.net/plug-ins/1.10.21/i18n/Portuguese-Brasil.json"
        }
    });

}

var copiarNotas = function(){
    tabelaDados.column(6).nodes().each(function(node,index,dt){
        let valor = $($(node).html()).val();

        if(valor == "" ) {
            let id_aluno = $($(node).html()).attr('id');
            let id_aluno_num = $($(node).html()).attr('id').substr(6);
            let nota_aluno = 0
            // calclular a nota do aluno
            if ($('#ckb_pena_aluno_'+id_aluno_num).is(':checked')) {
                nota_aluno = procurarMedia(id_aluno_num) - $('#pena_aluno_'+id_aluno_num).val()
            } else {
                nota_aluno = procurarMedia(id_aluno_num)
            }

            html = `<input type="number" min="0" max="${ nota_maxima }" indice="${ $($(node).html()).attr('indice') }" value="${nota_aluno}" class="nota_canvas alterado" id="${ id_aluno }">`;

            // html = '<input type="number" min="0" max="' + nota_maxima + '" indice="' + $($(node).html()).attr('indice') + '" value="'+procurarMedia(id_aluno_num)+'" class="nota_canvas alterado" id="' + id_aluno + '">';
            tabelaDados.cell(node).data(html);
        }
    });

}

var enviarNotas = function(){


    //Serializando para guardar em notas_serializadas_canvas
    notas_serializadas_canvas = '{"grade_data": {';

    tabelaDados.columns(6).every( function () {
        let data = this.data();

        $.each(data, function (key, item) {
            let id_aluno = $(item).attr('id').substr(6);
            let valor
            if($(item).val()) {
                 valor = $(item).val();
            } 
            else {
                valor = "";
            }

            // Monta comentário a ser encaminhado ao aluno juntamente com a nota
            let textoComentario = '';
            if ($('#input_msg_'+id_aluno).val()) {
                textoComentario += 'COMENTÁRIO DO PROCESSO DE CONSOLIDAÇÃO - ' + $('#input_msg_'+id_aluno).val() + ' | ';
            }
            // Se o checkbox de penalidade para o aluno estiver marcado, inclua o texto da penalidade nos comentários
            if ($('#ckb_pena_aluno_'+id_aluno).is(':checked')) {
                textoComentario += 'PENALIDADE APLICADA - ' + $('#textoPenalidade').val();
            }
            notas_serializadas_canvas += `"${id_aluno}": { "posted_grade" : "${valor}", "text_comment": "${textoComentario}" },`;
        });
    } );

    //Tirando a ultima virgula adicionada
    notas_serializadas_canvas = notas_serializadas_canvas.substring(0, notas_serializadas_canvas.length - 1);
    //Fechando o modelos de dados
    notas_serializadas_canvas += '}}';

    console.log(notas_serializadas_canvas);

    //Enviando para o Canvas

    $('.carregar').css('display','block');

    $.ajax({
        url : "gravar_nota.php",
        type : 'post',
        data : {
            token : token,
            course : course,
            assignment : assignment,
            data : notas_serializadas_canvas
        },

    })
    .done(function(data){
        $('.carregar').css('display','none');

        if(data.length == 0 || data == null || data == false || data == ""){
            alert('Erro ao gravar notas no Canvas. Por favor tente novamente.');
        } else {
            if (data.workflow_state == 'queued') {
                alert('Notas gravadas com sucesso!');
            } else{
                alert('Erro ao gravar notas no Canvas. Por favor tente novamente.');
            }
        }

    })
    .fail(function(jqXHR, textStatus, msg){
        $('.carregar').css('display','none');
        alert('Erro ao gravar notas no Canvas. Por favor tente novamente.');
    });

}

var procurarMedia = function(id_aluno){
    for (var i=0; i<notas_copias.length; i++){
        if (notas_copias[i][0] == id_aluno){
            return notas_copias[i][1];
        }
    }
    return 0;
}

var aplicarPenalidades = function(){
    if (relatorio_avaliacao.length == 0) {
        alert ('Não há dados para aplicar penalidades.')
        return;
    }

    let penalidade_maxima = $('#valorPenalidade').val();

    // percorre o mapa de avaliações (relatorio_avaliacao) e para cada aluno, 
    // se o total de notas e o total de comentarios for igual a 0, marca o checkbox
    // e preenche o campo de penalidade com o valor máximo
    relatorio_avaliacao.forEach ((value, key) => {
        obj = JSON.parse (value)
        if (obj.total_notas == 0 || obj.total_comentarios == 0) {
            $('#ckb_pena_aluno_'+obj.id).prop('checked', true)
            $('#pena_aluno_'+obj.id).val(penalidade_maxima)
        }
    }) 

}