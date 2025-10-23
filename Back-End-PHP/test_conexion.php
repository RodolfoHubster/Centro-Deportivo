<?php
// Reportar todos los errores de PHP
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Prueba de Conexión a la BD</h1>";

$servidor = "localhost";
$usuario = "root";
$password = "Konosuba2017"; // <-- PON TU CONTRASEÑA AQUÍ
$bd = "centro_deportivo_uabc";

// Intentar conectar
$conexion = mysqli_connect($servidor, $usuario, $password, $bd);

// Verificar la conexión
if (!$conexion) {
    echo "<h2 style='color: red;'>Error al conectar:</h2>";
    echo "<p><strong>Error número:</strong> " . mysqli_connect_errno() . "</p>";
    echo "<p><strong>Descripción del error:</strong> " . mysqli_connect_error() . "</p>";
    
    echo "<hr><h3>Posibles Soluciones:</h3>";
    echo "<ul>";
    if (mysqli_connect_errno() == 1045) {
        echo "<li><strong>Acceso denegado (Error 1045):</strong> La contraseña ('$password') o el usuario ('$usuario') son incorrectos.</li>";
    } elseif (mysqli_connect_errno() == 1044) {
        echo "<li><strong>Acceso denegado (Error 1044):</strong> El usuario 'root' no tiene permisos para acceder a la base de datos '$bd'.</li>";
    } elseif (mysqli_connect_errno() == 1049) {
        echo "<li><strong>Base de datos desconocida (Error 1049):</strong> La base de datos '$bd' no existe. ¿La importaste correctamente en phpMyAdmin?</li>";
    } elseif (mysqli_connect_errno() == 2002) {
         echo "<li><strong>No se puede conectar (Error 2002):</strong> El servidor de MySQL no está corriendo en '$servidor' o el puerto es incorrecto.</li>";
    } else {
        echo "<li>Revisa que el servidor MySQL esté activo.</li>";
        echo "<li>Revisa que el nombre de la base de datos, usuario y contraseña sean correctos.</li>";
    }
    echo "</ul>";

} else {
    echo "<h2 style='color: green;'>¡Conexión Exitosa!</h2>";
    echo "<p>PHP se conectó correctamente a la base de datos: <strong>$bd</strong></p>";
    
    // Cerrar la conexión
    mysqli_close($conexion);
}
?>