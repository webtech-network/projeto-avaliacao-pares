<?php

if(!empty($_POST['token']) && !empty($_POST['course']) && !empty($_POST['assignment'])) {

    header('Content-Type: application/json');

 
    $courses = $_POST['course'];
    $assignments = $_POST['assignment'];
    $token = $_POST['token'];

    $curso = "";
    $atividade = "";
    $nota_maxima = "";

    class Aluno
    {
        public $id;
        public $nome;
        public $img;
        public $estado;
        public $download;
        public $nota_canvas;
        public $comentarios;
    }

    class Avaliacao
    {
        public $id_aluno;
        public $asset_id;
        public $assessor_id;
        public $nome;
        public $nota;
    }

    $alunos = array();
    $avaliacoes = array();

//Cabeçalho
    $opts = [
        "http" => [
            "method" => "GET",
            'header' => "Accept: application/json\r\n" .
                "Authorization: Bearer $token\r\n" .
                "Content-Type: application/json\r\n" .
                "cache-control: no-cache\r\n"]
    ];

    $context = stream_context_create($opts);

//Descobrir nome do curso

    $requisicao_course = "https://pucminas.instructure.com/api/v1/courses/".$courses;

    $arquivo_curso =file_get_contents($requisicao_course, false, $context);

    $data_curso = json_decode($arquivo_curso);

    $curso = $data_curso->name;

//Descobrir Rubrica da Atividade

    $requisicao_rubrica = "https://pucminas.instructure.com/api/v1/courses/$courses/assignments/$assignments";
    $arquivo_rubrica = file_get_contents($requisicao_rubrica, false, $context);
    $data_rubrica = json_decode($arquivo_rubrica);

    $atividade = $data_rubrica->name;
    $rubric = $data_rubrica->rubric_settings->id;
    $nota_maxima = $data_rubrica->rubric_settings->points_possible;


//Pegar lista de alunos da submissão (faz loop para quebrar a barreira dos 100 registros por página
    $page = 1;
    $requisicao_alunos = "https://pucminas.instructure.com/api/v1/courses/$courses/assignments/$assignments/submissions?include[]=user&include[]=submission_comments&per_page=100&page=";

    $alunos_final = '';

    $check_retorno = true;

    while ($check_retorno == true){
        $arquivo_alunos = file_get_contents($requisicao_alunos . $page, false, $context);

        $data_alunos = json_decode($arquivo_alunos);

        if(count($data_alunos) > 0) {
            $alunos_final .= substr($arquivo_alunos,1,-1) . ',';
            $page++;
        }else{
            $check_retorno = false;
        }

    }
    //Tirar ultima virgula adicionada no modelo
    $alunos_final = substr($alunos_final, 0, -1);

    $alunos_final = json_decode('[' . $alunos_final . ']');

    foreach ($alunos_final as $dados_aluno) {

        $aluno = new Aluno();
        $aluno->id = $dados_aluno->user->id;
        $aluno->nome = $dados_aluno->user->name;
#        $aluno->img = $dados_aluno->user->avatar_image_url;
        $aluno->estado = $dados_aluno->attempt;
        $aluno->nota_canvas = $dados_aluno->score;

        //if ($aluno->estado == 'submitted') {
        if ($aluno->estado != null) {
            //$aluno->download = $dados_aluno->attachments[0]->url;
            $aluno->download = $dados_aluno->preview_url;
        } else {
            $aluno->download = '';
        }

        $aluno->comentarios = array();
        
        foreach ($dados_aluno->submission_comments as $comentario) {
            $aluno->comentarios[] = array ("autor" => $comentario->author_id, "nome_autor" => $comentario->author_name, "texto" => $comentario->comment);
        }        

        if (!in_array($aluno, $alunos)) {
            $alunos[] = $aluno;
        }

    }

//Ordenando aluno no vetor
    function cmp($a, $b)
    {
        return $a->nome > $b->nome;
    }

    usort($alunos, function($a, $b) { return strlen($b->nome) <=> strlen($a->nome); });


//Descobrir todas as avaliações que foram distribuídas
    $avaliacao_pares = "https://pucminas.instructure.com/api/v1/courses/$courses/assignments/$assignments/peer_reviews?include[]=user";

    $arquivo_avaliacao_pares = file_get_contents($avaliacao_pares, false, $context);

    $dados_avaliacao_pares = json_decode($arquivo_avaliacao_pares);


    foreach ($dados_avaliacao_pares as $avaliacao_pares) {

        $avaliacao = new Avaliacao();
        $avaliacao->id_aluno = $avaliacao_pares->user->id;
        $avaliacao->asset_id = $avaliacao_pares->asset_id;
        $avaliacao->assessor_id = $avaliacao_pares->assessor_id;
        $avaliacao->nome = $avaliacao_pares->assessor->display_name;
        $avaliacao->nota = '---';

        if (!in_array($avaliacao, $avaliacoes)) {
            $avaliacoes[] = $avaliacao;
        }

    }

//Pegar notas das revisões já realizadas
    $avalicoes_realizadas = "https://pucminas.instructure.com/api/v1/courses/$courses/rubrics/$rubric?include[]=peer_assessments&style=full";

    $arquivo_avalicoes_realizadas = file_get_contents($avalicoes_realizadas, false, $context);

    $dados_avalicoes_realizadas = json_decode($arquivo_avalicoes_realizadas);


    foreach ($dados_avalicoes_realizadas->assessments as $avaliacao_realizada) {

        foreach ($avaliacoes as $avaliacao) {

            if ($avaliacao_realizada->assessor_id == $avaliacao->assessor_id && $avaliacao_realizada->artifact_id == $avaliacao->asset_id) {
                $avaliacao->nota = $avaliacao_realizada->score;
            }

        }

    }

    $count = 1;

    $dados_export = array();

    foreach ($alunos as $aluno) {

        $nome = $aluno->nome;
        $id_aluno = $aluno->id;
        $estado = $aluno->estado;
        $url_download = $aluno->download;
        $nota_canvsas = $aluno->nota_canvas;

        //PEGANDO REVISÃO DE PARES E INTEGRALIZANDO NOTA
        $nota_media = 0;
        $soma = 0;
        $avaliadores = "";
        $quant = 0;

        $avaliacoes_array = array();
        foreach ($avaliacoes as $avaliacao) {

            if ($avaliacao->id_aluno == $id_aluno) {

                $avaliadores .= $avaliacao->nome . ' - Nota: ' . $avaliacao->nota . '<br>';

                if ($avaliacao->nota != '---') {
                    $soma += $avaliacao->nota;
                    $quant++;
                }

                $avaliacoes_array[] = array("id" => $avaliacao->assessor_id, "nome" => $avaliacao->nome, "nota" => $avaliacao->nota);
            }

        }

        if ($quant == 0)
            $nota_media = 0;
        else
            $nota_media = round($soma / $quant, 1);

        //DESCOBRINDO SE ESTÁ ESTREGUE
        if ($estado == null) {
            $cor = '#FFE4E4';
            $link_download = '---';
            $nota_media = 0;
        } else {
            $cor = '#E6FFE4';

            $link_download = $url_download;

        }

        if ($estado != null && $quant == 0) {
            $cor = '#ffdfb0';
        }

        $dados_export[] = array("id_aluno" => $id_aluno, "nome" => $nome, "comentarios" => $aluno->comentarios, "nota_canvas" => $nota_canvsas, "nota_media" => $nota_media, "estado" => $estado, "cor" => $cor, "url_download" => $link_download, "avaliadores" => $avaliacoes_array);

        //echo "<tr style='background: $cor;'><td>$nome (ID: $id_aluno)</td><td>$link_download</td><td>$avaliadores</td><td>$nota_media</td></tr>";

    }

    echo json_encode(array("curso" => $curso,"atividade" => $atividade,"nota_maxima" => $nota_maxima, "dados" => $dados_export));

}else{

    header('Content-Type: application/json');
    echo "[]";
}

?>