<?php
/**
 * Archivo de Conexión a la Base de Datos
 * Centro Deportivo UABC
 */

// Configuración de la base de datos
$servidor = "localhost";
$usuario = "root";
$password = ""; // ⚠️ IMPORTANTE: Cambiar en producción
$bd = "centro_deportivo_uabc";

// Establecer conexión
$conexion = mysqli_connect($servidor, $usuario, $password, $bd);

// Verificar conexión
if (!$conexion) {
    // En producción, no mostrar detalles del error
    if (getenv('APP_ENV') === 'production') {
        die(json_encode([
            'success' => false,
            'mensaje' => 'Error de conexión a la base de datos'
        ]));
    } else {
        die("Error de conexión: " . mysqli_connect_error());
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
 * NOTA: Para usar prepared statements (más seguro):
 * 
 * // Crear conexión con mysqli OOP
 * $conn = new mysqli($servidor, $usuario, $password, $bd);
 * 
 * if ($conn->connect_error) {
 *     die("Error: " . $conn->connect_error);
 * }
 * 
 * $conn->set_charset("utf8mb4");
 */

// Variable global para compatibilidad con código existente
$conn = $conexion;
?>