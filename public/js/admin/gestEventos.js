// js/admin/gestEventos.js

import * as api from '../services/apiEventos.js?v=4'; 
import * as ui from '../ui/uiEventos.js?v=7';       
import * as modalQR from '../components/qrModal.js?v=4'; 
import { mostrarMensaje } from '../utils/utilidades.js'; 

// 2. --- VARIABLES GLOBALES ---
let modoEdicion = false;
let eventoEditandoId = null;
let usuarioId = null; 
let todosLosEventos = []; 
let periodoActivoGlobal = null;
let paginaActualEventos = 1;
let registrosPorPaginaEventos = 10;

// 3. --- INICIALIZACIÓN DE LA PÁGINA ---
window.addEventListener('DOMContentLoaded', inicializarPaginaGestionEventos);

async function inicializarPaginaGestionEventos() {
    configurarListenersEventos();
    ui.inicializarTextareaAutoGrow();

    const modalSelectorInicial = document.getElementById('modalSelectorTipoEvento');
    if (modalSelectorInicial) modalSelectorInicial.style.display = 'none';

    try {
        const dataUsuario = await api.verificarSesion();
        usuarioId = dataUsuario.id; 
    } catch (error) {
        console.error("Error de sesión:", error.message);
        mostrarMensaje('No hay sesión activa. Redirigiendo...', 'error');
        setTimeout(() => { window.location.href = '../login.html'; }, 1500);
        return; 
    }

    try {
        mostrarMensaje('Cargando datos iniciales...', 'success'); 
        
        // AGREGADO: Fetch de los periodos dinámicos desde la BD
        const [campus, actividades, facultades, carreras, eventos, reqPeriodos] = await Promise.all([
            api.cargarCampus(),
            api.cargarActividades(),
            api.cargarFacultades(),
            api.cargarCarreras(),
            api.cargarEventos(true), 
            fetch('../../php/admin/obtenerPeriodos.php').then(res => res.json())
        ]);

        todosLosEventos = eventos;

        // AGREGADO: Llenar Filtro de Periodos Dinámicamente
        const selectPeriodo = document.getElementById('filtro-periodo-admin');
        if (reqPeriodos && reqPeriodos.success && reqPeriodos.periodos && reqPeriodos.periodos.length > 0) {
            periodoActivoGlobal = reqPeriodos.periodos[0];
            if (selectPeriodo) {
                selectPeriodo.innerHTML = '<option value="">Todos (Histórico completo)</option>';
                reqPeriodos.periodos.forEach((p, index) => {
                    const isSelected = index === 0 ? 'selected' : '';
                    selectPeriodo.innerHTML += `<option value="${p}" ${isSelected}>${p} ${index === 0 ? '(Activo)' : ''}</option>`;
                });
            }
        } else {
            periodoActivoGlobal = "N/A";
            if (selectPeriodo) selectPeriodo.innerHTML = '<option value="">Todos</option>';
        }

        ui.poblarFiltroFacultades(facultades);
        ui.poblarFiltroCampus(campus);
        ui.poblarSelectActividades(actividades);
        
        ui.poblarCheckboxesCampus(campus);        
        ui.poblarCheckboxesFacultades(facultades, carreras); 
        
        const filtroEstado = document.getElementById('filtro-estado-admin');
        if (filtroEstado) filtroEstado.value = 'activo'; 
        
        aplicarFiltrosAdmin();

        const mensajeDiv = document.getElementById('mensaje-respuesta');
        if (mensajeDiv && mensajeDiv.textContent.includes('Cargando')) {
            mensajeDiv.style.display = 'none';
        }

    } catch (error) {
        mostrarMensaje('Error fatal al cargar datos. Refresca la página.', 'error');
        console.error("Error cargando datos:", error);
    }
}

// 5. --- HANDLERS Y FUNCIONES ---

function handleCampusChange() {
    const campusMarcados = document.querySelectorAll('#campus-checkbox input[type="checkbox"]:checked');
    const idsCampus = Array.from(campusMarcados).map(cb => cb.value);

    const facultadesMarcadas = document.querySelectorAll('#facultades-checkbox input[type="checkbox"]:checked');
    const idsFacultades = Array.from(facultadesMarcadas).map(cb => cb.value);

    ui.renderizarFacultadesFiltradas(idsCampus, idsFacultades);
}

function handleNuevoEventoClick(e) {
    if (e) e.preventDefault();

    const modalViejo = document.getElementById('modalSelectorTipoEvento');
    if (modalViejo) modalViejo.style.display = 'none';

    const modalExistente = document.getElementById('modalEmergenciaDirecto');
    if (modalExistente) modalExistente.remove();

    const div = document.createElement('div');
    div.id = 'modalEmergenciaDirecto';
    div.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 2147483647;";
    div.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 5px 20px rgba(0,0,0,0.5);">
            <h3 style="margin-bottom: 20px; color: #333;">¿Qué tipo de actividad deseas crear?</h3>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button type="button" id="btnEmergenciaEvento" style="padding: 12px 25px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Evento Normal</button>
                <button type="button" id="btnEmergenciaPausa" style="padding: 12px 25px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Pausa Activa</button>
            </div>
            <button type="button" id="btnEmergenciaCerrar" style="margin-top: 15px; background: transparent; border: none; color: #666; cursor: pointer;">Cancelar</button>
        </div>
    `;
    
    document.body.appendChild(div);

    document.getElementById('btnEmergenciaCerrar').addEventListener('click', () => div.remove());
    
    document.getElementById('btnEmergenciaEvento').addEventListener('click', () => {
        div.remove();
        const modalViejo2 = document.getElementById('modalSelectorTipoEvento');
        if (modalViejo2) modalViejo2.style.display = 'none';

        modoEdicion = false;
        eventoEditandoId = null;
        ui.prepararModalParaCrear(periodoActivoGlobal);
        document.getElementById('tipo_creacion').value = 'evento';
        
        toggleCamposPausaActiva(false);
    });

    document.getElementById('btnEmergenciaPausa').addEventListener('click', () => {
        div.remove();
        const modalViejo3 = document.getElementById('modalSelectorTipoEvento');
        if (modalViejo3) modalViejo3.style.display = 'none';

        modoEdicion = false;
        eventoEditandoId = null;
        ui.prepararModalParaCrear(periodoActivoGlobal);
        document.getElementById('tipo_creacion').value = 'pausa_activa';
        
        toggleCamposPausaActiva(true);
    });
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
    const btnExpandir = e.target.closest('.btn-expandir-tarjeta');
    if (btnExpandir) {
        const tarjeta = btnExpandir.closest('.evento-card-admin');
        tarjeta.classList.toggle('expandida');
        
        const spanTexto = btnExpandir.querySelector('span');
        if (tarjeta.classList.contains('expandida')) {
            spanTexto.textContent = 'Ocultar detalles';
        } else {
            spanTexto.textContent = 'Mostrar más detalles y acciones';
        }
        return;
    }
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
            procesarRespuestaAccion(data, '¡Evento Finalizado Exitosamente!', `El evento '${nombre}' ha sido marcado como finalizado.`);
        }
        else if (accion === 'reactivar') {
            if (!confirm(`¿Estás seguro de REACTIVAR el evento "${nombre}"?`)) return;
            
            const data = await api.reactivarEvento(id);
            procesarRespuestaAccion(data, '¡Evento Reactivado Exitosamente!', `El evento '${nombre}' ha sido reactivado y vuelve a estar visible.`);
        }
        else if (accion === 'eliminar') {
            if (!confirm(`¡ADVERTENCIA!\n¿Estás completamente seguro de ELIMINAR el evento "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
            
            const data = await api.eliminarEvento(id); 
            procesarRespuestaAccion(data, '¡Evento Eliminado Exitosamente!', `El evento '${nombre}' ha sido eliminado permanentemente del sistema.`);
        }
        else if (accion === 'editar') {
            const evento = todosLosEventos.find(e => e.id == id);
            if (evento) {
                mostrarMensaje('Cargando evento...', 'success');
                modoEdicion = true;
                eventoEditandoId = id;
                ui.poblarFormularioParaEditar(evento, periodoActivoGlobal);
                document.getElementById('modalEvento').style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo
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

function procesarRespuestaAccion(res, tituloExito = '¡Acción Exitosa!', mensajeDetalleExito = '') {
    if (res.success && mensajeDetalleExito) {
        mostrarModalExitoGlobal(tituloExito, mensajeDetalleExito);
    } else {
        mostrarMensaje(res.mensaje, res.success ? 'success' : 'error');
    }
    
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
            // Se cierra FORZANDO: los datos ya se guardaron, asi que preguntar
            // "hay datos sin guardar, seguro que quieres salir?" es falso.
            // Antes se llamaba primero sin forzar, y como el segundo cierre era
            // forzado, responder "No" a esa advertencia no cancelaba nada.
            ui.cerrarModal(true);

            todosLosEventos = await api.cargarEventos(true);
            aplicarFiltrosAdmin();
            
            const nombreEvento = formData.get('nombre');

            if (!modoEdicion) {
                if (data.datos?.evento_id) {
                    const mensajeCreacion = `Tu evento '${nombreEvento}' ha sido programado.`; 
                    modalQR.mostrarModalExitoConQR(
                        data.datos.evento_id, 
                        mensajeCreacion, 
                        formData.get('tipo_actividad')
                    );
                } else {
                    mostrarMensaje(data.mensaje, 'success');
                }
            } else {
                const titulo = "¡Evento Editado Exitosamente!";
                const mensaje = `El evento '${nombreEvento}' ha sido actualizado correctamente.`;
                mostrarModalExitoGlobal(titulo, mensaje);
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
// === LÓGICA DE FILTRADO Y PAGINACIÓN ===
// ==========================================================
function aplicarFiltrosAdmin() {
    const busqueda = document.getElementById('filtro-buscar-admin').value.toLowerCase();
    const facultad = document.getElementById('filtro-facultad-admin').value;
    const campus = document.getElementById('filtro-campus-admin') ? document.getElementById('filtro-campus-admin').value : ''; 
    const categoria = document.getElementById('filtro-categoria-admin').value;
    const tipo = document.getElementById('filtro-tipo-admin').value;
    const periodo = document.getElementById('filtro-periodo-admin').value;
    const estado = document.getElementById('filtro-estado-admin').value; 

    const eventosFiltrados = todosLosEventos.filter(evento => {
        if (estado === 'activo' && evento.activo != 1) return false;
        if (estado === 'inactivo' && evento.activo != 0) return false;
        if (campus && String(evento.campus_id) !== String(campus)) return false;
        const eventoFacultades = (evento.facultades_ids || '').split(',');
        if (facultad && !eventoFacultades.includes(facultad)) return false;
        if (busqueda && !evento.nombre.toLowerCase().includes(busqueda) && 
            !(evento.lugar && evento.lugar.toLowerCase().includes(busqueda))) return false;
        if (categoria && evento.categoria_deporte !== categoria) return false;
        if (tipo && evento.tipo_actividad !== tipo) return false;
        if (periodo && evento.periodo != periodo) return false; // El JS oculta aquí lo que no coincide
        return true;
    });

    const totalPaginas = Math.ceil(eventosFiltrados.length / registrosPorPaginaEventos) || 1;
    if (paginaActualEventos > totalPaginas) paginaActualEventos = totalPaginas;

    const infoPaginacion = document.getElementById('infoPaginacion');
    if (infoPaginacion) infoPaginacion.textContent = `Página ${paginaActualEventos} de ${totalPaginas} (Total: ${eventosFiltrados.length})`;
    
    const btnPrev = document.getElementById('btnPrevPage');
    if (btnPrev) btnPrev.disabled = (paginaActualEventos === 1);
    
    const btnNext = document.getElementById('btnNextPage');
    if (btnNext) btnNext.disabled = (paginaActualEventos >= totalPaginas);

    const inicio = (paginaActualEventos - 1) * registrosPorPaginaEventos;
    const fin = inicio + registrosPorPaginaEventos;
    const eventosPagina = eventosFiltrados.slice(inicio, fin);

    ui.mostrarEventos(eventosPagina);
}

// 4. --- CONFIGURAR EVENT LISTENERS ---
function configurarListenersEventos() {
    const btnNuevo = document.getElementById('btnNuevoEvento');
    if (btnNuevo) btnNuevo.addEventListener('click', handleNuevoEventoClick);

    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCancelar) btnCancelar.addEventListener('click', ui.cerrarModal);

    const formEvento = document.getElementById('formEvento');
    if (formEvento) formEvento.addEventListener('submit', handleFormSubmit);
    
    const tipoRegistro = document.getElementById('evento-tipo-registro');
    if (tipoRegistro) tipoRegistro.addEventListener('change', handleTipoRegistroChange);

    const categoriaDeporte = document.getElementById('evento-categoria');
    if (categoriaDeporte) categoriaDeporte.addEventListener('change', handleCategoriaChange);

    const divCampus = document.getElementById('campus-checkbox');
    if (divCampus) divCampus.addEventListener('change', handleCampusChange);

    const listaEventos = document.getElementById('lista-eventos');
    if (listaEventos) listaEventos.addEventListener('click', handleListaEventosClick);

    const filtrosIDs = [
        'filtro-buscar-admin', 'filtro-facultad-admin', 'filtro-campus-admin', 
        'filtro-categoria-admin', 'filtro-tipo-admin', 'filtro-periodo-admin', 
        'filtro-estado-admin'
    ];
    
    filtrosIDs.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener(elem.tagName === 'INPUT' ? 'input' : 'change', () => {
                paginaActualEventos = 1; 
                aplicarFiltrosAdmin();
            });
        }
    });
    
    // Botón Limpiar Filtros MODIFICADO para regresar al Periodo Activo
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltrosAdmin');
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', () => {
            filtrosIDs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const filtroEstado = document.getElementById('filtro-estado-admin');
            if (filtroEstado) filtroEstado.value = 'activo'; 
            
            // RESETEAR AL PERIODO MÁS RECIENTE
            const filtroPeriodo = document.getElementById('filtro-periodo-admin');
            if(filtroPeriodo && filtroPeriodo.options.length > 1) {
                filtroPeriodo.selectedIndex = 1; 
            }

            paginaActualEventos = 1; 
            aplicarFiltrosAdmin(); 
        });
    }

    // Búsqueda en vivo de facultades en el modal
    const searchFacultadModal = document.getElementById('buscar-facultad-modal');
    if (searchFacultadModal) {
        searchFacultadModal.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const checkboxes = document.querySelectorAll('#facultades-checkbox .checkbox-item');
            checkboxes.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // --- LISTENERS DE PAGINACIÓN ---
    const selectLimite = document.getElementById('limiteRegistros');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (selectLimite) {
        selectLimite.addEventListener('change', (e) => {
            registrosPorPaginaEventos = parseInt(e.target.value);
            paginaActualEventos = 1;
            aplicarFiltrosAdmin();
        });
    }
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (paginaActualEventos > 1) {
                paginaActualEventos--;
                aplicarFiltrosAdmin();
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            paginaActualEventos++;
            aplicarFiltrosAdmin();
        });
    }
}

function mostrarModalExitoGlobal(titulo, mensajeDetalle) {
    const modal = document.getElementById('modalExitoGlobal');
    if (!modal) {
        return mostrarMensaje(titulo + ' - ' + mensajeDetalle, 'success');
    } 

    const tituloEl = document.getElementById('tituloExito');
    const mensajeEl = document.getElementById('mensajeExito');
    const btnAceptar = document.getElementById('btnAceptarExito');

    tituloEl.textContent = titulo;
    mensajeEl.innerHTML = mensajeDetalle;
    
    modal.style.display = 'flex'; 

    const cerrarModal = () => {
        modal.style.display = 'none';
        btnAceptar.removeEventListener('click', cerrarModal);
        modal.removeEventListener('click', cerrarFueraDeContenido);
    };
    
    const cerrarFueraDeContenido = (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    }
    
    btnAceptar.addEventListener('click', cerrarModal);
    modal.addEventListener('click', cerrarFueraDeContenido);
}

document.addEventListener('DOMContentLoaded', () => {
    const btnCerrarModalX = document.getElementById('btnCerrarModalX');
    const modal = document.getElementById('modalEvento');
    
    if (btnCerrarModalX) btnCerrarModalX.addEventListener('click', ui.cerrarModal);
    
    if(modal) {
        // Se ha comentado esta línea para evitar que el modal se cierre al dar clic fuera y perder información
        // modal.addEventListener('click', (e) => {
        //     if (e.target === modal) ui.cerrarModal();
        // });
        const contenido = modal.querySelector('.admin-modal-contenido');
        if(contenido) contenido.addEventListener('click', (e) => e.stopPropagation());
    }

    // Agregar funcionalidad para cerrar el modal con la tecla Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            ui.cerrarModal();
        }
    });
});


document.addEventListener('DOMContentLoaded', () => {
    const modalSelector = document.getElementById('modalSelectorTipoEvento');
    const cerrarModalSelector = document.getElementById('cerrarModalSelector');
    const btnEventoNormal = document.getElementById('btnSeleccionarEventoNormal');
    const btnPausaActiva = document.getElementById('btnSeleccionarPausaActiva');
    const inputTipoCreacion = document.getElementById('tipo_creacion'); 

    if (modalSelector) modalSelector.style.display = 'none';

    if (cerrarModalSelector) {
        cerrarModalSelector.addEventListener('click', () => {
            if (modalSelector) modalSelector.style.display = 'none';
        });
    }

    if (btnEventoNormal) {
        btnEventoNormal.addEventListener('click', () => {
            if (modalSelector) modalSelector.style.display = 'none';
            modoEdicion = false;
            eventoEditandoId = null;
            ui.prepararModalParaCrear(periodoActivoGlobal);
            if (inputTipoCreacion) inputTipoCreacion.value = 'evento';
            toggleCamposPausaActiva(false);
        });
    }

    if (btnPausaActiva) {
        btnPausaActiva.addEventListener('click', () => {
            if (modalSelector) modalSelector.style.display = 'none';
            modoEdicion = false;
            eventoEditandoId = null;
            ui.prepararModalParaCrear(periodoActivoGlobal);
            if (inputTipoCreacion) inputTipoCreacion.value = 'pausa_activa';
            toggleCamposPausaActiva(true); 
        });
    }
});

function toggleCamposPausaActiva(esPausaActiva) {
    const seccionUbicacionTipo = document.getElementById('contenedor-tipo-ubicacion'); 
    const seccionLugarEspecifico = document.getElementById('contenedor-lugar-especifico'); 
    const seccionTipoRegistro = document.getElementById('contenedor-tipo-registro'); 
    const seccionDiasActividad = document.getElementById('contenedor-dias-actividad'); 
    const seccionActividadDeportiva = document.getElementById('contenedor-actividad-deportiva'); 
    const seccionCupoMaximo = document.getElementById('contenedor-cupo-maximo'); 

    const seccionUnidades = document.getElementById('seccion-unidades-academicas');
    const seccionFacultades = document.getElementById('seccion-facultades-participantes');
    const anchorTop = document.getElementById('contenedor-ubicacion-general-anchor');
    const anchorBottom = document.getElementById('contenedor-secciones-fin');

    if (seccionUnidades && seccionFacultades && anchorTop && anchorBottom) {
        if (esPausaActiva) {
            anchorTop.parentNode.insertBefore(seccionUnidades, anchorTop.nextSibling);
            anchorTop.parentNode.insertBefore(seccionFacultades, seccionUnidades.nextSibling);
        } else {
            anchorBottom.parentNode.insertBefore(seccionUnidades, anchorBottom);
            anchorBottom.parentNode.insertBefore(seccionFacultades, anchorBottom);
        }
    }

    const valorDisplay = esPausaActiva ? 'none' : 'block';

    const ajustarSeccion = (elemento) => {
        if (!elemento) return;
        elemento.style.display = valorDisplay;
        
        const inputsInternos = elemento.querySelectorAll('input, select, textarea');
        inputsInternos.forEach(input => {
            if (esPausaActiva) {
                if (input.hasAttribute('required')) {
                    input.dataset.wasRequired = 'true';
                    input.removeAttribute('required');
                }
            } else {
                if (input.dataset.wasRequired === 'true') {
                    input.setAttribute('required', 'true');
                }
            }
        });
    };

    ajustarSeccion(seccionUbicacionTipo);
    ajustarSeccion(seccionLugarEspecifico);
    ajustarSeccion(seccionTipoRegistro);
    ajustarSeccion(seccionDiasActividad);
    ajustarSeccion(seccionActividadDeportiva);
    ajustarSeccion(seccionCupoMaximo);
}
