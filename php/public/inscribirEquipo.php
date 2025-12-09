<?php
/**
 * Inscribir Equipo - VERSIÓN CORREGIDA (Mayúsculas y Matrículas Opcionales)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include '../includes/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Método no permitido'
    ]);
    exit;
}

// Iniciar transacción
mysqli_begin_transaction($conexion);

try {
    // ===================================
    // 1. VALIDAR DATOS BÁSICOS
    // ===================================
    
    if (!isset($_POST['evento_id']) || empty($_POST['evento_id'])) {
        throw new Exception('El ID del evento es obligatorio');
    }
    if (!isset($_POST['nombre_equipo']) || empty(trim($_POST['nombre_equipo']))) {
        throw new Exception('El nombre del equipo es obligatorio');
    }
    // NOTA: Quitamos la validación estricta de 'capitan_matricula' aquí al inicio,
    // porque si el capitán es externo, esto podría venir vacío. Lo validaremos más abajo.

    if (!isset($_POST['integrantes']) || !is_array($_POST['integrantes']) || empty($_POST['integrantes'])) {
        throw new Exception('Debes proporcionar al menos un integrante');
    }
    
    $evento_id = intval($_POST['evento_id']);
    $nombre_equipo = mysqli_real_escape_string($conexion, trim($_POST['nombre_equipo']));
    $integrantes = $_POST['integrantes'];
    
    // ===================================
    // 2. VERIFICAR QUE EL EVENTO EXISTE Y PERMITE EQUIPOS
    // ===================================
    
    $sqlEvento = "SELECT id, nombre, tipo_registro, cupo_maximo, registros_actuales, activo,
                         integrantes_min, integrantes_max 
                  FROM evento WHERE id = ?";
    
    $stmt = mysqli_prepare($conexion, $sqlEvento);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    $resultadoEvento = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoEvento) === 0) {
        throw new Exception('El evento seleccionado no existe');
    }
    $evento = mysqli_fetch_assoc($resultadoEvento);
    mysqli_stmt_close($stmt);
    
    if (!$evento['activo']) {
        throw new Exception('El evento no está disponible para inscripciones');
    }
    if ($evento['tipo_registro'] !== 'Por equipos') {
        throw new Exception('Este evento no acepta inscripciones por equipos');
    }
    if ($evento['cupo_maximo'] > 0 && $evento['registros_actuales'] >= $evento['cupo_maximo']) {
        throw new Exception('El evento ha alcanzado el cupo máximo de equipos');
    }
    
    // ===================================
    // 3. PROCESAMIENTO PREVIO Y NORMALIZACIÓN
    // ===================================
    
    // Aquí vamos a limpiar los datos, corregir mayúsculas y asignar IDs reales (matricula o correo)
    $integrantes_procesados = [];
    $ids_reales = []; // Para verificar duplicados
    
    // Definimos roles libres
    $roles_libres = ['Externo', 'Personal de servicio'];
    $tipos_validos = ['Estudiante', 'Docente', 'Personal académico', 'Personal de servicio', 'Externo'];

    foreach ($integrantes as $index => $integrante) {
        
        // 1. Corregir el Rol (Mayúscula -> Minúscula)
        $tipo_raw = $integrante['tipo_participante'] ?? 'Estudiante';
        if ($tipo_raw === 'Personal de Servicio') {
            $tipo_raw = 'Personal de servicio';
        }
        $integrante['tipo_participante'] = $tipo_raw; // Guardamos el corregido

        // 2. Determinar ID Real (Matrícula o Correo)
        $es_libre = in_array($tipo_raw, $roles_libres);
        $matricula_input = trim($integrante['matricula']);
        $correo_input = trim($integrante['correo']);

        if (empty($matricula_input)) {
            if ($es_libre) {
                // Si es rol libre y no puso matrícula, usamos el correo como ID
                $integrante['matricula'] = $correo_input; 
            } else {
                throw new Exception("El integrante " . ($index + 1) . " debe tener matrícula (Role: $tipo_raw)");
            }
        }
        
        // Guardamos el integrante ya "parchado"
        $integrantes_procesados[] = $integrante;
        $ids_reales[] = $integrante['matricula'];
    }

    // Identificar al Capitán: Asumimos que el integrante[0] SIEMPRE es el capitán 
    // (ya que el formulario JS así lo estructura).
    $capitan_real_id = $integrantes_procesados[0]['matricula'];

    // ===================================
    // 4. VALIDACIONES DE CANTIDAD Y DUPLICADOS
    // ===================================
    
    $num_integrantes = count($integrantes_procesados);
    $min = $evento['integrantes_min'];
    $max = $evento['integrantes_max'];

    if ($min == 0 || $min == NULL) $min = 1;
    if ($max == 0 || $max == NULL) $max = 999; 

    if ($num_integrantes < $min || $num_integrantes > $max) {
        throw new Exception("El equipo debe tener entre {$min} y {$max} integrantes. Actualmente tiene {$num_integrantes}");
    }
    
    // Verificar duplicados dentro del mismo equipo
    if (count($ids_reales) !== count(array_unique($ids_reales))) {
        throw new Exception('Hay correos o matrículas duplicadas en la lista de integrantes');
    }
    
    // ===================================
    // 5. REGISTRAR/ACTUALIZAR PARTICIPANTES
    // ===================================
    
    $usuario_ids = []; 
    $capitan_usuario_id = 0;
    $integrantes_nombres_finales = []; 

    foreach ($integrantes_procesados as $integrante) {
        
        // Datos ya limpios del paso anterior
        $matricula = mysqli_real_escape_string($conexion, $integrante['matricula']);
        $tipo_participante = mysqli_real_escape_string($conexion, $integrante['tipo_participante']);
        
        // Validar otros campos obligatorios
        if (empty(trim($integrante['nombres']))) throw new Exception('Todos los integrantes deben tener nombre');
        
        $nombres = mysqli_real_escape_string($conexion, trim($integrante['nombres']));
        $apellido_paterno = mysqli_real_escape_string($conexion, trim($integrante['apellido_paterno']));
        $apellido_materno = mysqli_real_escape_string($conexion, trim($integrante['apellido_materno']));
        $correo = mysqli_real_escape_string($conexion, trim($integrante['correo']));
        $genero = mysqli_real_escape_string($conexion, trim($integrante['genero']));
        $carrera_id = isset($integrante['carrera_id']) && !empty($integrante['carrera_id']) ? intval($integrante['carrera_id']) : NULL;
        
        // Validar rol válido
        if (!in_array($tipo_participante, $tipos_validos)) {
            throw new Exception("El rol '{$tipo_participante}' no es válido");
        }
        
        $current_usuario_id = 0;
        
        // Verificar si el usuario ya existe
        $sqlCheckUsuario = "SELECT id FROM usuario WHERE matricula = ?";
        $stmt = mysqli_prepare($conexion, $sqlCheckUsuario);
        mysqli_stmt_bind_param($stmt, 's', $matricula);
        mysqli_stmt_execute($stmt);
        $resultadoUsuario = mysqli_stmt_get_result($stmt);
        
        if ($row = mysqli_fetch_assoc($resultadoUsuario)) {
            // === USUARIO EXISTE ===
            $current_usuario_id = $row['id'];
            mysqli_stmt_close($stmt);
            
            $sqlUpdateUsuario = "UPDATE usuario 
                                 SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
                                     correo = ?, genero = ?, carrera_id = ?, rol = ?, activo = 1
                                 WHERE id = ?";
            $stmt = mysqli_prepare($conexion, $sqlUpdateUsuario);
            mysqli_stmt_bind_param(
                $stmt, 'sssssisi',
                $nombres, $apellido_paterno, $apellido_materno, $correo, $genero, $carrera_id, $tipo_participante, $current_usuario_id
            );
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);

        } else {
            // === USUARIO NO EXISTE ===
            mysqli_stmt_close($stmt);
            
            $sqlUsuario = "INSERT INTO usuario 
                           (matricula, nombre, apellido_paterno, apellido_materno, 
                            correo, genero, carrera_id, rol, activo, contrasena) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)";
            $stmt = mysqli_prepare($conexion, $sqlUsuario);
            mysqli_stmt_bind_param(
                $stmt, 'ssssssis', 
                $matricula, $nombres, $apellido_paterno, $apellido_materno, $correo, $genero, $carrera_id, $tipo_participante
            );
            
            if (!mysqli_stmt_execute($stmt)) {
                // Error común: Correo duplicado (cuando intentan registrarse dos veces con diferente matrícula pero mismo correo, o viceversa)
                if (strpos(mysqli_stmt_error($stmt), 'correo') !== false) {
                    throw new Exception("El correo {$correo} ya está registrado por otro usuario.");
                }
                throw new Exception("Error al registrar participante {$matricula}: " . mysqli_stmt_error($stmt));
            }
            $current_usuario_id = mysqli_insert_id($conexion);
            mysqli_stmt_close($stmt);
        }
        
        $usuario_ids[$matricula] = $current_usuario_id;
        
        // Verificar si este es el capitán
        if ($matricula === $capitan_real_id) {
            $capitan_usuario_id = $current_usuario_id;
        }
        
        $integrantes_nombres_finales[] = "$apellido_paterno $apellido_materno $nombres";
    }

    if ($capitan_usuario_id === 0) {
        throw new Exception('Error interno: No se pudo identificar al capitán del equipo.');
    }

    // ===================================
    // 6. VERIFICAR QUE NINGÚN INTEGRANTE YA ESTÉ INSCRITO
    // ===================================
    
    $lista_ids_usuarios = array_values($usuario_ids);
    $placeholders = str_repeat('?,', count($lista_ids_usuarios) - 1) . '?';
    
    $sqlCheckInscritos = "SELECT u.nombre, u.apellido_paterno 
                          FROM inscripcion i
                          JOIN usuario u ON i.usuario_id = u.id
                          WHERE i.evento_id = ? AND i.usuario_id IN ($placeholders)";
    
    $stmt = mysqli_prepare($conexion, $sqlCheckInscritos);
    
    $types = 'i' . str_repeat('i', count($lista_ids_usuarios));
    $params = array_merge([$evento_id], $lista_ids_usuarios);

    mysqli_stmt_bind_param($stmt, $types, ...$params);
    
    mysqli_stmt_execute($stmt);
    $resultadoInscritos = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($resultadoInscritos) > 0) {
        $yaInscritos = [];
        while ($row = mysqli_fetch_assoc($resultadoInscritos)) {
            $yaInscritos[] = $row['nombre'] . ' ' . $row['apellido_paterno'];
        }
        throw new Exception('Los siguientes participantes ya están inscritos: ' . implode(', ', $yaInscritos));
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 7. CREAR EL EQUIPO
    // ===================================
    
    $sqlEquipo = "INSERT INTO equipo (nombre, evento_id, capitan_usuario_id, fecha_registro) 
                    VALUES (?, ?, ?, NOW())";
    $stmt = mysqli_prepare($conexion, $sqlEquipo);
    mysqli_stmt_bind_param($stmt, 'sii', $nombre_equipo, $evento_id, $capitan_usuario_id);
    
    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error al crear el equipo: ' . mysqli_stmt_error($stmt));
    }
    
    $equipo_id = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 8. REGISTRAR INSCRIPCIONES DEL EQUIPO
    // ===================================
    
    $sqlInscripcion = "INSERT INTO inscripcion 
                        (evento_id, usuario_id, equipo_id, es_capitan, metodo_registro, fecha_inscripcion) 
                        VALUES (?, ?, ?, ?, 'Web', NOW())";
    $stmt = mysqli_prepare($conexion, $sqlInscripcion);
    
    foreach ($usuario_ids as $matricula => $usuario_id) {
        $es_capitan = ($usuario_id === $capitan_usuario_id) ? 1 : 0;
        
        mysqli_stmt_bind_param($stmt, 'iiii', $evento_id, $usuario_id, $equipo_id, $es_capitan);
        
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception("Error al inscribir participante: " . mysqli_stmt_error($stmt));
        }
    }
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 9. ACTUALIZAR CONTADOR DE REGISTROS
    // ===================================
    
    $sqlUpdateContador = "UPDATE evento 
                          SET registros_actuales = registros_actuales + 1 
                          WHERE id = ?";
    $stmt = mysqli_prepare($conexion, $sqlUpdateContador);
    mysqli_stmt_bind_param($stmt, 'i', $evento_id);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    
    // ===================================
    // 10. CONFIRMAR Y RESPONDER
    // ===================================
    
    mysqli_commit($conexion);
    
    echo json_encode([
        'success' => true,
        'mensaje' => "¡Equipo '{$nombre_equipo}' registrado exitosamente!",
        'datos' => [
            'equipo_id' => $equipo_id,
            'nombre_equipo' => $nombre_equipo,
            'integrantes' => $integrantes_nombres_finales
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    mysqli_rollback($conexion);
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'mensaje' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
mysqli_close($conexion);
?>