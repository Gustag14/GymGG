# GymGG — Gym Management System

Aplicación Flask completa para gestión de gimnasios con base de datos SQLite.

## Instalación

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar la aplicación
python app.py
```

La app arrancará en: **http://localhost:5000**

## Credenciales de acceso

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | admin@gymgg.com | 123456 |

> Los clientes se registran ellos mismos desde la landing page.

## Estructura

```
gymgg/
├── app.py                  # Flask app principal (rutas + modelos)
├── requirements.txt
├── gymgg.db                # SQLite (se crea automáticamente)
├── templates/
│   └── index.html          # Template principal
└── static/
    ├── css/style.css
    └── js/
        ├── i18n.js         # Traducciones ES/EN
        └── app.js          # Lógica frontend + llamadas API
```

## Funcionalidades

### Admin
- Dashboard con KPIs en tiempo real
- CRUD completo de clases
- Listado de usuarios registrados
- Gestión de todas las reservas
- Registro de eventos (logs) exportable en JSON

### Cliente
- Visualizar clases disponibles con estado de ocupación
- Reservar y cancelar clases
- Ver historial de reservas
- Editar perfil

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/register | Registrarse |
| POST | /api/auth/logout | Cerrar sesión |
| GET | /api/auth/me | Usuario actual |
| GET/POST | /api/clases | Listar / Crear clase |
| PUT/DELETE | /api/clases/:id | Editar / Eliminar clase |
| GET | /api/usuarios | Listar usuarios (admin) |
| DELETE | /api/usuarios/:id | Eliminar usuario (admin) |
| GET/POST | /api/reservas | Reservas |
| PUT | /api/reservas/:id/cancel | Cancelar reserva |
| DELETE | /api/reservas/:id | Eliminar reserva |
| GET | /api/dashboard | KPIs del dashboard |
| GET | /api/logs | Registro de eventos |
| GET | /api/logs/export | Exportar logs JSON |
