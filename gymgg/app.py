from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'gymgg-secret-key-2026'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gymgg.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
basedir = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'gymgg.db')

db = SQLAlchemy(app)

# ══════════════════════════════════════
#  MODELOS
# ══════════════════════════════════════

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), nullable=False)
    apellido = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    rol = db.Column(db.String(20), default='cliente')  # 'admin' o 'cliente'
    fecha_registro = db.Column(db.Date, default=date.today)
    reservas = db.relationship('Reserva', backref='usuario', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'apellido': self.apellido,
            'email': self.email,
            'rol': self.rol,
            'fecha': str(self.fecha_registro)
        }

class Clase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    horario = db.Column(db.String(150))
    entrenador = db.Column(db.String(100))
    capacidad = db.Column(db.Integer, default=20)
    inscritos = db.Column(db.Integer, default=0)
    icono = db.Column(db.String(10), default='🏋️')
    reservas = db.relationship('Reserva', backref='clase', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'horario': self.horario,
            'entrenador': self.entrenador,
            'cap': self.capacidad,
            'inscritos': self.inscritos,
            'icono': self.icono
        }


class Reserva(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    clase_id = db.Column(db.Integer, db.ForeignKey('clase.id'), nullable=False)
    fecha = db.Column(db.Date, default=date.today)
    estado = db.Column(db.String(20), default='confirmada')  # confirmada, cancelada, pendiente

    def to_dict(self):
        u = User.query.get(self.user_id)
        c = Clase.query.get(self.clase_id)
        return {
            'id': self.id,
            'userId': self.user_id,
            'claseId': self.clase_id,
            'clienteNombre': f'{u.nombre} {u.apellido}' if u else '?',
            'claseNombre': c.nombre if c else '?',
            'claseIcono': c.icono if c else '🏋️',
            'fecha': str(self.fecha),
            'estado': self.estado
        }


class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.now)
    usuario = db.Column(db.String(120))
    accion = db.Column(db.String(80))
    detalle = db.Column(db.String(255))

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%d/%m/%Y %H:%M:%S'),
            'iso': self.timestamp.isoformat(),
            'user': self.usuario,
            'action': self.accion,
            'detail': self.detalle
        }


# ══════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════

def add_log(usuario, accion, detalle):
    log = Log(usuario=usuario, accion=accion, detalle=detalle)
    db.session.add(log)
    db.session.commit()

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'No autorizado'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'No autorizado'}), 401
        user = User.query.get(session['user_id'])
        if not user or user.rol != 'admin':
            return jsonify({'error': 'Acceso denegado'}), 403
        return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════
#  RUTAS PRINCIPALES
# ══════════════════════════════════════

@app.route('/')
def index():
    return render_template('index.html')


# ══════════════════════════════════════
#  API AUTH
# ══════════════════════════════════════

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'cliente')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'credentials'}), 401

    # Admin solo puede entrar como admin; cliente solo como cliente
    if role == 'admin' and user.rol != 'admin':
        return jsonify({'error': 'credentials'}), 401
    if role == 'cliente' and user.rol == 'admin':
        # Admin puede entrar desde cualquier pestaña
        pass

    session['user_id'] = user.id
    add_log(user.email, 'LOGIN', 'Inicio de sesión exitoso')

    return jsonify({'ok': True, 'user': user.to_dict()})


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    nombre = data.get('nombre', '').strip()
    apellido = data.get('apellido', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    rol = data.get('rol', 'cliente')

    if not all([nombre, apellido, email, password]):
        return jsonify({'error': 'fill'}), 400
    if len(password) < 6:
        return jsonify({'error': 'passLen'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'emailExists'}), 409

    # Solo se permite registrar clientes desde el formulario público
    # Para crear admins, solo el admin actual puede hacerlo
    rol_final = 'cliente'

    user = User(nombre=nombre, apellido=apellido, email=email, rol=rol_final)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    add_log(email, 'REGISTER', f'Nueva cuenta creada como {rol_final}')

    return jsonify({'ok': True, 'user': user.to_dict()})


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            add_log(user.email, 'LOGOUT', 'Sesión cerrada')
    session.pop('user_id', None)
    return jsonify({'ok': True})


@app.route('/api/auth/me')
def me():
    if 'user_id' not in session:
        return jsonify({'user': None})
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'user': None})
    return jsonify({'user': user.to_dict()})


# ══════════════════════════════════════
#  API CLASES
# ══════════════════════════════════════

@app.route('/api/clases', methods=['GET'])
@login_required
def get_clases():
    clases = Clase.query.all()
    return jsonify([c.to_dict() for c in clases])


@app.route('/api/clases', methods=['POST'])
@admin_required
def create_clase():
    data = request.get_json()
    nombre = data.get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'fill'}), 400

    clase = Clase(
        nombre=nombre,
        horario=data.get('horario', ''),
        entrenador=data.get('entrenador', ''),
        capacidad=int(data.get('cap', 20)),
        icono=data.get('icono', '🏋️')
    )
    db.session.add(clase)
    db.session.commit()
    user = User.query.get(session['user_id'])
    add_log(user.email, 'CLASS_CREATE', f'Clase creada: {nombre}')
    return jsonify({'ok': True, 'clase': clase.to_dict()})


@app.route('/api/clases/<int:id>', methods=['PUT'])
@admin_required
def update_clase(id):
    clase = Clase.query.get_or_404(id)
    data = request.get_json()
    clase.nombre = data.get('nombre', clase.nombre)
    clase.horario = data.get('horario', clase.horario)
    clase.entrenador = data.get('entrenador', clase.entrenador)
    clase.capacidad = int(data.get('cap', clase.capacidad))
    clase.icono = data.get('icono', clase.icono)
    db.session.commit()
    user = User.query.get(session['user_id'])
    add_log(user.email, 'CLASS_EDIT', f'Clase editada: {clase.nombre}')
    return jsonify({'ok': True, 'clase': clase.to_dict()})


@app.route('/api/clases/<int:id>', methods=['DELETE'])
@admin_required
def delete_clase(id):
    clase = Clase.query.get_or_404(id)
    nombre = clase.nombre
    db.session.delete(clase)
    db.session.commit()
    user = User.query.get(session['user_id'])
    add_log(user.email, 'CLASS_DELETE', f'Clase eliminada: {nombre}')
    return jsonify({'ok': True})


# ══════════════════════════════════════
#  API USUARIOS (solo admin)
# ══════════════════════════════════════

@app.route('/api/usuarios', methods=['GET'])
@admin_required
def get_usuarios():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])


@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
@admin_required
def delete_usuario(id):
    user = User.query.get_or_404(id)
    if user.rol == 'admin':
        return jsonify({'error': 'No puedes eliminar al administrador'}), 403
    email = user.email
    db.session.delete(user)
    db.session.commit()
    admin = User.query.get(session['user_id'])
    add_log(admin.email, 'USER_DELETE', f'Usuario eliminado: {email}')
    return jsonify({'ok': True})


# ══════════════════════════════════════
#  API RESERVAS
# ══════════════════════════════════════

@app.route('/api/reservas', methods=['GET'])
@login_required
def get_reservas():
    user = User.query.get(session['user_id'])
    if user.rol == 'admin':
        reservas = Reserva.query.all()
    else:
        reservas = Reserva.query.filter_by(user_id=user.id).all()
    return jsonify([r.to_dict() for r in reservas])


@app.route('/api/reservas', methods=['POST'])
@login_required
def create_reserva():
    data = request.get_json()
    current_user = User.query.get(session['user_id'])

    # Admin puede crear reservas para cualquier usuario
    if current_user.rol == 'admin':
        user_id = int(data.get('userId', current_user.id))
    else:
        user_id = current_user.id

    clase_id = int(data.get('claseId'))
    fecha_str = data.get('fecha', str(date.today()))
    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except:
        fecha = date.today()

    clase = Clase.query.get_or_404(clase_id)

    if clase.inscritos >= clase.capacidad:
        return jsonify({'error': 'noPlazas'}), 400

    existing = Reserva.query.filter_by(
        user_id=user_id, clase_id=clase_id, estado='confirmada'
    ).first()
    if existing:
        return jsonify({'error': 'duplicate'}), 409

    reserva = Reserva(user_id=user_id, clase_id=clase_id, fecha=fecha, estado='confirmada')
    clase.inscritos = min(clase.capacidad, clase.inscritos + 1)
    db.session.add(reserva)
    db.session.commit()
    add_log(current_user.email, 'BOOKING_CREATE', f'Reserva en clase: {clase.nombre}')
    return jsonify({'ok': True, 'reserva': reserva.to_dict()})


@app.route('/api/reservas/<int:id>/cancel', methods=['PUT'])
@login_required
def cancel_reserva(id):
    reserva = Reserva.query.get_or_404(id)
    current_user = User.query.get(session['user_id'])

    # Solo el dueño o admin puede cancelar
    if current_user.rol != 'admin' and reserva.user_id != current_user.id:
        return jsonify({'error': 'Acceso denegado'}), 403

    if reserva.estado != 'cancelada':
        reserva.estado = 'cancelada'
        clase = Clase.query.get(reserva.clase_id)
        if clase:
            clase.inscritos = max(0, clase.inscritos - 1)
        db.session.commit()
        add_log(current_user.email, 'BOOKING_CANCEL', f'Reserva cancelada id:{id}')

    return jsonify({'ok': True})


@app.route('/api/reservas/<int:id>', methods=['DELETE'])
@admin_required
def delete_reserva(id):
    reserva = Reserva.query.get_or_404(id)
    if reserva.estado != 'cancelada':
        clase = Clase.query.get(reserva.clase_id)
        if clase:
            clase.inscritos = max(0, clase.inscritos - 1)
    db.session.delete(reserva)
    db.session.commit()
    user = User.query.get(session['user_id'])
    add_log(user.email, 'BOOKING_DELETE', f'Reserva eliminada id:{id}')
    return jsonify({'ok': True})


# ══════════════════════════════════════
#  API PERFIL
# ══════════════════════════════════════

@app.route('/api/perfil', methods=['PUT'])
@login_required
def update_perfil():
    data = request.get_json()
    user = User.query.get(session['user_id'])
    nombre = data.get('nombre', '').strip()
    email = data.get('email', '').strip()

    if not nombre or not email:
        return jsonify({'error': 'fill'}), 400

    # Check email no duplicado
    existing = User.query.filter_by(email=email).first()
    if existing and existing.id != user.id:
        return jsonify({'error': 'emailExists'}), 409

    user.nombre = nombre
    user.email = email
    db.session.commit()
    add_log(email, 'PROFILE_UPDATE', 'Perfil actualizado')
    return jsonify({'ok': True, 'user': user.to_dict()})


# ══════════════════════════════════════
#  API LOGS
# ══════════════════════════════════════

@app.route('/api/logs', methods=['GET'])
@admin_required
def get_logs():
    logs = Log.query.order_by(Log.timestamp.desc()).all()
    return jsonify([l.to_dict() for l in logs])


@app.route('/api/logs/export', methods=['GET'])
@admin_required
def export_logs():
    from flask import Response
    logs = Log.query.order_by(Log.timestamp.desc()).all()
    data = json.dumps([l.to_dict() for l in logs], indent=2, ensure_ascii=False)
    return Response(
        data,
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=gymgg-logs.json'}
    )


# ══════════════════════════════════════
#  API DASHBOARD KPIs
# ══════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
@admin_required
def get_dashboard():
    total_users = User.query.count()
    total_clases = Clase.query.count()
    total_reservas = Reserva.query.filter(Reserva.estado != 'cancelada').count()
    clases = Clase.query.all()
    ocup = 0
    if clases:
        ocup = round(sum(c.inscritos / c.capacidad for c in clases if c.capacidad > 0) / len(clases) * 100)

    recent = Reserva.query.order_by(Reserva.id.desc()).limit(6).all()

    return jsonify({
        'kpi': {
            'users': total_users,
            'clases': total_clases,
            'reservas': total_reservas,
            'ocupacion': f'{ocup}%'
        },
        'recent': [r.to_dict() for r in recent]
    })


# ══════════════════════════════════════
#  INIT DB
# ══════════════════════════════════════

def init_db():
    with app.app_context():
        db.create_all()
        # Crear admin por defecto si no existe
        if not User.query.filter_by(email='admin@gymgg.com').first():
            admin = User(nombre='Admin', apellido='GymGG', email='admin@gymgg.com', rol='admin',
                        fecha_registro=date(2026, 1, 1))
            admin.set_password('123456')
            db.session.add(admin)
            db.session.commit()
            print('✅ Admin creado: admin@gymgg.com / 123456')

        # Clases de ejemplo si la tabla está vacía
        if Clase.query.count() == 0:
            clases = [
                Clase(nombre='Yoga', horario='Lun/Mié 09:00—10:00', entrenador='Carlos Pérez', capacidad=15, inscritos=0, icono='🧘'),
                Clase(nombre='Spinning', horario='Mar/Jue 18:00—19:00', entrenador='Ana Ruiz', capacidad=20, inscritos=0, icono='🚴'),
                Clase(nombre='Boxeo', horario='Lun/Vie 18:00—19:00', entrenador='Marcos Gil', capacidad=12, inscritos=0, icono='🥊'),
                Clase(nombre='Pilates', horario='Mié/Vie 10:00—11:00', entrenador='Carmen López', capacidad=10, inscritos=0, icono='🤸'),
                Clase(nombre='CrossFit', horario='Mar/Jue/Sáb 07:00—08:00', entrenador='Diego Sanz', capacidad=16, inscritos=0, icono='💪'),
            ]
            db.session.add_all(clases)
            db.session.commit()
            print('✅ Clases de ejemplo creadas')

        add_log('sistema', 'INIT', 'Aplicación iniciada')
        db.session.commit()


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
