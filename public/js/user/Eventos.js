/* js/user/Eventos.js - VERSIÓN FINAL UNIFICADA (Eventos + Torneos + Filtros + Paginación) */

let todosLosEventosPublicos = [];
let paginaActualEventos = 1;
let registrosPorPaginaEventos = 6;
let modoTorneos = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Detección de la página (Eventos o Torneos)
    const path = window.location.pathname.toLowerCase();
    if (path.includes('torneos')) {
        modoTorneos = true;
        console.log("Modo: Torneos activos");
    } else {
        modoTorneos = false;
        console.log("Modo: Eventos generales");
    }

    // 2. Cargar los eventos de la base de datos
    cargarEventosBaseDatos();
    
    // 3. Activar los botones de filtro y paginación
    configurarListenersFiltrosYPaginacion();
});

// --- OBTENCIÓN DE DATOS ---
async function cargarEventosBaseDatos() {
    const contenedorEventos = document.getElementById('lista-eventos');
    if (contenedorEventos) {
        contenedorEventos.innerHTML = `<div style="text-align: center; width: 100%; padding: 40px;"><p>Cargando información...</p></div>`;
    }

    try {
        const respuesta = await fetch('../php/public/obtenerEventos.php');
        if (!respuesta.ok) throw new Error('Error en la red');
        const data = await respuesta.json();
        
        // Ajuste dependiendo de cómo responda tu PHP (array directo o dentro de .eventos)
        let eventosObtenidos = Array.isArray(data) ? data : (data.eventos || []);

        /* Repartimos entre la pagina de Eventos y la de Torneos.
           Ojo con las pausas activas: se guardan con tipo_actividad='Torneo'
           (asi las crea el formulario del admin), pero una pausa activa no es
           un torneo. Sin esta excepcion aparecian listadas junto a los torneos
           de futbol, que es el ultimo lugar donde alguien las buscaria.
           Se reconocen por tipo_creacion. */
        const esTorneoReal = (e) =>
            e.tipo_actividad === 'Torneo' && e.tipo_creacion !== 'pausa_activa';

        todosLosEventosPublicos = eventosObtenidos.filter(e => {
            if (e.activo != 1) return false;
            return modoTorneos ? esTorneoReal(e) : !esTorneoReal(e);
        });

        aplicarFiltrosPublicos(); // Dibujamos por primera vez
    } catch (error) {
        console.error('Error:', error);
        if (contenedorEventos) {
            contenedorEventos.innerHTML = `<div style="text-align: center; color: red; padding: 20px;"><p>Error al cargar los datos. Por favor intenta más tarde.</p></div>`;
        }
    }
}

// --- CONFIGURACIÓN DE LOS BOTONES DE LA INTERFAZ ---
function configurarListenersFiltrosYPaginacion() {
    const filtrosIDs = ['filtro-buscar-publico', 'filtro-campus-publico', 'filtro-categoria-publico', 'filtro-cuando-publico'];
    
    filtrosIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
            paginaActualEventos = 1; // Si filtran, regresamos a página 1
            aplicarFiltrosPublicos();
        });
    });

    const btnLimpiar = document.getElementById('btnLimpiarFiltrosPublico');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            document.getElementById('filtro-buscar-publico').value = '';
            document.getElementById('filtro-campus-publico').value = '';
            document.getElementById('filtro-categoria-publico').value = '';
            const elCuandoLimpiar = document.getElementById('filtro-cuando-publico');
            if (elCuandoLimpiar) elCuandoLimpiar.value = '';
            paginaActualEventos = 1;
            aplicarFiltrosPublicos();
        });
    }

    // Paginación
    const selectLimite = document.getElementById('limiteRegistros');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (selectLimite) {
        selectLimite.addEventListener('change', (e) => {
            registrosPorPaginaEventos = parseInt(e.target.value);
            paginaActualEventos = 1;
            aplicarFiltrosPublicos();
        });
    }
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (paginaActualEventos > 1) {
                paginaActualEventos--;
                aplicarFiltrosPublicos();
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            paginaActualEventos++;
            aplicarFiltrosPublicos();
        });
    }
}

/* Traduce dias_para_iniciar a una etiqueta corta y legible.
   Devuelve null cuando el evento esta lejos: no vale la pena marcarlo. */
function etiquetaProximidad(dias) {
    const d = parseInt(dias, 10);
    if (Number.isNaN(d)) return null;
    if (d < 0)  return { texto: 'En curso', clase: 'proximidad--curso' };
    if (d === 0) return { texto: 'Hoy',      clase: 'proximidad--hoy' };
    if (d === 1) return { texto: 'Mañana',   clase: 'proximidad--hoy' };
    if (d <= 7)  return { texto: `En ${d} días`, clase: 'proximidad--pronto' };
    return null;
}

/* Deja el texto en minusculas y sin acentos, para poder comparar
   "Activación Física" con "ACTIVACION FISICA" sin fallar. */
function normalizar(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

// --- MOTOR DE BÚSQUEDA Y PAGINACIÓN ---
function aplicarFiltrosPublicos() {
    const elBuscar = document.getElementById('filtro-buscar-publico');
    const elCampus = document.getElementById('filtro-campus-publico');
    const elCategoria = document.getElementById('filtro-categoria-publico');
    const elCuando = document.getElementById('filtro-cuando-publico');

    const busqueda = elBuscar ? elBuscar.value.toLowerCase() : '';
    const campus = elCampus ? elCampus.value : '';
    const categoria = elCategoria ? elCategoria.value : '';
    const cuando = elCuando ? elCuando.value : '';

    const eventosFiltrados = todosLosEventosPublicos.filter(evento => {
        // Filtro Categoría.
        // Se compara normalizado (minusculas y sin acentos) y por coincidencia
        // parcial, porque en la base las categorias estan escritas de formas
        // distintas: "RALLY", "Rally deportivo" y "Rally Recreativo" son la
        // misma cosa para quien busca. Solo miramos categoria_deporte:
        // tipo_actividad unicamente distingue Carrera de Torneo, que es lo que
        // separa esta pagina de la de torneos.
        if (categoria && !normalizar(evento.categoria_deporte).includes(normalizar(categoria))) return false;

        // Filtro por cercania. dias_para_iniciar lo calcula la consulta SQL:
        // 0 = arranca hoy, 1 = manana, negativo = ya empezo y sigue en curso.
        if (cuando) {
            const dias = parseInt(evento.dias_para_iniciar, 10);
            if (Number.isNaN(dias)) return false;

            if (cuando === 'curso') {
                if (dias > 0) return false;          // aun no empieza
            } else {
                const limite = parseInt(cuando, 10);
                if (dias < 0 || dias > limite) return false;
            }
        }
        
        // Filtro Campus
        if (campus && !String(evento.campus_nombre || evento.campus_id).includes(campus)) return false;

        // Filtro Búsqueda
        if (busqueda) {
            const nombre = String(evento.nombre || '').toLowerCase();
            const lugar = String(evento.lugar || '').toLowerCase();
            const descripcion = String(evento.descripcion || '').toLowerCase();
            if (!nombre.includes(busqueda) && !lugar.includes(busqueda) && !descripcion.includes(busqueda)) return false;
        }
        return true;
    });

    // Cálculos de paginación
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

    mostrarEventos(eventosPagina);
}

// --- DIBUJADO DE LAS TARJETAS (Usando tu diseño original) ---
function mostrarEventos(eventos) {
    let contenedor = document.getElementById('lista-eventos'); // Asegúrate que tu div tenga este ID en el HTML
    
    if (!contenedor) {
        const main = document.querySelector("main");
        contenedor = document.createElement('div');
        contenedor.id = 'lista-eventos';
        contenedor.className = 'eventos-container';
        if (main) main.appendChild(contenedor);
    }

    contenedor.innerHTML = ''; // Limpiamos la tabla

    if (eventos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; width: 100%; padding: 40px; background-color: #f9f9f9; border-radius: 8px;">
                <p style="font-size: 1.2rem; color: #666; margin-bottom: 10px;">No hay eventos/torneos disponibles con estos filtros.</p>
            </div>
        `;
        return;
    }

    eventos.forEach(evento => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "evento-card";
        tarjeta.style.cssText = "position: relative !important;"; 

        tarjeta.setAttribute('data-evento-id', evento.id);
        tarjeta.setAttribute('data-tipo-registro', evento.tipo_registro || 'Individual');
        tarjeta.setAttribute('data-tipo-creacion', evento.tipo_creacion || 'evento');
        tarjeta.setAttribute('data-integrantes-min', evento.integrantes_min || 1);
        tarjeta.setAttribute('data-integrantes-max', evento.integrantes_max || 0);
        tarjeta.setAttribute('data-dias-juego', evento.dias_juego || '');

        let badgeHTML = '';
        let llenoTotal = false; 
        let equiposLlenos = false; 
        
        const cupoMaximo = parseInt(evento.cupo_maximo, 10) || 0;
        const registrosActuales = parseInt(evento.registros_actuales, 10) || 0;
        const esPorEquipo = evento.tipo_registro === 'Por equipos';

        if (cupoMaximo > 0) {
            const disponibles = cupoMaximo - registrosActuales;
            if (disponibles <= 0) {
                if (esPorEquipo) {
                    equiposLlenos = true;
                    badgeHTML = `<span class="badge-status" style="color:#856404; background-color:#fff3cd; border: 1px solid #ffeeba;">Equipos Completos (Solo Unirse)</span>`;
                } else {
                    llenoTotal = true;
                    badgeHTML = `<span class="badge-status lleno">Cupo Lleno</span>`;
                }
            } else if (disponibles < 3) {
                badgeHTML = `<span class="badge-status" style="color:#856404; background-color:#fff3cd; border: 1px solid #ffeeba;">¡Últimos Lugares!</span>`;
            } else {
                badgeHTML = `<span class="badge-status disponible">Disponible (${disponibles})</span>`;
            }
        } else {
            badgeHTML = `<span class="badge-status disponible">Entrada Libre</span>`;
        }

        if (llenoTotal) tarjeta.setAttribute('data-lleno', 'true');
        if (equiposLlenos) tarjeta.setAttribute('data-equipos-llenos', 'true');

        const facultadInfo = evento.facultades_nombres
            ? `<div class="meta-fila">
                 <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                 <span><strong>Facultad:</strong> ${evento.facultades_nombres}</span>
               </div>`
            : '';

        const iconoFecha = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
        const iconoLugar = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

        // Si empieza y termina el mismo dia, no repetimos la fecha
        const fechaIni = formatearFecha(evento.fecha_inicio);
        const fechaFin = formatearFecha(evento.fecha_termino);
        const fechaTexto = (fechaIni === fechaFin) ? fechaIni : `${fechaIni} - ${fechaFin}`;

        const prox = etiquetaProximidad(evento.dias_para_iniciar);
        const proximidadHTML = prox
            ? `<span class="proximidad ${prox.clase}">${prox.texto}</span>`
            : '';

        tarjeta.innerHTML = `
            <div class="evento-principal">
                <h2>${evento.nombre}</h2>
                <div class="evento-meta">
                    <span class="meta-dato">${iconoFecha}<span>${fechaTexto}</span>${proximidadHTML}</span>
                    <span class="meta-dato">${iconoLugar}<span>${evento.lugar}</span></span>
                </div>
            </div>

            <div class="evento-lateral">
                ${badgeHTML}
                <button type="button" class="evento-toggle"
                        onclick="toggleEventoCompleto(this, event)"
                        aria-expanded="false"
                        aria-label="Ver detalles de ${evento.nombre}">&#9660;</button>
            </div>

            <div class="evento-contenido-oculto" style="display: none;">
                <p class="description">${evento.descripcion || 'Sin descripcion disponible.'}</p>

                <div class="meta-extra">
                    ${facultadInfo}
                    <div class="meta-fila">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span><strong>Tipo:</strong> ${evento.tipo_actividad || 'General'}${evento.categoria_deporte ? ' &bull; ' + evento.categoria_deporte : ''}</span>
                    </div>
                </div>

                <div class="card-actions"></div>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });

    // Botones para eventos normales
    if (typeof agregarBotonesInscripcion === 'function') {
        agregarBotonesInscripcion();
    }
    // Botones para Pausas Activas
    agregarBotonesPausaActiva();
}

/**
 * Agrega botones Hombre / Mujer a las tarjetas de tipo Pausa Activa
 */
function agregarBotonesPausaActiva() {
    document.querySelectorAll('.evento-card[data-tipo-creacion="pausa_activa"]').forEach(tarjeta => {
        // Ocultar/eliminar el contenedor de botones por defecto (Registrarse al evento)
        const contenedorInscripcion = tarjeta.querySelector('.contenedor-botones-inscripcion');
        if (contenedorInscripcion) {
            contenedorInscripcion.remove();
        }

        const contenedorAcciones = tarjeta.querySelector('.card-actions');
        if (!contenedorAcciones) return;

        // Eliminar cualquier botón de inscripción que se haya agregado previamente (o por Inscripcion.js)
        const btnInscripcionViejo = contenedorAcciones.querySelector('.btn-inscribir');
        if (btnInscripcionViejo) btnInscripcionViejo.remove();

        const eventoId = tarjeta.dataset.eventoId;

        // Solo inyectar si aún no se ha inyectado
        if (!contenedorAcciones.querySelector('.btn-pausa-hombre')) {
            contenedorAcciones.innerHTML = `
                <p style="margin-bottom:10px; font-weight:600; color:#333;">Selecciona tu género para registrarte:</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap; max-width:460px;">
                    <button class="btn-pausa-sexo btn-pausa-hombre"
                        onclick="abrirFlujoPausa('${eventoId}', 'Hombre')"
                        style="flex:1 1 160px; max-width:220px; padding:12px 10px; background:linear-gradient(135deg,#1a73e8,#0d47a1);
                               color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:0.95rem;
                               cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span style="font-size:1.3rem;">&#9794;</span> Hombre
                    </button>
                    <button class="btn-pausa-sexo btn-pausa-mujer"
                        onclick="abrirFlujoPausa('${eventoId}', 'Mujer')"
                        style="flex:1 1 160px; max-width:220px; padding:12px 10px; background:linear-gradient(135deg,#e91e8c,#880e4f);
                               color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:0.95rem;
                               cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span style="font-size:1.3rem;">&#9792;</span> Mujer
                    </button>
                </div>
            `;
        }
    });
}


function formatearFecha(fecha) {
    if (!fecha) return 'No definida';
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-MX', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

// Lógica para desplegar la tarjeta
window.toggleEventoCompleto = function(btn, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const tarjeta = btn.closest('.evento-card');
    const contenido = tarjeta.querySelector('.evento-contenido-oculto');

    const abriendo = (contenido.style.display === 'none' || contenido.style.display === '');

    // Comportamiento de acordeon: al abrir uno, se cierran los demas.
    // Con varios abiertos a la vez la lista se volvia larguisima y costaba
    // comparar entre eventos, que es justo para lo que sirve la vista en filas.
    if (abriendo) {
        document.querySelectorAll('.evento-card.abierta').forEach(otra => {
            if (otra === tarjeta) return;
            cerrarDetalleEvento(otra);
        });
    }

    contenido.style.display = abriendo ? 'block' : 'none';

    // La clase mueve la flecha desde el CSS, sin estilos en linea
    tarjeta.classList.toggle('abierta', abriendo);
    btn.setAttribute('aria-expanded', abriendo ? 'true' : 'false');
};

/* Cierra el detalle de una tarjeta dejando todo consistente:
   el contenido, la clase que gira la flecha y el estado accesible. */
function cerrarDetalleEvento(tarjeta) {
    const contenido = tarjeta.querySelector('.evento-contenido-oculto');
    if (contenido) contenido.style.display = 'none';

    tarjeta.classList.remove('abierta');

    const boton = tarjeta.querySelector('.evento-toggle');
    if (boton) boton.setAttribute('aria-expanded', 'false');
}