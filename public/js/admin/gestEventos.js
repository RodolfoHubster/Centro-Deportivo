// js/admin/gestEventos.js

// 1. --- IMPORTAR MÓDULOS ---
// Importa todas las funciones necesarias de los otros archivos.
import * as api from '../services/apiEventos.js'; // Funciones que hablan con PHP
import * as ui from '../ui/uiEventos.js';       // Funciones que tocan el HTML
import * as modalQR from '../components/qrModal.js'; // Funciones para los modales de QR
import { mostrarMensaje } from '../utils/utilidades.js'; // Importa específicamente mostrarMensaje


// 2. --- VARIABLES GLOBALES ---
// Variables que necesitan mantenerse entre funciones.
let modoEdicion = false;
let eventoEditandoId = null;
let usuarioId = null; // Guardará el ID del admin/promotor logueado
let todosLosEventos = []; // <--- VARIABLE PARA GUARDAR EVENTOS Y FILTRAR

// 3. --- INICIALIZACIÓN DE LA PÁGINA ---
// Se ejecuta cuando el HTML está listo.
window.addEventListener('DOMContentLoaded', inicializarPaginaGestionEventos);

async function inicializarPaginaGestionEventos() {
    // Primero, verifica si hay una sesión activa
    try {
        const dataUsuario = await api.verificarSesion();
        usuarioId = dataUsuario.id; // ¡Importante guardar el ID del promotor!
        console.log('Sesión verificada. Usuario ID:', usuarioId);
    } catch (error) {
        // Si verificarSesion falla (porque no hay login), redirige al login
        console.error("Error de sesión:", error.message);
        mostrarMensaje('No hay sesión activa. Redirigiendo...', 'error');
        // Espera un poco antes de redirigir para que el usuario vea el mensaje
        setTimeout(() => { window.location.href = '../login.html'; }, 1500);
        return; // Detiene la ejecución si no hay sesión
    }

    // Carga todos los datos necesarios en paralelo para más rapidez
    try {
        mostrarMensaje('Cargando datos iniciales...', 'success'); // Muestra mensaje temporal
        const [campus, actividades, facultades, eventos] = await Promise.all([
            api.cargarCampus(),
            api.cargarActividades(),
            api.cargarFacultades(),
            api.cargarEventos()
        ]);

        // Guardar todos los eventos en la variable global
        todosLosEventos = eventos;

        // Una vez cargados, usa las funciones de UI para mostrarlos
        // Poblar selects del MODAL
        ui.poblarSelectCampus(campus);
        ui.poblarSelectActividades(actividades);
        ui.poblarCheckboxesFacultades(facultades);
        
        // Poblar el NUEVO filtro de campus en el admin
        ui.poblarFiltroCampus(campus);

        // Mostrar los eventos
        ui.mostrarEventos(todosLosEventos);
        
        // Ocultar el mensaje de carga si aún está visible
        const mensajeDiv = document.getElementById('mensaje-respuesta');
        if (mensajeDiv.textContent.includes('Cargando')) {
            mensajeDiv.style.display = 'none';
        }

    } catch (error) {
        mostrarMensaje('Error fatal al cargar datos iniciales. Refresca la página.', 'error');
        console.error("Error cargando datos:", error);
    }

    // Configura los botones ("Nuevo", "Cancelar", "Guardar") y la lista
    configurarListenersEventos();

    // Activa la funcionalidad del textarea que crece solo
    ui.inicializarTextareaAutoGrow();
}

// 4. --- CONFIGURAR EVENT LISTENERS ---
// Añade los "escuchadores" a los botones principales y al formulario.
function configurarListenersEventos() {
    // Botón para abrir el modal en modo "Crear"
    document.getElementById('btnNuevoEvento').addEventListener('click', handleNuevoEventoClick);

    // Botón "Cancelar" dentro del modal
    document.getElementById('btnCancelar').addEventListener('click', ui.cerrarModal);

    // Envío del formulario (Crear o Editar)
    document.getElementById('formEvento').addEventListener('submit', handleFormSubmit);
    document.getElementById('evento-tipo-registro').addEventListener('change', handleTipoRegistroChange);

    // --- Delegación de eventos para la lista ---
    document.getElementById('lista-eventos').addEventListener('click', handleListaEventosClick);

    // --- LISTENERS PARA LOS NUEVOS FILTROS ---
    document.getElementById('filtro-buscar-admin').addEventListener('input', aplicarFiltrosAdmin);
    document.getElementById('filtro-campus-admin').addEventListener('change', aplicarFiltrosAdmin);
    document.getElementById('filtro-categoria-admin').addEventListener('change', aplicarFiltrosAdmin);
    document.getElementById('filtro-tipo-admin').addEventListener('change', aplicarFiltrosAdmin);
    
    document.getElementById('btnLimpiarFiltrosAdmin').addEventListener('click', () => {
        document.getElementById('filtro-buscar-admin').value = '';
        document.getElementById('filtro-campus-admin').value = '';
        document.getElementById('filtro-categoria-admin').value = '';
        document.getElementById('filtro-tipo-admin').value = '';
        aplicarFiltrosAdmin(); // Vuelve a mostrar todos los eventos
    });
}

// 5. --- MANEJADORES DE EVENTOS (HANDLERS) ---

/**
 * Se ejecuta al hacer clic en "Crear Nuevo Evento".
 * Prepara el modal para la creación.
 */
function handleNuevoEventoClick() {
    modoEdicion = false;
    eventoEditandoId = null;
    ui.prepararModalParaCrear();
}

/**
 * Se ejecuta cuando se hace clic DENTRO de la lista de eventos.
 * Determina qué botón se presionó (Editar, Eliminar, QR) y actúa.
 */
async function handleListaEventosClick(e) {
    // Busca el botón más cercano al elemento clickeado que tenga 'data-action'
    const boton = e.target.closest('button[data-action]');
    if (!boton) return; // Si no se hizo clic en un botón con acción, no hace nada

    const id = boton.dataset.id; // Obtiene el ID del evento desde 'data-id'
    const accion = boton.dataset.action; // Obtiene la acción ('editar', 'eliminar', 'qr')

    // --- Acción: Editar ---
    if (accion === 'editar') {
        try {
            mostrarMensaje('Cargando datos del evento...', 'success');
            // Busca el evento en la lista local en lugar de llamar a la API
            const evento = todosLosEventos.find(e => e.id == id);
            if (!evento) {
                throw new Error('No se encontró el evento para editar. Recargando...');
            }
            
            modoEdicion = true; // Cambia el estado global
            eventoEditandoId = id;
            ui.poblarFormularioParaEditar(evento); // Llama a la UI para llenar el form
            document.getElementById('modalEvento').style.display = 'block'; // Muestra el modal
            document.getElementById('mensaje-respuesta').style.display = 'none'; // Oculta mensaje
        } catch (error) {
            mostrarMensaje(`Error al cargar evento: ${error.message}`, 'error');
            if (error.message.includes('Recargando')) {
                // Si falla la búsqueda local, recarga todo
                todosLosEventos = await api.cargarEventos();
                aplicarFiltrosAdmin();
            }
        }
    }

    // --- Acción: Eliminar ---
    if (accion === 'eliminar') {
        const nombre = boton.dataset.nombre || 'este evento'; // Obtiene el nombre desde 'data-nombre'
        if (!confirm(`¿Estás seguro de eliminar el evento "${nombre}"? Esta acción no se puede deshacer.`)) {
            return; // Si el usuario cancela, no hace nada
        }

        try {
            mostrarMensaje('Eliminando evento...', 'success');
            const data = await api.eliminarEvento(id); // Llama al API para eliminar
            mostrarMensaje(data.mensaje, data.success ? 'success' : 'error'); // Muestra respuesta
            if (data.success) {
                // Si se eliminó bien, recarga la lista de eventos desde la API
                todosLosEventos = await api.cargarEventos();
                aplicarFiltrosAdmin(); // Vuelve a aplicar filtros
            }
        } catch (error) {
            mostrarMensaje('Error de conexión al eliminar el evento.', 'error');
            console.error(error);
        }
    }

    // --- Acción: Ver QR ---
    if (accion === 'qr') {
        modalQR.generarQR(id); // Llama a la función del módulo qrModal
    }
}

/**
 * Se ejecuta al enviar el formulario (botón "Guardar Evento").
 * Recolecta los datos y llama al API para guardar (crear o editar).
 */
async function handleFormSubmit(e) {
    e.preventDefault(); // Evita que la página se recargue

    const form = e.target;
    const formData = new FormData(form);
    
    // Asegurarse de que el ID del promotor (usuario logueado) esté presente
    if (!usuarioId) {
        mostrarMensaje('Error: No se pudo identificar al usuario. Refresca la página.', 'error');
        return;
    }
    formData.append('id_promotor', usuarioId);

    // Si estamos editando, añadir el ID del evento al FormData
    if (modoEdicion && eventoEditandoId) {
        formData.append('id', eventoEditandoId);
    }

    // Deshabilitar botón mientras se guarda
    const btnSubmit = form.querySelector('button[type="submit"]');
    const textoOriginalBtn = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
        // Llama al API para guardar (crear o editar)
        const data = await api.guardarEvento(formData, modoEdicion);

        if (data.success) {
            ui.cerrarModal(); // Cierra el modal si todo salió bien
            mostrarMensaje(data.mensaje, 'success'); // Muestra mensaje de éxito

            // Recargar la lista de eventos desde la API para ver los cambios
            todosLosEventos = await api.cargarEventos();
            aplicarFiltrosAdmin(); // Vuelve a aplicar los filtros

            // Si fue una CREACIÓN exitosa, muestra el modal con el QR
            if (!modoEdicion && data.datos && data.datos.evento_id) {
                modalQR.mostrarModalExitoConQR(data.datos.evento_id, data.mensaje);
            }
        } else {
            // Si el API devolvió success: false, muestra el mensaje de error del PHP
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        // Error de red o al procesar la respuesta
        console.error('Error al guardar evento:', error.message); 
        
        // Muestra el error específico al usuario
        mostrarMensaje(error.message, 'error'); 
    } finally {
        // Siempre rehabilitar el botón al final
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginalBtn;
    }
}

/**
 * Se ejecuta cuando el admin cambia el select "Tipo de Registro".
 */
function handleTipoRegistroChange(e) {
    // Llama a la función en uiEventos.js para mostrar/ocultar los campos
    ui.mostrarCamposEquipo(e.target.value);
}

/**
 * Filtra la lista de eventos en el lado del cliente (frontend)
 */
function aplicarFiltrosAdmin() {
    // 1. Leer valores de los filtros
    const busqueda = document.getElementById('filtro-buscar-admin').value.toLowerCase();
    const campus = document.getElementById('filtro-campus-admin').value;
    const categoria = document.getElementById('filtro-categoria-admin').value;
    const tipo = document.getElementById('filtro-tipo-admin').value;

    // 2. Filtrar el array global 'todosLosEventos'
    const eventosFiltrados = todosLosEventos.filter(evento => {
        // Filtro de búsqueda (nombre o lugar)
        const coincideBusqueda = !busqueda || 
            evento.nombre.toLowerCase().includes(busqueda) ||
            (evento.lugar && evento.lugar.toLowerCase().includes(busqueda)); // Prevenir error si lugar es null
        
        // Filtro de campus
        const coincideCampus = !campus || evento.campus_id == campus;
        
        // Filtro de categoría
        const coincideCategoria = !categoria || evento.categoria_deporte === categoria;
        
        // Filtro de tipo
        const coincideTipo = !tipo || evento.tipo_actividad === tipo;
        
        // Devolver true solo si CUMPLE TODOS los filtros
        return coincideBusqueda && coincideCampus && coincideCategoria && coincideTipo;
    });

    // 3. Mostrar los eventos filtrados en la UI
    ui.mostrarEventos(eventosFiltrados);
}

// Funcionalidad para cerrar el modal con la X
document.addEventListener('DOMContentLoaded', () => {
    const btnCerrarModalX = document.getElementById('btnCerrarModalX');
    const modal = document.getElementById('modalEvento');
    
    if (btnCerrarModalX) {
        btnCerrarModalX.addEventListener('click', () => {
        modal.style.display = 'none';
        // Opcional: limpiar el formulario
        document.getElementById('formEvento').reset();
        });
    }
});

// Obtener el modal
const modal = document.getElementById('modalEvento');
const modalContenido = document.querySelector('.admin-modal-contenido');

// Cerrar modal al hacer clic fuera del contenido
modal.addEventListener('click', function(e) {
    // Si el clic fue directamente en el modal (fondo oscuro) y NO en el contenido
    if (e.target === modal) {
        modal.style.display = 'none';
        // Opcional: limpiar el formulario
        document.getElementById('formEvento').reset();
    }
});

// Prevenir que los clics dentro del contenido cierren el modal
modalContenido.addEventListener('click', function(e) {
    e.stopPropagation(); // Esto evita que el clic se propague al modal
});