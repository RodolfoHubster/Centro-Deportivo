<?php
header('Content-Type: application/json; charset=utf-8');
include '../includes/conexion.php';

try {
    // 1. Contar Eventos
    $sqlEventos = "SELECT COUNT(*) as total FROM evento";
    $resEventos = mysqli_query($conexion, $sqlEventos);
    $dataEventos = mysqli_fetch_assoc($resEventos);
    
    // 2. Contar Inscripciones
    $sqlInscripciones = "SELECT COUNT(*) as total FROM inscripcion";
    $resInscripciones = mysqli_query($conexion, $sqlInscripciones);
    $dataInscripciones = mysqli_fetch_assoc($resInscripciones);

    echo json_encode([
        'success' => true,
        'total_eventos' => $dataEventos['total'],
        'total_inscripciones' => $dataInscripciones['total']
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>