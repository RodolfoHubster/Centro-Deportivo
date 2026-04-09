# 🏟️ Centro Deportivo UABC

> Sistema web para la gestión de actividades deportivas del Centro Deportivo de la
> Universidad Autónoma de Baja California (UABC).

---

## 📋 Descripción

**Centro Deportivo UABC** es una aplicación web full-stack que permite a estudiantes
y personal universitario consultar, registrarse y gestionar eventos y actividades
deportivas. El sistema cuenta con un panel de administración para la creación y
control de eventos, generación de códigos QR para asistencia, y una interfaz
pública para los usuarios.

---

## 🚀 Tecnologías Utilizadas

| Capa        | Tecnología                         |
|-------------|-------------------------------------|
| Frontend    | HTML5, CSS3, JavaScript (ES6 Modules) |
| Backend     | PHP                                 |
| Base de Datos | MySQL                             |
| Dependencias PHP | Composer                       |
| QR Code     | qrcode.min.js                       |
| Servidor    | Apache (.htaccess)                  |

---

## 📁 Estructura del Proyecto

### 🗄️ Backend — `php/`
| Carpeta | Descripción |
|--------|-------------|
| `php/admin/` | Endpoints PHP del panel de administración |
| `php/includes/` | Conexión a DB y utilidades compartidas |
| `php/public/` | Endpoints PHP para usuarios |

### 🌐 Frontend — `public/`
| Archivo / Carpeta | Descripción |
|------------------|-------------|
| `public/index.html` | Página de inicio |
| `public/login.html` | Inicio de sesión admin |
| `public/eventos.html` | Vista pública de eventos |
| `public/torneos.html` | Vista pública de torneos |
| `public/contacto.html` | Página de contacto |
| `public/admin/` | Páginas HTML del panel admin |
| `public/css/` | Hojas de estilo |
| `public/images/` | Recursos gráficos |
| `public/includes/` | Componentes reutilizables (header/footer) |

### ⚙️ JavaScript Modular — `public/js/`
| Módulo | Descripción |
|--------|-------------|
| `js/admin/` | Orquestadores del panel admin |
| `js/components/` | Componentes UI (ej. modales QR) |
| `js/services/` | Comunicación con el backend (fetch) |
| `js/ui/` | Manipulación del DOM |
| `js/utils/` | Funciones genéricas reutilizables |
| `js/user/` | Scripts de la vista pública |
| `js/headFooter.js` | Carga dinámica de header y footer |

### 🔧 Raíz del proyecto
| Archivo | Descripción |
|---------|-------------|
| `.htaccess` | Configuración y reglas de Apache |
| `composer.json` | Dependencias PHP |
| `README.md` | Documentación del proyecto |

---

## ⚙️ Instalación y Configuración

### Requisitos previos
- PHP >= 7.4
- MySQL / MariaDB
- Apache con `mod_rewrite` habilitado
- Composer

### Pasos
1. Clona el repositorio
2. Ejecuta `composer install`
3. Configura la base de datos con tus credenciales
4. Apunta Apache a la carpeta `public/`
5. Accede en `http://localhost/`

---

## 🧩 Arquitectura del Frontend (Módulos ES6)

| Módulo                  | Responsabilidad                            |
|-------------------------|--------------------------------------------|
| `services/apiEventos.js`| Llamadas fetch al backend PHP              |
| `ui/uiEventos.js`       | Actualiza el HTML con los datos recibidos  |
| `components/qrModal.js` | Generación y visualización de QR           |
| `utils/utilidades.js`   | Funciones reutilizables genéricas          |
| `admin/gestEventos.js`  | Orquestador principal                      |

---

## ✨ Funcionalidades Principales

- 📅 Gestión de Eventos
- 🏫 Filtrado por Campus y Facultad
- 📲 Códigos QR por evento
- 🔐 Autenticación de Administradores
- 🌐 Interfaz Pública para estudiantes
