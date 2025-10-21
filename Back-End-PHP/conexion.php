<?php
$servidor = "localhost";
$usuario = "root";
$password = "";
$bd = "centro_deportivo";

//$bd = "centro_deportivo_uabc";

$conexion = mysqli_connect($servidor, $usuario, $password, $bd);

if (!$conexion) {
    die("Error de conexión: " . mysqli_connect_error());
}

mysqli_set_charset($conexion, "utf8");

// FIX: Configurar zona horaria para evitar problemas con fechas
// Ajusta según tu zona horaria
// Para México (Tijuana): America/Tijuana
// Para Ciudad de México: America/Mexico_City
date_default_timezone_set('America/Tijuana');
mysqli_query($conexion, "SET time_zone = '-07:00'"); // UTC-7 para Tijuana (PDT)
// mysqli_query($conexion, "SET time_zone = '-08:00'"); // UTC-8 para Tijuana (PST)
?>