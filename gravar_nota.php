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
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', $authorization));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
        $result = curl_exec($ch);
        curl_close($ch);
        return json_decode($result);

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