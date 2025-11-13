<?php

/**
 * Archivo de Conexion a la Base de Datos
 * Centro Deportivo UABC
 */

// Configuracion de la base de datos
$servidor = "svdm056.serverneubox.com.mx";
$usuario  = "glevanco_cdeportivo";
$password = "cdDeportivo.25";
$bd       = "glevanco_cdeportivo";

// establecer conexión
$conexion = mysqli_connect($servidor, $usuario, $password, $bd);

// Verificar conexion
if (!$conexion) {
    // En produccion, no mostrar detalles del error
    if (getenv('APP_ENV') === 'production') {
        die(json_encode([
            'success' => false,
            'mensaje' => 'Error de conexion a la base de datos'
        ]));
    } else {
        die("Error de conexion: " . mysqli_connect_error());
    }
}

// Configurar charset UTF-8
mysqli_set_charset($conexion, "utf8mb4"); // UTF8MB4 soporta emojis

// Configurar zona horaria
date_default_timezone_set('America/Tijuana');
mysqli_query($conexion, "SET time_zone = '-08:00'"); // PST (invierno)
// mysqli_query($conexion, "SET time_zone = '-07:00'"); // PDT (verano)

// OPCIONAL: Configurar modo SQL estricto para mayor seguridad
mysqli_query($conexion, "SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE'");

/**
 * NOTA: Para usar prepared statements (mas seguro):
 * 
 * // Crear conexion con mysqli OOP
 * $conn = new mysqli($servidor, $usuario, $password, $bd);
 * 
 * if ($conn->connect_error) {
 *     die("Error: " . $conn->connect_error);
 * }
 * 
 * $conn->set_charset("utf8mb4");
 */

// Variable global para compatibilidad con codigo existente
$conn = $conexion;
?>
