<?php
// php/admin/login.php

include '../includes/conexion.php';
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $correo = mysqli_real_escape_string($conexion, trim($_POST['correo']));
    $password = $_POST['password'];
    $ip_actual = $_SERVER['REMOTE_ADDR'];

    // ==================================================================
    // 1. PROTECCIÓN CONTRA FUERZA BRUTA
    // ==================================================================
    // Contamos intentos fallidos de esta IP o Correo en los últimos 15 minutos
    $sqlIntentos = "SELECT COUNT(*) as total 
                    FROM login_attempts 
                    WHERE (ip_address = ? OR email = ?) 
                    AND attempt_time > (NOW() - INTERVAL 15 MINUTE)";
    
    $stmtCheck = mysqli_prepare($conexion, $sqlIntentos);
    mysqli_stmt_bind_param($stmtCheck, 'ss', $ip_actual, $correo);
    mysqli_stmt_execute($stmtCheck);
    $resCheck = mysqli_stmt_get_result($stmtCheck);
    $dataCheck = mysqli_fetch_assoc($resCheck);
    $intentos = $dataCheck['total'];
    mysqli_stmt_close($stmtCheck);

    // Si supera 5 intentos, bloqueamos
    if ($intentos >= 5) {
        // Pequeño retraso artificial (1 segundo)
        sleep(1); 
        echo json_encode([
            'success' => false,
            'mensaje' => 'Demasiados intentos fallidos. Por favor espera 15 minutos.'
        ]);
        exit;
    }

    // ==================================================================
    // 2. LÓGICA DE LOGIN
    // ==================================================================
    
    // NOTA: Asegúrate de que tu tabla 'usuario' tenga la columna 'ultima_actividad'
    $sql = "SELECT * FROM usuario WHERE correo = ? AND rol IN ('Administrador', 'Promotor') AND activo = 1";
    $stmtUser = mysqli_prepare($conexion, $sql);
    mysqli_stmt_bind_param($stmtUser, 's', $correo);
    mysqli_stmt_execute($stmtUser);
    $resultado = mysqli_stmt_get_result($stmtUser);
    
    if ($fila = mysqli_fetch_assoc($resultado)) {
        // Verificar contraseña
        if (password_verify($password, $fila['contrasena'])) {
            
            // ==================================================================
            // VERIFICACIÓN DE SESIÓN ACTIVA (BLOQUEO INTELIGENTE)
            // ==================================================================
            
            $limite_inactividad = 30; // Minutos permitidos de inactividad antes de liberar la cuenta
            $bloquear_acceso = false;

            // Si existe un token de sesión guardado...
            if (!empty($fila['token_sesion'])) {
                
                // Verificamos cuándo fue su última actividad
                if (!empty($fila['ultima_actividad'])) {
                    $fecha_actividad = new DateTime($fila['ultima_actividad']);
                    $ahora = new DateTime();
                    
                    // Calculamos la diferencia
                    $diferencia = $ahora->diff($fecha_actividad);
                    $minutos_pasados = ($diferencia->days * 24 * 60) + ($diferencia->h * 60) + $diferencia->i;
                    
                    // Si la actividad fue hace MENOS de 30 minutos, asumimos que sigue ahí
                    if ($minutos_pasados < $limite_inactividad) {
                        $bloquear_acceso = true;
                    }
                    // Si pasaron MÁS de 30 minutos, no bloqueamos (permitimos "robar" la sesión muerta)
                } else {
                    // Si tiene token pero no fecha (caso raro), bloqueamos por seguridad
                    $bloquear_acceso = true;
                }
            }

            if ($bloquear_acceso) {
                echo json_encode([
                    'success' => false,
                    'mensaje' => 'Acceso denegado: Ya existe una sesión activa reciente en esta cuenta. Cierra la sesión anterior o espera unos minutos.'
                ]);
                exit; // <-- IMPORTANTE: Detener ejecución aquí
            }

            // ==================================================================
            // LOGIN EXITOSO (Si pasamos el bloqueo)
            // ==================================================================

            // A. Limpiar intentos fallidos previos
            $sqlDel = "DELETE FROM login_attempts WHERE ip_address = ? OR email = ?";
            $stmtDel = mysqli_prepare($conexion, $sqlDel);
            mysqli_stmt_bind_param($stmtDel, 'ss', $ip_actual, $correo);
            mysqli_stmt_execute($stmtDel);

            // B. Generar y Guardar Token + Actualizar hora de actividad
            session_regenerate_id(true);
            $nuevo_token = session_id();

            $updateSql = "UPDATE usuario SET token_sesion = ?, ultima_actividad = NOW() WHERE id = ?";
            $stmtUpdate = mysqli_prepare($conexion, $updateSql);
            mysqli_stmt_bind_param($stmtUpdate, 'si', $nuevo_token, $fila['id']);
            mysqli_stmt_execute($stmtUpdate);
            mysqli_stmt_close($stmtUpdate);

            // C. Guardar variables de Sesión PHP
            $_SESSION['user_logged'] = true;
            $_SESSION['user_id'] = $fila['id'];
            $_SESSION['user_nombre'] = $fila['nombre'];
            $_SESSION['user_correo'] = $fila['correo'];
            $_SESSION['user_rol'] = $fila['rol'];

            echo json_encode([
                'success' => true,
                'mensaje' => 'Bienvenido ' . $fila['nombre'],
                'rol' => $fila['rol'],
                'nombre' => $fila['nombre']
            ]);

        } else {
            // --- CONTRASEÑA INCORRECTA ---
            registrarIntentoFallido($conexion, $ip_actual, $correo);

            echo json_encode([
                'success' => false,
                'mensaje' => 'Contraseña incorrecta'
            ]);
        }
    } else {
        // --- USUARIO NO ENCONTRADO O INACTIVO ---
        registrarIntentoFallido($conexion, $ip_actual, $correo);

        echo json_encode([
            'success' => false,
            'mensaje' => 'Usuario no encontrado o no tiene permisos'
        ]);
    }
    mysqli_stmt_close($stmtUser);

} else {
    echo json_encode(['success' => false, 'mensaje' => 'Método no permitido']);
}

mysqli_close($conexion);


// FUNCIÓN AUXILIAR PARA REGISTRAR FALLOS
function registrarIntentoFallido($conn, $ip, $email) {
    $sql = "INSERT INTO login_attempts (ip_address, email) VALUES (?, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'ss', $ip, $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}
?>