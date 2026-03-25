/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let currentUser = null;
let loginRole = 'admin';
let editingClaseId = null;

/* ═══════════════════════════════════════
   API HELPER
═══════════════════════════════════════ */
async function api(method, url, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  setLang(lang);
  const { ok, data } = await api('GET', '/api/auth/me');
  if (ok && data.user) {
    currentUser = data.user;
    enterApp();
  }
});

/* ═══════════════════════════════════════
   AUTH UI
═══════════════════════════════════════ */
function openAuth(mode) {
  document.getElementById('auth-modal').classList.add('open');
  switchAuth(mode);
}
function closeAuth() {
  document.getElementById('auth-modal').classList.remove('open');
}
function switchAuth(mode) {
  document.querySelectorAll('.fview').forEach(v => v.classList.remove('active'));
  document.getElementById('fv-' + mode).classList.add('active');
  document.querySelectorAll('.atab').forEach((t, i) => {
    t.classList.toggle('active', (mode === 'login' && i === 0) || (mode === 'register' && i === 1));
  });
  document.getElementById('l-err').style.display = 'none';
  document.getElementById('r-err').style.display = 'none';
  document.getElementById('r-ok').style.display = 'none';
}
function setRole(el, r) {
  loginRole = r;
  document.querySelectorAll('#fv-login .rtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

/* ═══════════════════════════════════════
   LOGIN
═══════════════════════════════════════ */
async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-pass').value;
  const errEl = document.getElementById('l-err');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = t('err.fill');
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.disabled = true;

  const { ok, data } = await api('POST', '/api/auth/login', { email, password, role: loginRole });
  btn.disabled = false;

  if (!ok) {
    const msg = data.error === 'credentials' ? t('err.credentials') : t('err.server');
    errEl.textContent = msg;
    errEl.style.display = 'block';
    return;
  }

  currentUser = data.user;
  closeAuth();
  enterApp();
  showToast(t('toast.login'), 'ok');
}

/* ═══════════════════════════════════════
   REGISTER
═══════════════════════════════════════ */
async function doRegister() {
  const nombre = document.getElementById('r-nombre').value.trim();
  const apellido = document.getElementById('r-apellido').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const password = document.getElementById('r-pass').value;
  const errEl = document.getElementById('r-err');
  const okEl = document.getElementById('r-ok');
  errEl.style.display = 'none';
  okEl.style.display = 'none';

  if (!nombre || !apellido || !email || !password) {
    errEl.textContent = t('err.fill'); errEl.style.display = 'block'; return;
  }
  if (password.length < 6) {
    errEl.textContent = t('err.passLen'); errEl.style.display = 'block'; return;
  }

  const { ok, status, data } = await api('POST', '/api/auth/register', { nombre, apellido, email, password });

  if (!ok) {
    const msg = status === 409 ? t('err.emailExists') : status === 400 ? t('err.fill') : t('err.server');
    errEl.textContent = msg; errEl.style.display = 'block'; return;
  }

  currentUser = data.user;
  okEl.textContent = t('toast.registered'); okEl.style.display = 'block';
  setTimeout(() => { closeAuth(); enterApp(); showToast(t('toast.registered'), 'ok'); }, 700);
}

/* ═══════════════════════════════════════
   LOGOUT
═══════════════════════════════════════ */
async function doLogout() {
  await api('POST', '/api/auth/logout');
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';
  showToast(t('toast.logout'), 'info');
}

/* ═══════════════════════════════════════
   APP ENTRY
═══════════════════════════════════════ */
function enterApp() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('sb-uname').textContent = currentUser.nombre + ' ' + currentUser.apellido;
  document.getElementById('sb-uemail').textContent = currentUser.email;
  const badge = document.getElementById('sb-badge');
  badge.textContent = t(currentUser.rol === 'admin' ? 'role.admin' : 'role.client');
  badge.className = 'sb-role-badge ' + (currentUser.rol === 'admin' ? 'rb-admin' : 'rb-cliente');
  buildSidebar();
  const firstSec = currentUser.rol === 'admin' ? 'dashboard' : 'clases-cliente';
  goTo(firstSec);
  setLang(lang);
}

function buildSidebar() {
  const nav = document.getElementById('sb-nav');
  nav.innerHTML = '';
  const items = currentUser.rol === 'admin'
    ? [['dashboard','🏠','sidebar.dashboard'],['admin-clases','🏋️','sidebar.classes'],
       ['usuarios','👤','sidebar.users'],['admin-reservas','📅','sidebar.bookings'],
       ['logs','📋','sidebar.logs'],['perfil','⚙️','sidebar.profile']]
    : [['clases-cliente','🏋️','sidebar.myClasses'],
       ['mis-reservas','📅','sidebar.myBookings'],
       ['perfil','⚙️','sidebar.profile']];
  items.forEach(([id, ico, tk]) => {
    const d = document.createElement('div');
    d.className = 'sb-item';
    d.innerHTML = `<span class="ico">${ico}</span><span data-i18n="${tk}">${t(tk)}</span>`;
    d.onclick = () => goTo(id);
    d.id = 'sb-' + id;
    nav.appendChild(d);
  });
}

function goTo(id) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  const sbItem = document.getElementById('sb-' + id);
  if (sbItem) sbItem.classList.add('active');
  renderSection(id);
}

/* ═══════════════════════════════════════
   RENDER
═══════════════════════════════════════ */
function renderAll() {
  if (!currentUser) return;
  const active = document.querySelector('.sec.active');
  if (active) renderSection(active.id.replace('sec-', ''));
  // Update sidebar text
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

function renderSection(id) {
  if (id === 'dashboard') renderDashboard();
  else if (id === 'admin-clases') renderAdminClases();
  else if (id === 'usuarios') renderUsuarios();
  else if (id === 'admin-reservas') renderAdminReservas();
  else if (id === 'logs') renderLogs();
  else if (id === 'clases-cliente') renderClasesCliente();
  else if (id === 'mis-reservas') renderMisReservas();
  else if (id === 'perfil') renderPerfil();
}

function mkBadge(estado) {
  const statusMap = {
    confirmada: ['b-green', 'status.confirmed'],
    confirmed: ['b-green', 'status.confirmed'],
    pendiente: ['b-yellow', 'status.pending'],
    pending: ['b-yellow', 'status.pending'],
    cancelada: ['b-red', 'status.cancelled'],
    cancelled: ['b-red', 'status.cancelled'],
    disponible: ['b-green', 'status.available'],
    completa: ['b-red', 'status.full'],
  };
  const [cls, key] = statusMap[estado] || ['b-gray', estado];
  return `<span class="badge ${cls}">${t(key)}</span>`;
}

function capBar(ins, cap) {
  const pct = Math.min(100, Math.round(ins / cap * 100));
  const color = pct >= 100 ? '#dd0000' : pct >= 75 ? '#ffc800' : '#00c864';
  return `<div class="cap-wrap"><div class="cap-track"><div class="cap-fill" style="width:${pct}%;background:${color}"></div></div><span class="cap-txt">${ins}/${cap}</span></div>`;
}

/* DASHBOARD */
async function renderDashboard() {
  const { ok, data } = await api('GET', '/api/dashboard');
  if (!ok) return;
  document.getElementById('kpi-users').textContent = data.kpi.users;
  document.getElementById('kpi-clases').textContent = data.kpi.clases;
  document.getElementById('kpi-reservas').textContent = data.kpi.reservas;
  document.getElementById('kpi-ocup').textContent = data.kpi.ocupacion;
  document.getElementById('tb-recent').innerHTML = data.recent.map(r => `
    <tr><td>${r.clienteNombre}</td><td>${r.claseIcono} ${r.claseNombre}</td><td>${r.fecha}</td><td>${mkBadge(r.estado)}</td></tr>
  `).join('');
}

/* ADMIN CLASES */
async function renderAdminClases() {
  const { ok, data } = await api('GET', '/api/clases');
  if (!ok) return;
  document.getElementById('tb-admin-clases').innerHTML = data.map(c => {
    const est = c.inscritos >= c.cap ? 'completa' : 'disponible';
    return `<tr>
      <td><b>${c.icono} ${c.nombre}</b></td>
      <td style="font-size:.8rem;color:var(--muted)">${c.horario || '—'}</td>
      <td>${c.entrenador || '—'}</td>
      <td>${capBar(c.inscritos, c.cap)}</td>
      <td>${mkBadge(est)}</td>
      <td><div class="actions">
        <button class="btn-sm" onclick="editClase(${c.id})">${t('edit')}</button>
        <button class="btn-sm del" onclick="deleteClase(${c.id})">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}

/* USUARIOS */
async function renderUsuarios() {
  const { ok, data } = await api('GET', '/api/usuarios');
  if (!ok) return;
  document.getElementById('tb-usuarios').innerHTML = data.map(u => `
    <tr>
      <td><b>${u.nombre} ${u.apellido}</b></td>
      <td style="font-size:.8rem">${u.email}</td>
      <td><span class="badge ${u.rol === 'admin' ? 'b-red' : 'b-green'}">${u.rol}</span></td>
      <td style="font-size:.8rem;color:var(--muted)">${u.fecha}</td>
      <td>${u.rol !== 'admin' ? `<button class="btn-sm del" onclick="deleteUser(${u.id})">🗑</button>` : '—'}</td>
    </tr>
  `).join('');
}

/* ADMIN RESERVAS */
async function renderAdminReservas() {
  const { ok, data } = await api('GET', '/api/reservas');
  if (!ok) return;
  document.getElementById('tb-admin-reservas').innerHTML = data.map(r => `
    <tr>
      <td>${r.clienteNombre}</td>
      <td>${r.claseIcono} ${r.claseNombre}</td>
      <td style="font-size:.8rem">${r.fecha}</td>
      <td>${mkBadge(r.estado)}</td>
      <td><div class="actions">
        ${r.estado !== 'cancelada' ? `<button class="btn-sm del" onclick="cancelReserva(${r.id})">✕</button>` : ''}
        <button class="btn-sm del" onclick="deleteReserva(${r.id})">🗑</button>
      </div></td>
    </tr>
  `).join('');
}

/* LOGS */
async function renderLogs() {
  const { ok, data } = await api('GET', '/api/logs');
  if (!ok) return;
  document.getElementById('log-count').textContent = data.length + ' eventos';
  document.getElementById('tb-logs').innerHTML = data.map(l => `
    <tr>
      <td style="font-size:.76rem;color:var(--muted)">${l.timestamp}</td>
      <td style="font-size:.8rem">${l.user}</td>
      <td><span class="badge b-blue">${l.action}</span></td>
      <td style="font-size:.8rem;color:var(--muted)">${l.detail}</td>
    </tr>
  `).join('');
}

/* CLASES CLIENTE */
async function renderClasesCliente() {
  const { ok: ok1, data: clases } = await api('GET', '/api/clases');
  const { ok: ok2, data: reservas } = await api('GET', '/api/reservas');
  if (!ok1) return;

  const myReservedIds = ok2 ? reservas.filter(r => r.estado !== 'cancelada').map(r => r.claseId) : [];
  const grid = document.getElementById('cg-clases');

  grid.innerHTML = clases.map(c => {
    const pct = Math.min(100, Math.round(c.inscritos / c.cap * 100));
    const color = pct >= 100 ? '#dd0000' : pct >= 75 ? '#ffc800' : '#00c864';
    const isFull = c.inscritos >= c.cap;
    const isReserved = myReservedIds.includes(c.id);

    let btnClass = isReserved ? 'reserved' : isFull ? 'full' : 'avail';
    let btnTxt = isReserved ? t('action.reserved') : isFull ? t('action.full') : t('action.reserve');
    let btnClick = '';
    if (!isFull && !isReserved) btnClick = `onclick="reservarClase(${c.id})"`;
    else if (isReserved) btnClick = `onclick="cancelarMiReserva(${c.id})"`;

    return `<div class="class-card">
      <div class="cc-head">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="cc-icon">${c.icono}</div>
          <div><div class="cc-name">${c.nombre}</div><div class="cc-time">${c.entrenador || ''}</div></div>
        </div>
        ${isFull ? `<span class="badge b-red">${t('status.full')}</span>` : `<span class="badge b-green">${t('status.available')}</span>`}
      </div>
      <div style="font-size:.78rem;color:var(--muted);margin-bottom:12px">🕐 ${c.horario || '—'}</div>
      <div class="cc-bar">
        <div class="cc-bar-label"><span>${t('th.cap')}</span><span>${c.inscritos}/${c.cap}</span></div>
        <div class="cc-track"><div class="cc-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
      <button class="btn-reservar ${btnClass}" ${btnClick}>
        ${isReserved ? `<span title="${t('action.cancelReserved')}">${btnTxt}</span>` : btnTxt}
      </button>
    </div>`;
  }).join('');
}

/* MIS RESERVAS */
async function renderMisReservas() {
  const { ok, data } = await api('GET', '/api/reservas');
  const list = document.getElementById('mis-reservas-list');
  if (!ok || !data.length) {
    list.innerHTML = `<p style="color:var(--muted);padding:24px">${t('no.bookings')}</p>`;
    return;
  }
  list.innerHTML = data.map(r => `
    <div class="res-card">
      <div class="rc-info">
        <h4>${r.claseIcono} ${r.claseNombre}</h4>
        <span>${r.fecha} · ${mkBadge(r.estado)}</span>
      </div>
      ${r.estado !== 'cancelada'
        ? `<button class="btn-cancel-res" onclick="cancelarMiReserva2(${r.id})">${t('action.cancelReserved')}</button>`
        : `<span class="badge b-gray">${t('status.cancelled')}</span>`}
    </div>
  `).join('');
}

/* PERFIL */
function renderPerfil() {
  document.getElementById('p-name').textContent = currentUser.nombre + ' ' + currentUser.apellido;
  document.getElementById('p-email').textContent = currentUser.email;
  document.getElementById('p-avatar').textContent = currentUser.nombre[0].toUpperCase();
  document.getElementById('p-input-name').value = currentUser.nombre;
  document.getElementById('p-input-email').value = currentUser.email;
  document.getElementById('p-input-pass').value = '';
}

async function saveProfile() {
  const nombre = document.getElementById('p-input-name').value.trim();
  const email = document.getElementById('p-input-email').value.trim();
  if (!nombre || !email) { showToast(t('err.fill'), 'err'); return; }

  const body = { nombre, email };
  const { ok, data } = await api('PUT', '/api/perfil', body);
  if (!ok) {
    const msg = data.error === 'emailExists' ? t('err.emailExists') : t('err.server');
    showToast(msg, 'err'); return;
  }
  currentUser = data.user;
  document.getElementById('sb-uname').textContent = currentUser.nombre + ' ' + currentUser.apellido;
  document.getElementById('sb-uemail').textContent = currentUser.email;
  showToast(t('toast.profileSaved'), 'ok');
  renderPerfil();
}

/* ═══════════════════════════════════════
   CRUD CLASES
═══════════════════════════════════════ */
async function openModal(tipo) {
  if (tipo === 'clase') {
    editingClaseId = null;
    document.getElementById('m-clase-title').textContent = 'NUEVA CLASE';
    ['m-nombre', 'm-horario', 'm-entrenador', 'm-icono'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('m-cap').value = '20';
    document.getElementById('modal-clase').classList.add('open');
  } else if (tipo === 'reserva') {
    const { data: users } = await api('GET', '/api/usuarios');
    const { data: clases } = await api('GET', '/api/clases');
    document.getElementById('m-r-cliente').innerHTML = (users || [])
      .filter(u => u.rol === 'cliente')
      .map(u => `<option value="${u.id}">${u.nombre} ${u.apellido}</option>`).join('');
    document.getElementById('m-r-clase').innerHTML = (clases || [])
      .map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    document.getElementById('m-r-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-reserva').classList.add('open');
  }
}

async function editClase(id) {
  const { ok, data } = await api('GET', '/api/clases');
  if (!ok) return;
  const c = data.find(x => x.id === id); if (!c) return;
  editingClaseId = id;
  document.getElementById('m-clase-title').textContent = 'EDITAR CLASE';
  document.getElementById('m-nombre').value = c.nombre;
  document.getElementById('m-horario').value = c.horario || '';
  document.getElementById('m-entrenador').value = c.entrenador || '';
  document.getElementById('m-cap').value = c.cap;
  document.getElementById('m-icono').value = c.icono;
  document.getElementById('modal-clase').classList.add('open');
}

async function saveClase() {
  const nombre = document.getElementById('m-nombre').value.trim();
  if (!nombre) { showToast(t('err.fill'), 'err'); return; }
  const body = {
    nombre,
    horario: document.getElementById('m-horario').value.trim(),
    entrenador: document.getElementById('m-entrenador').value.trim(),
    cap: parseInt(document.getElementById('m-cap').value) || 20,
    icono: document.getElementById('m-icono').value.trim() || '🏋️'
  };
  const { ok } = editingClaseId
    ? await api('PUT', `/api/clases/${editingClaseId}`, body)
    : await api('POST', '/api/clases', body);
  if (!ok) { showToast(t('err.server'), 'err'); return; }
  closeModal('clase');
  showToast(t('toast.classSaved'), 'ok');
  renderAdminClases();
}

async function deleteClase(id) {
  if (!confirm('¿Eliminar esta clase?')) return;
  const { ok } = await api('DELETE', `/api/clases/${id}`);
  if (ok) { showToast(t('toast.classDeleted'), 'err'); renderAdminClases(); }
}

/* ═══════════════════════════════════════
   CRUD RESERVAS
═══════════════════════════════════════ */
async function saveReserva() {
  const userId = parseInt(document.getElementById('m-r-cliente').value);
  const claseId = parseInt(document.getElementById('m-r-clase').value);
  const fecha = document.getElementById('m-r-fecha').value;
  const { ok, data } = await api('POST', '/api/reservas', { userId, claseId, fecha });
  if (!ok) {
    const msg = data.error === 'noPlazas' ? t('err.noPlazas') : data.error === 'duplicate' ? t('err.duplicate') : t('err.server');
    showToast(msg, 'err'); return;
  }
  closeModal('reserva');
  showToast(t('toast.reserved'), 'ok');
  renderAdminReservas();
}

async function cancelReserva(id) {
  const { ok } = await api('PUT', `/api/reservas/${id}/cancel`);
  if (ok) { showToast(t('toast.cancelledRes'), 'info'); renderAdminReservas(); }
}

async function deleteReserva(id) {
  const { ok } = await api('DELETE', `/api/reservas/${id}`);
  if (ok) { showToast(t('toast.classDeleted'), 'err'); renderAdminReservas(); }
}

async function reservarClase(claseId) {
  const fecha = new Date().toISOString().split('T')[0];
  const { ok, data } = await api('POST', '/api/reservas', { claseId, fecha });
  if (!ok) {
    const msg = data.error === 'noPlazas' ? t('err.noPlazas') : data.error === 'duplicate' ? t('err.duplicate') : t('err.server');
    showToast(msg, 'err'); return;
  }
  showToast(t('toast.reserved'), 'ok');
  renderClasesCliente();
}

async function cancelarMiReserva(claseId) {
  const { data: reservas } = await api('GET', '/api/reservas');
  const r = (reservas || []).find(x => x.claseId === claseId && x.estado !== 'cancelada');
  if (!r) return;
  const { ok } = await api('PUT', `/api/reservas/${r.id}/cancel`);
  if (ok) { showToast(t('toast.cancelledRes'), 'info'); renderClasesCliente(); }
}

async function cancelarMiReserva2(resId) {
  const { ok } = await api('PUT', `/api/reservas/${resId}/cancel`);
  if (ok) { showToast(t('toast.cancelledRes'), 'info'); renderMisReservas(); }
}

async function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  const { ok } = await api('DELETE', `/api/usuarios/${id}`);
  if (ok) renderUsuarios();
}

/* ═══════════════════════════════════════
   MODALES
═══════════════════════════════════════ */
function closeModal(tipo) {
  document.getElementById('modal-' + tipo).classList.remove('open');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-bg')) e.target.classList.remove('open');
});

/* ═══════════════════════════════════════
   LOGS EXPORT
═══════════════════════════════════════ */
function exportLogs() {
  window.open('/api/logs/export', '_blank');
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast t-' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ENTER on login */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const activeForm = document.querySelector('.fview.active');
    if (!activeForm) return;
    if (activeForm.id === 'fv-login') doLogin();
    else if (activeForm.id === 'fv-register') doRegister();
  }
});
