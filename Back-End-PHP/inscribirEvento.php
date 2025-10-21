<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Usar la conexión existente
include 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    try {
        // Validar campos obligatorios básicos
        $camposRequeridos = ['nombre', 'correo', 'evento_id', 'tipo_participante', 'genero'];
        foreach ($camposRequeridos as $campo) {
            if (!isset($_POST[$campo]) || empty(trim($_POST[$campo]))) {
                throw new Exception("El campo {$campo} es obligatorio");
            }
        }
        
        // Obtener y limpiar datos
        $nombre = mysqli_real_escape_string($conexion, trim($_POST['nombre']));
        $correo = mysqli_real_escape_string($conexion, trim($_POST['correo']));
        $telefono = isset($_POST['telefono']) ? mysqli_real_escape_string($conexion, trim($_POST['telefono'])) : 'N/A';
        $evento_id = intval($_POST['evento_id']);
        $tipo_participante = mysqli_real_escape_string($conexion, trim($_POST['tipo_participante']));
        $matricula = isset($_POST['matricula']) && !empty($_POST['matricula']) ? mysqli_real_escape_string($conexion, trim($_POST['matricula'])) : NULL;
        $genero = mysqli_real_escape_string($conexion, trim($_POST['genero']));
        $facultad_id = isset($_POST['facultad']) && !empty($_POST['facultad']) ? intval($_POST['facultad']) : NULL;
        $carrera_id = isset($_POST['carrera']) && !empty($_POST['carrera']) ? intval($_POST['carrera']) : NULL;
        
        // Validar formato de correo
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Formato de correo electrónico inválido');
        }
        
        // Validar que el evento existe
        $sqlEvento = "SELECT id, nombre FROM evento WHERE id = $evento_id";
        $resultadoEvento = mysqli_query($conexion, $sqlEvento);
        
        if (mysqli_num_rows($resultadoEvento) == 0) {
            throw new Exception('El evento seleccionado no existe');
        }
        
        $evento = mysqli_fetch_assoc($resultadoEvento);
        
        // Verificar si ya está inscrito con ese correo en ese evento
        $sqlVerificar = "SELECT id FROM inscripcion WHERE correo = '$correo' AND id_evento = $evento_id";
        $resultadoVerificar = mysqli_query($conexion, $sqlVerificar);
        
        if (mysqli_num_rows($resultadoVerificar) > 0) {
            throw new Exception('Ya estás registrado en este evento con este correo');
        }
        
        // Preparar valores NULL correctamente
        $matricula_sql = $matricula ? "'$matricula'" : "NULL";
        $facultad_sql = $facultad_id ? $facultad_id : "NULL";
        $carrera_sql = $carrera_id ? $carrera_id : "NULL";
        
        // Insertar inscripción (sin crear usuario)
        $sqlInscripcion = "INSERT INTO inscripcion 
                          (id_usuario, correo, telefono, id_evento, tipo_participante, matricula, genero, facultad_id, carrera_id, fecha_inscripcion) 
                          VALUES 
                          (NULL, '$correo', '$telefono', $evento_id, '$tipo_participante', $matricula_sql, '$genero', $facultad_sql, $carrera_sql, NOW())";
        
        if (!mysqli_query($conexion, $sqlInscripcion)) {
            throw new Exception('Error al procesar inscripción: ' . mysqli_error($conexion));
        }
        
        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'mensaje' => "¡Te has registrado exitosamente al evento '{$evento['nombre']}'! Recibirás un correo de confirmación."
        ]);
        
    } catch(Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'mensaje' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Método no permitido'
    ]);
}

mysqli_close($conexion);
?>