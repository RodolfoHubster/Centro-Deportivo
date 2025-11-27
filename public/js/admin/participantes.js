// public/js/admin/participantes.js

// 1. IMPORTS
import { mostrarMensaje, mostrarModalExito } from '../utils/utilidades.js';
import { actualizarCamposSegunTipo, cargarFacultades, cargarCarreras } from '../utils/formLogica.js';

// 2. VARIABLES GLOBALES
let eventoIdActual = null;
let usuarioIdEditando = null;

// 3. INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    eventoIdActual = urlParams.get('evento_id');
    
    if (eventoIdActual) {
        cargarParticipantes(eventoIdActual);
    } else {
        console.error("ERROR: No hay ID de evento en la URL");
        alert("No se especificó un evento.");
        window.location.href = 'gestionar-eventos.html'; 
    }

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('modalEditarParticipante');
        if (e.target === modal) {
            window.cerrarModal();
        }
    });
});

// 4. FUNCIONES GLOBALES (Para usar en el HTML onclick)

window.cerrarModal = function() {
    const modal = document.getElementById('modalEditarParticipante');
    if(modal) modal.style.display = 'none';
}

window.abrirModalEditar = async function(usuarioString) {
    try {
        const u = JSON.parse(decodeURIComponent(usuarioString));
        usuarioIdEditando = u.usuario_id;

        const contenedor = document.getElementById('contenedor-formulario-externo');
        const modal = document.getElementById('modalEditarParticipante');
        
        if(!contenedor || !modal) return;

        modal.style.display = 'flex';
        contenedor.innerHTML = '<p style="text-align:center; padding:20px;">Cargando formulario...</p>';

        // Cargar HTML parcial
        const response = await fetch('../includes/form_inscripcion_partial.html');
        if (!response.ok) throw new Error(`Error cargando form HTML`);
        
        const html = await response.text();
        contenedor.innerHTML = html;

        await inicializarFormulario(u);

    } catch (error) {
        console.error("Error en abrirModalEditar:", error);
        alert("Error al abrir edición: " + error.message);
    }
}

window.eliminarParticipante = async function(inscripcionId, nombre) {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;
    
    try {
        const response = await fetch('../../php/admin/eliminarParticipante.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inscripcion_id: inscripcionId, evento_id: eventoIdActual })
        });
        const data = await response.json(); 
        
        if (data.success) {
            mostrarMensaje(data.mensaje, 'success');
            cargarParticipantes(eventoIdActual);
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
        mostrarMensaje("Error al eliminar", 'error');
    }
}

// 5. FUNCIONES INTERNAS

async function inicializarFormulario(usuario) {
    const form = document.getElementById('formDatosParticipante');
    if(!form) return;

    const selectFacultad = form.querySelector('#select-facultad');
    const selectCarrera = form.querySelector('#select-carrera');
    const rutaPHP = '../../php/public/'; 
    
    cargarFacultades(selectFacultad, rutaPHP);

    selectFacultad.addEventListener('change', (e) => {
        cargarCarreras(e.target.value, selectCarrera, rutaPHP);
    });

    // Llenar datos
    if(form.elements['matricula']) form.elements['matricula'].value = usuario.matricula;
    if(form.elements['nombres']) form.elements['nombres'].value = usuario.nombre;
    if(form.elements['apellido_paterno']) form.elements['apellido_paterno'].value = usuario.apellido_paterno;
    if(form.elements['apellido_materno']) form.elements['apellido_materno'].value = usuario.apellido_materno;
    if(form.elements['correo']) form.elements['correo'].value = usuario.correo;
    if(form.elements['genero']) form.elements['genero'].value = usuario.genero;

    // Tipo de usuario
    const radios = form.querySelectorAll('input[name="tipo_participante"]');
    let tipoUsuario = 'Estudiante';
    radios.forEach(r => {
        if (r.value === usuario.rol) {
            r.checked = true;
            tipoUsuario = usuario.rol;
        }
        r.addEventListener('change', () => actualizarCamposSegunTipo(r.value, form));
    });
    
    actualizarCamposSegunTipo(tipoUsuario, form);

    // Interceptar envío
    form.onsubmit = function(e) {
        e.preventDefault();
        guardarEdicion(form);
    };
}

async function guardarEdicion(form) {
    const formData = new FormData(form);
    formData.append('id_usuario', usuarioIdEditando);
    if(formData.has('nombres')) formData.append('nombre', formData.get('nombres'));

    try {
        const response = await fetch('../../php/admin/editarParticipante.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            // 1. Cerrar el formulario de edición
            window.cerrarModal();
            
            // 2. Mostrar el modal de éxito bonito
            mostrarModalExito(data.mensaje, () => {
                // 3. Recargar la tabla cuando den click en Aceptar
                cargarParticipantes(eventoIdActual); 
            });

        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje("Error de conexión", 'error');
    }
}

async function cargarParticipantes(eventoId) {
    const tbody = document.getElementById("cuerpo-tabla");
    const titulo = document.getElementById("titulo-evento");
    const subtitulo = document.getElementById("subtitulo-evento");
    
    try {
        // ... (fetch y manejo de errores)

        const url = `../../php/admin/obtenerParticipantes.php?evento_id=${eventoId}`;
        const response = await fetch(url);
        if(!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if(data.nombre_evento) titulo.textContent = `Participantes: ${data.nombre_evento}`;
            subtitulo.textContent = `Total registrados: ${data.participantes.length}`;

            if (data.participantes.length > 0) {
                
                // === NUEVA LÓGICA DE AGRUPACIÓN POR EQUIPO ===
                const primerParticipante = data.participantes[0];
                const esPorEquipo = primerParticipante.equipo_id !== null;
                
                tbody.innerHTML = ""; 

                if (esPorEquipo) {
                    let equipoActualId = null;
                    let equipoActualNombre = '';
                    let contadorEquipo = 1;

                    data.participantes.forEach(p => {
                        // 1. Detectar cambio de equipo y agregar encabezado
                        if (p.equipo_id !== equipoActualId) {
                            equipoActualId = p.equipo_id;
                            equipoActualNombre = p.nombre_equipo;
                            
                            const encabezadoEquipo = document.createElement('tr');
                            encabezadoEquipo.innerHTML = `
                                <td colspan="6" style="padding: 10px; background: #e8f5e9; font-weight: bold; color: #003366; text-align: left; border-top: 2px solid #003366;">
                                    ${equipoActualNombre ? `EQUIPO ${contadorEquipo}: ${equipoActualNombre}` : 'EQUIPO SIN NOMBRE'}
                                </td>
                            `;
                            tbody.appendChild(encabezadoEquipo);
                            contadorEquipo++;
                        }
                        
                        // 2. Renderizar fila del participante
                        const fila = document.createElement("tr");
                        const usuarioObj = encodeURIComponent(JSON.stringify(p));
                        
                        const etiquetaCapitan = p.es_capitan == 1 
                            ? '<span class="tag-capitan" style="background:#f9b233; color:#333; padding:2px 5px; border-radius:4px; font-weight:bold; font-size:0.8em;">CAPITÁN</span>' 
                            : '';
                        
                        // Nuevo: Mostrar el rol (Estudiante/Docente/Externo) + etiqueta de Capitán
                        const rolDisplay = `${p.rol} ${etiquetaCapitan}`;

                        fila.innerHTML = `
                            <td>${p.matricula}</td>
                            <td>${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}</td>
                            <td>${p.correo}</td>
                            <td>${p.genero || 'No especificado'}</td>
                            <td>${rolDisplay}</td>
                            <td style="display:flex; gap:5px;">
                                <button onclick="abrirModalEditar('${usuarioObj}')" style="padding:5px 10px; background:#ffc107; border:none; border-radius:4px; cursor:pointer;">Editar</button>
                                <button onclick="eliminarParticipante(${p.inscripcion_id}, '${p.nombre}')" style="padding:5px 10px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Eliminar</button>
                            </td>
                        `;
                        tbody.appendChild(fila);
                    });
                } else {
                    // === LÓGICA ORIGINAL (Individual) ===
                    data.participantes.forEach(p => {
                        const fila = document.createElement("tr");
                        const usuarioObj = encodeURIComponent(JSON.stringify(p));
                        const etiquetaCapitan = p.es_capitan == 1 ? '<span class="tag-capitan" style="background:#ffd700; padding:2px 5px; border-radius:4px; font-weight:bold; font-size:0.8em;">Capitán</span>' : '';

                        fila.innerHTML = `
                            <td>${p.matricula}</td>
                            <td>${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}</td>
                            <td>${p.correo}</td>
                            <td>${p.genero || 'No especificado'}</td>
                            <td>${p.rol} ${etiquetaCapitan}</td>
                            <td style="display:flex; gap:5px;">
                                <button onclick="abrirModalEditar('${usuarioObj}')" style="padding:5px 10px; background:#ffc107; border:none; border-radius:4px; cursor:pointer;">Editar</button>
                                <button onclick="eliminarParticipante(${p.inscripcion_id}, '${p.nombre}')" style="padding:5px 10px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Eliminar</button>
                            </td>
                        `;
                        tbody.appendChild(fila);
                    });
                }
                
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay participantes inscritos.</td></tr>';
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error: ${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error de conexión.</td></tr>`;
    }
}