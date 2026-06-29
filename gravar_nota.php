<?php
if(!empty($_POST['token']) && !empty($_POST['course']) && !empty($_POST['assignment']) && !empty($_POST['data'])) {

    header('Content-Type: application/json');

    $course = $_POST['course'];
    $assignment = $_POST['assignment'];
    $token = $_POST['token'];
    $data = $_POST['data'];

    function enviar($token, $course, $assignment, $post)
    {

        $ch = curl_init('https://pucminas.instructure.com/api/v1/courses/'.$course.'/assignments/'.$assignment.'/submissions/update_grades');
        $post = json_encode($post);
        $authorization = "Authorization: Bearer " . $token;
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type: application/json', 
            'Accept: application/json',
            $authorization 
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        $result   = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        // Falha de transporte (SSL, rede etc.) — curl_exec retorna false
        if ($result === false) {
            return ['erro' => 'curl', 'detalhe' => $curlErr];
        }

        // Cinto e suspensório: remove o prefixo anti-CSRF, caso ainda venha
        $result = preg_replace('/^while\s*\(1\);\s*/', '', $result);

        $decoded = json_decode($result);

        // Se ainda não for JSON válido, devolve o cru pra você inspecionar
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            return ['erro' => 'json', 'http' => $httpCode, 'bruto' => $result];
        }

        return $decoded;        


    }

    //Exemplo de data que deve vir do html
    $teste = '{
        "grade_data": {
            "110171": {
              "posted_grade": "4"
            }
        }
    }';

    //Post de teste
    //$post = json_decode($teste);

    //Post oficial
    $post = json_decode($data);

    $request = enviar($token, $course, $assignment, $post);

    echo json_encode($request);

}else{
    header('Content-Type: application/json');
    echo "[]";
}
?>