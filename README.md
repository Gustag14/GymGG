GymGG — Sistema de gestión de gimnasios
Aplicación Flask completa para gestión de gimnasios con base de datos SQLite.

Instalación
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar la aplicación
python app.py
La aplicación arrancará en: http://localhost:5000

Credenciales de acceso
Rol	Correo electrónico	Contraseña
Administrador	admin@gymgg.com	123456
Los clientes se registran ellos mismos desde la página de destino.

Estructura
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
Funcionalidades
Administración
Dashboard con KPIs en tiempo real
CRUD completo de clases
Listado de usuarios registrados
Gestión de todas las reservas
Registro de eventos (logs) exportables en JSON
Cliente
Visualizar clases disponibles con estado de ocupación
Reservar y cancelar clases
Ver historial de reservas
Editar perfil
Puntos finales de la API
Método	Ruta	Descripción
CORREO	/api/auth/login	Iniciar sesión
CORREO	/api/auth/register	Registrarse
CORREO	/api/auth/logout	Cerrar sesión
CONSEGUIR	/api/auth/me	Usuario actual
OBTENER/POSTEAR	/api/clases	Listar / Crear clase
PONER/ELIMINAR	/api/clases/:id	Editar / Eliminar clase
CONSEGUIR	/api/usuarios	Listar usuarios (admin)
BORRAR	/api/usuarios/:id	Eliminar usuario (admin)
OBTENER/POSTEAR	/api/reservas	Reservas
PONER	/api/reservas/:id/cancelar	Cancelar reserva
BORRAR	/api/reservas/:id	Eliminar reserva
CONSEGUIR	/api/panel de control	Indicadores clave de rendimiento (KPI) del panel de control
CONSEGUIR	/api/logs	Registro de eventos
CONSEGUIR	/api/logs/export	Exportar registros JSON
