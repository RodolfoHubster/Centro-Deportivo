// js/admin/gestEventos.js

// 1. --- IMPORTAR MÓDULOS ---
import * as api from '../services/apiEventos.js'; 
import * as ui from '../ui/uiEventos.js';       
import * as modalQR from '../components/qrModal.js'; 
import { mostrarMensaje } from '../utils/utilidades.js'; 

// 2. --- VARIABLES GLOBALES ---
let modoEdicion = false;
let eventoEditandoId = null;
let usuarioId = null; 
let todosLosEventos = []; 
let periodoActivoGlobal = null;

// 3. --- INICIALIZACIÓN DE LA PÁGINA ---
window.addEventListener('DOMContentLoaded', inicializarPaginaGestionEventos);

async function inicializarPaginaGestionEventos() {
    // 3.1 Verificar sesión
    try {
        const dataUsuario = await api.verificarSesion();
        usuarioId = dataUsuario.id; 
    } catch (error) {
        console.error("Error de sesión:", error.message);
        mostrarMensaje('No hay sesión activa. Redirigiendo...', 'error');
        setTimeout(() => { window.location.href = '../login.html'; }, 1500);
        return; 
    }

    // 3.2 Cargar datos iniciales
    try {
        mostrarMensaje('Cargando datos iniciales...', 'success'); 
        
        const [campus, actividades, facultades, eventos, periodoObj] = await Promise.all([
            api.cargarCampus(),
            api.cargarActividades(),
            api.cargarFacultades(),
            api.cargarEventos(true), 
            api.obtenerPeriodoActivo()
        ]);

        todosLosEventos = eventos;
        periodoActivoGlobal = periodoObj ? periodoObj.nombre : "N/A";

        // Configurar UI
        ui.poblarFiltroFacultades(facultades);
        ui.poblarFiltroCampus(campus); // <--- NUEVO: Poblar el filtro de campus
        ui.poblarSelectActividades(actividades);
        
        // Configurar Modal
        ui.poblarCheckboxesCampus(campus);         
        ui.poblarCheckboxesFacultades(facultades); 
        
        // Configurar filtros de tabla
        ui.poblarFiltroPeriodos(todosLosEventos);
        const filtroEstado = document.getElementById('filtro-estado-admin');
        if (filtroEstado) filtroEstado.value = 'activo'; 
        
        aplicarFiltrosAdmin(); // Aplicar filtros iniciales

        // Ocultar mensaje de carga
        const mensajeDiv = document.getElementById('mensaje-respuesta');
        if (mensajeDiv && mensajeDiv.textContent.includes('Cargando')) {
            mensajeDiv.style.display = 'none';
        }

    } catch (error) {
        mostrarMensaje('Error fatal al cargar datos. Refresca la página.', 'error');
        console.error("Error cargando datos:", error);
    }

    configurarListenersEventos();
    ui.inicializarTextareaAutoGrow();
}

// 4. --- CONFIGURAR EVENT LISTENERS ---
function configurarListenersEventos() {
    // Botones del Modal
    document.getElementById('btnNuevoEvento').addEventListener('click', handleNuevoEventoClick);
    document.getElementById('btnCancelar').addEventListener('click', ui.cerrarModal);
    document.getElementById('formEvento').addEventListener('submit', handleFormSubmit);
    
    document.getElementById('evento-tipo-registro').addEventListener('change', handleTipoRegistroChange);
    document.getElementById('evento-categoria').addEventListener('change', handleCategoriaChange);

    // Listener para filtrado en cascada del Modal
    const divCampus = document.getElementById('campus-checkbox');
    if (divCampus) {
        divCampus.addEventListener('change', handleCampusChange);
    }

    // Delegación de eventos para la lista
    document.getElementById('lista-eventos').addEventListener('click', handleListaEventosClick);

    // Listeners para los filtros de la tabla principal
    // --- AGREGAMOS 'filtro-campus-admin' A LA LISTA ---
    const filtrosIDs = [
        'filtro-buscar-admin', 'filtro-facultad-admin', 'filtro-campus-admin', 
        'filtro-categoria-admin', 'filtro-tipo-admin', 'filtro-periodo-admin', 
        'filtro-estado-admin'
    ];
    
    filtrosIDs.forEach(id => {
        const elem = document.getElementById(id);
        if(elem) elem.addEventListener(elem.tagName === 'INPUT' ? 'input' : 'change', aplicarFiltrosAdmin);
    });
    
    // Botón Limpiar Filtros
    document.getElementById('btnLimpiarFiltrosAdmin').addEventListener('click', () => {
        filtrosIDs.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '';
        });
        document.getElementById('filtro-estado-admin').value = 'activo'; 
        aplicarFiltrosAdmin(); 
    });
}

// 5. --- HANDLERS Y FUNCIONES ---

function handleCampusChange() {
    const campusMarcados = document.querySelectorAll('#campus-checkbox input[type="checkbox"]:checked');
    const idsCampus = Array.from(campusMarcados).map(cb => cb.value);

    const facultadesMarcadas = document.querySelectorAll('#facultades-checkbox input[type="checkbox"]:checked');
    const idsFacultades = Array.from(facultadesMarcadas).map(cb => cb.value);

    ui.renderizarFacultadesFiltradas(idsCampus, idsFacultades);
}

function handleNuevoEventoClick() {
    modoEdicion = false;
    eventoEditandoId = null;
    ui.prepararModalParaCrear(periodoActivoGlobal);
}

function handleCategoriaChange(e) {
    const contenedor = document.getElementById('contenedor-otra-categoria');
    const input = document.getElementById('otra-categoria');
    if (!contenedor) return;

    if (e.target.value === 'Otro') {
        contenedor.style.display = 'block';
        input.required = true; 
    } else {
        contenedor.style.display = 'none';
        input.required = false;
        input.value = ''; 
    }
}

function handleTipoRegistroChange(e) {
    ui.mostrarCamposEquipo(e.target.value);
}

async function handleListaEventosClick(e) {
    const boton = e.target.closest('button[data-action]');
    if (!boton) return; 

    const id = boton.dataset.id;
    const accion = boton.dataset.action;
    const nombre = boton.dataset.nombre || 'este evento';

    try {
        if (accion === 'finalizar') {
            if (!confirm(`¿Estás seguro de FINALIZAR el evento "${nombre}"?`)) return;
            mostrarMensaje('Finalizando...', 'error');
            const data = await api.finalizarEvento(id);
            procesarRespuestaAccion(data);
        }
        else if (accion === 'reactivar') {
            if (!confirm(`¿Estás seguro de REACTIVAR el evento "${nombre}"?`)) return;
            mostrarMensaje('Reactivando...', 'success');
            const data = await api.reactivarEvento(id);
            procesarRespuestaAccion(data);
        }
        else if (accion === 'eliminar') {
            if (!confirm(`¿Estás seguro de ELIMINAR el evento "${nombre}"?`)) return;
            mostrarMensaje('Eliminando...', 'success');
            const data = await api.eliminarEvento(id); 
            procesarRespuestaAccion(data);
        }
        else if (accion === 'editar') {
            const evento = todosLosEventos.find(e => e.id == id);
            if (evento) {
                mostrarMensaje('Cargando evento...', 'success');
                modoEdicion = true;
                eventoEditandoId = id;
                ui.poblarFormularioParaEditar(evento, periodoActivoGlobal);
                document.getElementById('modalEvento').style.display = 'flex';
                document.getElementById('mensaje-respuesta').style.display = 'none';
            }
        }
        else if (accion === 'qr') {
            const evento = todosLosEventos.find(e => e.id == id);
            if(evento) modalQR.generarQR(id, evento.tipo_actividad);
        }
    } catch (error) {
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

function procesarRespuestaAccion(res) {
    mostrarMensaje(res.mensaje, res.success ? 'success' : 'error');
    if (res.success) {
        api.cargarEventos(true).then(ev => {
            todosLosEventos = ev;
            aplicarFiltrosAdmin();
        });
    }
}

async function handleFormSubmit(e) {
    e.preventDefault(); 
    const form = e.target;
    const formData = new FormData(form);
    
    // Validar categoría "Otro"
    if (formData.get('categoria_deporte') === 'Otro') {
        const otra = formData.get('otra_categoria');
        if (!otra || !otra.trim()) return mostrarMensaje('Especifica la categoría.', 'error');
        formData.set('categoria_deporte', otra); 
    }
    
    if (!usuarioId) return mostrarMensaje('Error de usuario. Refresca la página.', 'error');
    formData.append('id_promotor', usuarioId);

    if (modoEdicion && eventoEditandoId) formData.append('id', eventoEditandoId);

    const btn = form.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const data = await api.guardarEvento(formData, modoEdicion);
        if (data.success) {
            ui.cerrarModal(); 
            mostrarMensaje(data.mensaje, 'success'); 
            todosLosEventos = await api.cargarEventos(true);
            ui.poblarFiltroPeriodos(todosLosEventos); 
            aplicarFiltrosAdmin(); 
            if (!modoEdicion && data.datos?.evento_id) {
                modalQR.mostrarModalExitoConQR(data.datos.evento_id, data.mensaje, formData.get('tipo_actividad'));
            }
        } else {
            mostrarMensaje(data.mensaje, 'error');
        }
    } catch (error) {
        mostrarMensaje(error.message, 'error'); 
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

// ==========================================================
// === LÓGICA DE FILTRADO DE LA TABLA PRINCIPAL ===
// ==========================================================
function aplicarFiltrosAdmin() {
    const busqueda = document.getElementById('filtro-buscar-admin').value.toLowerCase();
    const facultad = document.getElementById('filtro-facultad-admin').value;
    const campus = document.getElementById('filtro-campus-admin') ? document.getElementById('filtro-campus-admin').value : ''; // <--- NUEVO
    const categoria = document.getElementById('filtro-categoria-admin').value;
    const tipo = document.getElementById('filtro-tipo-admin').value;
    const periodo = document.getElementById('filtro-periodo-admin').value;
    const estado = document.getElementById('filtro-estado-admin').value; 

    const eventosFiltrados = todosLosEventos.filter(evento => {
        // 1. Filtro Estado
        if (estado === 'activo' && evento.activo != 1) return false;
        if (estado === 'inactivo' && evento.activo != 0) return false;
        
        // 2. Filtro Campus (NUEVO)
        // Compara el ID del campus del evento con el seleccionado
        if (campus && String(evento.campus_id) !== String(campus)) return false;

        // 3. Filtro Facultad
        // Verifica si la facultad seleccionada está dentro de las facultades del evento
        const eventoFacultades = (evento.facultades_ids || '').split(',');
        if (facultad && !eventoFacultades.includes(facultad)) return false;

        // 4. Filtro Búsqueda (Nombre o Lugar)
        if (busqueda && !evento.nombre.toLowerCase().includes(busqueda) && 
            !(evento.lugar && evento.lugar.toLowerCase().includes(busqueda))) return false;
        
        // 5. Otros filtros exactos
        if (categoria && evento.categoria_deporte !== categoria) return false;
        if (tipo && evento.tipo_actividad !== tipo) return false;
        if (periodo && evento.periodo != periodo) return false;
        
        return true;
    });

    ui.mostrarEventos(eventosFiltrados);
}

// --- Cierre de modal ---
document.addEventListener('DOMContentLoaded', () => {
    const btnCerrarModalX = document.getElementById('btnCerrarModalX');
    const modal = document.getElementById('modalEvento');
    
    if (btnCerrarModalX) btnCerrarModalX.addEventListener('click', ui.cerrarModal);
    
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) ui.cerrarModal();
        });
        const contenido = modal.querySelector('.admin-modal-contenido');
        if(contenido) contenido.addEventListener('click', (e) => e.stopPropagation());
    }
});