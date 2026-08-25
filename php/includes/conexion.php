<?php
/* --------------------------------------------------------------------------
   SALIDA LIMPIA PARA LAS RESPUESTAS JSON
   Todos los endpoints de este proyecto responden JSON. Cualquier aviso que PHP
   imprima ANTES del JSON lo vuelve invalido y el front revienta al parsearlo.

   Pasaba en produccion: el servidor corre PHP 8.4 y google/apiclient 2.15 usa
   parametros nullable implicitos, que 8.4 marca como Deprecated. Esos avisos
   se colaban en la respuesta y ademas filtraban la ruta absoluta del servidor.

   Los errores se siguen registrando en el log de PHP; solo dejan de imprimirse
   en la respuesta, que es como debe ser en una API.
   -------------------------------------------------------------------------- */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

ini_set('session.cookie_httponly', 1); // Javascript no puede leer la cookie
ini_set('session.use_only_cookies', 1); // Fuerza uso de cookies (no ID en URL)
ini_set('session.cookie_secure', 1);   // Solo si tienes HTTPS (Recomendado)
ini_set('session.cookie_samesite', 'Strict'); // Protege contra CSRF

/**
 * Archivo de Conexion a la Base de Datos
 * Centro Deportivo UABC
 */

// 1. Cargar el Autoloader de Composer
// __DIR__ es la carpeta actual (php/includes), subimos 2 niveles para llegar a 'vendor'
require_once __DIR__ . '/../../vendor/autoload.php';

// 2. Cargar las variables del archivo .env
use Dotenv\Dotenv;

try {
    // Buscamos el archivo .env en la raíz del proyecto (2 niveles arriba)
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../../');
    // safeLoad() no lanza error si el archivo no existe (útil si en producción usas variables de servidor reales)
    $dotenv->safeLoad(); 
} catch (Exception $e) {
    // Si hay un error crítico cargando .env, podrías registrarlo aquí
}

// 3. Configuración de la base de datos (Leyendo del entorno)
// Usamos $_ENV con fallback a getenv() por compatibilidad de servidores
$servidor = $_ENV['DB_HOST'] ?? getenv('DB_HOST');
$usuario  = $_ENV['DB_USER'] ?? getenv('DB_USER');
$password = $_ENV['DB_PASS'] ?? getenv('DB_PASS');
$bd       = $_ENV['DB_NAME'] ?? getenv('DB_NAME');

// establecer conexión
$conexion = mysqli_connect($servidor, $usuario, $password, $bd);

// Verificar conexion
if (!$conexion) {
    // Obtenemos el entorno (local o production)
    $app_env = $_ENV['APP_ENV'] ?? getenv('APP_ENV');

    // En produccion, no mostrar detalles del error
    if ($app_env === 'production') {
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
 * * // Crear conexion con mysqli OOP
 * $conn = new mysqli($servidor, $usuario, $password, $bd);
 * * if ($conn->connect_error) {
 * die("Error: " . $conn->connect_error);
 * }
 * * $conn->set_charset("utf8mb4");
 */

// Variable global para compatibilidad con codigo existente
$conn = $conexion;
?>