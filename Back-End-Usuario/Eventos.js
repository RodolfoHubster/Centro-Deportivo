document.addEventListener("DOMContentLoaded", () => {
    cargarEventos();
    
    const params = new URLSearchParams(window.location.search);
    const eventoId = params.get('id_evento');

    if (eventoId) {
        // Si viene de un QR, mostrar el formulario
        mostrarFormularioInscripcion(eventoId);
        // Scroll al evento después de que carguen
        setTimeout(() => {
            const tarjeta = document.querySelector(`[data-evento-id="${eventoId}"]`);
            if(tarjeta) tarjeta.scrollIntoView({behavior: "smooth", block: "center"});
        }, 500);
    }
});

function cargarEventos(tipo = "") {
    const main = document.querySelector("main");
    
    // Mostrar mensaje de carga
    main.innerHTML = '<p style="text-align: center;">Cargando eventos...</p>';
    
    // Construir URL con filtro opcional
    let url = "../Back-End-PHP/obtenerEventos.php";
    if (tipo) {
        url += `?tipo=${encodeURIComponent(tipo)}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.eventos.length > 0) {
                mostrarEventos(data.eventos);
            } else {
                main.innerHTML = '<p style="text-align: center;">No hay eventos disponibles de este tipo.</p>';
            }
        })
        .catch(error => {
            console.error("Error:", error);
            main.innerHTML = '<p style="text-align: center; color: red;">Error al cargar eventos.</p>';
        });
}

function mostrarEventos(eventos) {
    const main = document.querySelector("main");
    
    // Mantener el título y descripción
    const titulo = main.querySelector('h1');
    const descripcion = main.querySelector('p');
    
    main.innerHTML = "";
    
    if (titulo) main.appendChild(titulo);
    if (descripcion) main.appendChild(descripcion);
    
    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";
        tarjeta.setAttribute('data-evento-id', evento.id); // ✅ IMPORTANTE: Agregar ID
        tarjeta.style.cursor = "pointer";
        tarjeta.style.border = "1px solid #ccc";
        tarjeta.style.borderRadius = "8px";
        tarjeta.style.padding = "15px";
        tarjeta.style.margin = "10px 0";
        tarjeta.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
        tarjeta.style.backgroundColor = "#f9f9f9";
        
        tarjeta.innerHTML = `
            <h2>${evento.nombre}</h2>
            <p><strong>Descripción:</strong> ${evento.descripcion || 'Sin descripción'}</p>
            <p><strong>Fecha:</strong> ${formatearFecha(evento.fecha)}</p>
            <p><strong>Lugar:</strong> ${evento.lugar}</p>
            <p><strong>Actividad:</strong> ${evento.actividad || 'No especificada'}</p>
        `;
        
        main.appendChild(tarjeta);
    });
}

function formatearFecha(fecha) {
    // FIX: Evitar conversión de zona horaria
    const fechaLocal = new Date(fecha + 'T00:00:00');
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fechaLocal.toLocaleDateString('es-MX', opciones);
}