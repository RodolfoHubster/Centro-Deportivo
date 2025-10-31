


# Refactorización del JavaScript - Gestión de Eventos (Admin)
## Version 27/10/2025 01:04am
Este documento resume los cambios realizados en la estructura del código JavaScript para la sección de administración de eventos (`gestionar-eventos.html`). El objetivo principal fue mejorar la organización, mantenibilidad y escalabilidad del código.

## Motivación

El archivo original `gestEventos.js` contenía toda la lógica para:
* Verificar la sesión del usuario.
* Cargar datos iniciales (campus, actividades, facultades, eventos) desde el backend (PHP).
* Mostrar y actualizar la interfaz de usuario (lista de eventos, selects del formulario).
* Manejar el formulario modal para crear y editar eventos.
* Generar y mostrar códigos QR.
* Eliminar eventos.
* Funciones de utilidad (formatear fechas, mostrar mensajes).

Esta centralización dificultaba la lectura, depuración y la adición de nuevas funcionalidades.

## Cambios Implementados

Se adoptó un enfoque modular utilizando **Módulos ES6** (`import`/`export`), separando el código por responsabilidades en diferentes archivos y carpetas:

### Nueva Estructura de Archivos (`public/js/`)

```
js/
├── admin/
│   ├── gestEventos.js       # Orquestador principal (ahora más limpio)
│   └── ...                  # Otros scripts de admin
├── components/
│   └── qrModal.js           # Lógica específica para modales de QR
├── services/
│   └── apiEventos.js        # Comunicación con el backend (fetch a PHP)
├── ui/
│   └── uiEventos.js         # Manipulación del DOM (actualizar HTML)
├── utils/
│   └── utilidades.js        # Funciones genéricas (formatearFecha, mostrarMensaje)
├── user/
│   └── ...                  # Scripts para la parte pública
└── headFooter.js            # Script global para header/footer
```

### Descripción de los Módulos Principales

1.  **`services/apiEventos.js`**
    * **Responsabilidad:** Contiene todas las funciones `async` que usan `fetch` para interactuar con los endpoints PHP (`obtenerEventos.php`, `crearEvento.php`, etc.).
    * **No** interactúa con el HTML. Solo obtiene o envía datos y los devuelve (o maneja errores).

2.  **`ui/uiEventos.js`**
    * **Responsabilidad:** Contiene funciones que manipulan directamente el DOM (Document Object Model).
    * Recibe datos (generalmente de `gestEventos.js`) y los "pinta" en la página (ej. `mostrarEventos`, `poblarSelectCampus`).
    * Maneja la lógica visual del formulario modal (abrir, cerrar, rellenar para editar, resetear).

3.  **`components/qrModal.js`**
    * **Responsabilidad:** Encapsula toda la lógica para generar y mostrar los modales de códigos QR (`generarQR`, `mostrarModalExitoConQR`).
    * Depende de la librería externa `qrcode.min.js`.

4.  **`utils/utilidades.js`**
    * **Responsabilidad:** Contiene funciones pequeñas y reutilizables que no dependen de la lógica específica de eventos ni manipulan directamente el DOM principal (ej. `formatearFecha`, `mostrarMensaje`).

5.  **`admin/gestEventos.js`**
    * **Responsabilidad:** Actúa como el **orquestador**.
    * Importa funciones de los otros módulos.
    * Maneja la inicialización de la página (`DOMContentLoaded`).
    * Configura los event listeners principales (clics en botones, submit del formulario).
    * Coordina el flujo: llama a `apiEventos` para obtener datos y luego a `uiEventos` para mostrarlos.

### Cambios Adicionales

* Se añadió `type="module"` a la etiqueta `<script>` que carga `gestEventos.js` en `gestionar-eventos.html` para habilitar el uso de `import`/`export`.
* Se corrigieron errores y bugs detectados durante la refactorización (ej. nombres de funciones, llamadas incorrectas).
* Se limpió el código eliminando funciones duplicadas o movidas.

## Beneficios

* **Código más limpio y legible:** Cada archivo tiene una responsabilidad clara.
* **Mayor Mantenibilidad:** Es más fácil encontrar y modificar una funcionalidad específica.
* **Reutilización:** Funciones como las de `utilidades.js` pueden ser usadas en otras partes del sitio.
* **Mejor Colaboración:** Diferentes desarrolladores podrían trabajar en distintos módulos sin tantos conflictos.
* **Escalabilidad:** Añadir nuevas funciones relacionadas con eventos será más sencillo.

----------------


