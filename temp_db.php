<?php
include 'c:/xampp/htdocs/Centro-Deportivo/php/includes/conexion.php';
$res = mysqli_query($conexion, 'DESCRIBE inscripcion_pausa_activa');
while($row = mysqli_fetch_assoc($res)) {
    print_r($row);
}
?>
