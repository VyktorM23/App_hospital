// app.js - Sistema de control de asistencia

let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Estado de la aplicación
let currentAction = null; // 'entrada', 'salida', 'registro'
let attendanceHistory = [];
let registeredEmployees = [];
let isLoggedIn = false;
let currentUser = null;

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const registerEmployeeBtn = document.getElementById('registerEmployeeBtn');
const historyButton = document.getElementById('historyButton');
const loginButton = document.getElementById('loginButton');
const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const newScanBtn = document.getElementById('new-scan-btn');
const cancelScanBtn = document.getElementById('cancel-scan-btn');
const actionSelectionScreen = document.getElementById('action-selection-screen');
const entryBtn = document.getElementById('entry-btn');
const exitBtn = document.getElementById('exit-btn');
const backFromActionBtn = document.getElementById('back-from-action-btn');
const historyScreen = document.getElementById('history-screen');
const historyList = document.getElementById('history-list');
const backFromHistoryBtn = document.getElementById('back-from-history-btn');
const registerScreen = document.getElementById('register-screen');
const registerResult = document.getElementById('register-result');
const backFromRegisterBtn = document.getElementById('back-from-register-btn');
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const backFromLoginBtn = document.getElementById('back-from-login-btn');
const employeesScreen = document.getElementById('employees-screen');
const employeesList = document.getElementById('employees-list');
const backFromEmployeesBtn = document.getElementById('back-from-employees-btn');
const logoutBtn = document.getElementById('logout-btn');
const body = document.body;
const hospitalTitle = document.querySelector('.hospital-title');
const container = document.querySelector('.container');
const buttonsContainer = document.querySelector('.buttons-container');

let cameraPermissionGranted = false;

// Credenciales de acceso
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciada');
    configurarBotones();
    registrarServiceWorker();
    cargarDatos();
    
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR listo');
        if (scanButton) scanButton.disabled = false;
        if (registerEmployeeBtn) registerEmployeeBtn.disabled = false;
    }
    
    precargarCamara();
    mostrarPantallaPrincipal(); // Mostrar pantalla principal sin pedir login
});

function cargarDatos() {
    const historialGuardado = localStorage.getItem('attendanceHistory');
    if (historialGuardado) {
        try {
            attendanceHistory = JSON.parse(historialGuardado);
        } catch (e) {
            attendanceHistory = [];
        }
    }
    
    const empleadosGuardados = localStorage.getItem('registeredEmployees');
    if (empleadosGuardados) {
        try {
            registeredEmployees = JSON.parse(empleadosGuardados);
        } catch (e) {
            registeredEmployees = [];
        }
    }
    
    console.log(`📋 ${registeredEmployees.length} empleados registrados`);
    console.log(`📊 ${attendanceHistory.length} registros de asistencia`);
}

function guardarEmpleados() {
    localStorage.setItem('registeredEmployees', JSON.stringify(registeredEmployees));
}

function guardarHistorial() {
    localStorage.setItem('attendanceHistory', JSON.stringify(attendanceHistory));
}

function mostrarPantallaPrincipal() {
    hospitalTitle.style.display = 'block';
    buttonsContainer.style.display = 'flex';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
}

function mostrarPantallaLogin() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    employeesScreen.style.display = 'none';
    loginError.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function mostrarPantallaEmpleados() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    employeesScreen.style.display = 'flex';
    actualizarListaEmpleados();
}

function actualizarListaEmpleados() {
    employeesList.innerHTML = '';
    
    if (registeredEmployees.length === 0) {
        employeesList.innerHTML = '<div class="no-data">📭 No hay empleados registrados</div>';
        return;
    }
    
    registeredEmployees.forEach(empleado => {
        const item = document.createElement('div');
        item.className = 'employee-item';
        item.innerHTML = `
            <div class="employee-info">
                <div class="employee-name">👤 ${empleado.nombre}</div>
                <div class="employee-details">
                    <span class="employee-id">📄 C.I: ${empleado.empleado_id}</span>
                    <span class="employee-institution">🏥 ${empleado.institucion}</span>
                </div>
                <div class="employee-date">📅 Registrado: ${new Date(empleado.fecha_registro).toLocaleDateString()}</div>
            </div>
            <button class="btn-delete-employee" data-id="${empleado.empleado_id}">🗑️ Eliminar</button>
        `;
        employeesList.appendChild(item);
    });
    
    document.querySelectorAll('.btn-delete-employee').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const empleadoId = btn.getAttribute('data-id');
            eliminarEmpleado(empleadoId);
        });
    });
}

function eliminarEmpleado(empleadoId) {
    if (confirm('¿Estás seguro de eliminar este empleado? Se perderá su historial de asistencia.')) {
        registeredEmployees = registeredEmployees.filter(emp => emp.empleado_id !== empleadoId);
        attendanceHistory = attendanceHistory.filter(reg => reg.cedula !== empleadoId);
        
        guardarEmpleados();
        guardarHistorial();
        actualizarListaEmpleados();
        mostrarToast('Empleado eliminado correctamente', 'success');
    }
}

function iniciarSesion(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        isLoggedIn = true;
        currentUser = username;
        mostrarPantallaEmpleados();
        mostrarToast(`Bienvenido ${username}`, 'success');
    } else {
        loginError.style.display = 'block';
        loginError.textContent = '❌ Usuario o contraseña incorrectos';
    }
}

function cerrarSesion() {
    isLoggedIn = false;
    currentUser = null;
    mostrarPantallaPrincipal();
    mostrarToast('Sesión cerrada', 'info');
}

function mostrarToast(mensaje, tipo = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${tipo}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${tipo === 'error' ? '❌' : (tipo === 'success' ? '✅' : 'ℹ️')}</span>
            <span class="toast-message">${mensaje}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function precargarCamara() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !cameraPermissionGranted) {
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        })
        .then(stream => {
            cameraPermissionGranted = true;
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Permiso de cámara pre-obtenido');
        })
        .catch(err => console.log('No se pudo pre-obtener permiso:', err));
    }
}

function configurarBotones() {
    if (loginButton) {
        loginButton.addEventListener('click', mostrarPantallaLogin);
    }
    
    if (scanButton) {
        scanButton.addEventListener('click', mostrarPantallaAccion);
    }
    
    if (registerEmployeeBtn) {
        registerEmployeeBtn.addEventListener('click', () => iniciarRegistroEmpleado());
    }
    
    if (historyButton) {
        historyButton.addEventListener('click', mostrarHistorial);
    }
    
    if (entryBtn) {
        entryBtn.addEventListener('click', () => iniciarEscaneoConAccion('entrada'));
    }
    
    if (exitBtn) {
        exitBtn.addEventListener('click', () => iniciarEscaneoConAccion('salida'));
    }
    
    if (backFromActionBtn) {
        backFromActionBtn.addEventListener('click', volverInicio);
    }
    
    if (backFromHistoryBtn) {
        backFromHistoryBtn.addEventListener('click', volverInicio);
    }
    
    if (backFromRegisterBtn) {
        backFromRegisterBtn.addEventListener('click', volverInicio);
    }
    
    if (backFromLoginBtn) {
        backFromLoginBtn.addEventListener('click', mostrarPantallaPrincipal);
    }
    
    if (backFromEmployeesBtn) {
        backFromEmployeesBtn.addEventListener('click', mostrarPantallaPrincipal);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', iniciarSesion);
    }
}

function iniciarRegistroEmpleado() {
    currentAction = 'registro';
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    iniciarEscaneo();
}

function mostrarPantallaAccion() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'flex';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    container.style.justifyContent = 'center';
}

function mostrarHistorial() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'flex';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    actualizarListaHistorial();
}

function volverInicio() {
    hospitalTitle.style.display = 'block';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    videoContainer.style.display = 'none';
    buttonsContainer.style.display = 'flex';
    container.style.justifyContent = 'center';
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    body.classList.remove('scanning-active');
    
    currentAction = null;
}

function actualizarListaHistorial() {
    historyList.innerHTML = '';
    
    const ultimosRegistros = [...attendanceHistory].reverse().slice(0, 10);
    
    if (ultimosRegistros.length === 0) {
        historyList.innerHTML = '<div class="no-history">📭 No hay registros de asistencia</div>';
        return;
    }
    
    ultimosRegistros.forEach(registro => {
        const item = document.createElement('div');
        item.className = `history-item ${registro.accion}`;
        
        const fecha = new Date(registro.timestamp);
        const fechaFormateada = fecha.toLocaleDateString('es-ES');
        const horaFormateada = fecha.toLocaleTimeString('es-ES');
        
        item.innerHTML = `
            <div class="history-nombre">${registro.nombre}</div>
            <div class="history-cedula">C.I: ${registro.cedula}</div>
            <div class="history-accion ${registro.accion}">${registro.accion === 'entrada' ? '🚪 ENTRADA' : '🚶 SALIDA'}</div>
            <div class="history-fecha">${fechaFormateada} ${horaFormateada}</div>
        `;
        
        historyList.appendChild(item);
    });
}

function iniciarEscaneoConAccion(accion) {
    currentAction = accion;
    hospitalTitle.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    iniciarEscaneo();
}

function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('✅ Service Worker registrado'))
                .catch(err => console.log('❌ Error SW:', err));
        });
    }
}

function crearOverlayEscaneo() {
    const overlayAnterior = document.querySelector('.scanning-overlay');
    if (overlayAnterior) overlayAnterior.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'scanning-overlay';
    overlay.innerHTML = `
        <div class="scanning-frame">
            <div class="scanning-line"></div>
        </div>
    `;
    
    const instructions = document.createElement('div');
    instructions.className = 'scanning-instructions';
    instructions.textContent = currentAction === 'registro' 
        ? '📝 Escanea el QR del empleado para REGISTRARLO' 
        : '📷 Coloca el código QR dentro del recuadro';
    
    body.appendChild(overlay);
    body.appendChild(instructions);
}

async function iniciarEscaneo() {
    console.log('📱 Iniciando escaneo...');
    
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Cámara no soportada');
        }
        
        body.classList.add('scanning-active');
        crearOverlayEscaneo();
        videoContainer.style.display = 'flex';
        buttonsContainer.style.display = 'none';
        container.style.justifyContent = 'flex-start';
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
        video.setAttribute('playsinline', true);
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => resolve();
        });
        
        await video.play();
        console.log('✅ Video reproduciendo');
        
        scanningActive = true;
        realizarEscaneo();
        
        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(function loop() {
            if (!scanningActive) return;
            realizarEscaneo();
            scanTimeout = setTimeout(loop, SCAN_INTERVAL);
        }, SCAN_INTERVAL);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('No se pudo acceder a la cámara', 'error');
        detenerEscaneo();
    }
}

function realizarEscaneo() {
    if (!scanningActive || !video || video.readyState < 2) return;
    
    try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        if (width === 0 || height === 0) return;
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, width, height);
        
        const imageData = context.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, width, height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            console.log('✅ QR detectado:', code.data);
            procesarQR(code.data);
        }
        
    } catch (error) {
        console.error('Error en escaneo:', error);
    }
}

function procesarQR(data) {
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) video.srcObject = null;
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    videoContainer.style.display = 'none';
    
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    let qrData = null;
    
    try {
        qrData = JSON.parse(data);
    } catch (e) {
        console.error('Error parsing QR:', e);
        mostrarToast('❌ QR no válido: Formato incorrecto', 'error');
        volverInicio();
        return;
    }
    
    if (!qrData.tipo || qrData.tipo !== 'registro_asistencia') {
        mostrarToast('❌ QR no válido: Este código no es para registro de asistencia', 'error');
        volverInicio();
        return;
    }
    
    if (!qrData.empleado_id || !qrData.nombre) {
        mostrarToast('❌ QR no válido: Faltan datos del empleado', 'error');
        volverInicio();
        return;
    }
    
    if (currentAction === 'registro') {
        registrarNuevoEmpleado(qrData);
        return;
    }
    
    if (currentAction === 'entrada' || currentAction === 'salida') {
        procesarAsistencia(qrData);
        return;
    }
}

function registrarNuevoEmpleado(qrData) {
    const empleadoExistente = registeredEmployees.find(emp => emp.empleado_id === qrData.empleado_id);
    
    if (empleadoExistente) {
        mostrarToast(`❌ El empleado con C.I. ${qrData.empleado_id} ya está registrado`, 'error');
        volverInicio();
        return;
    }
    
    const nuevoEmpleado = {
        empleado_id: qrData.empleado_id,
        nombre: qrData.nombre,
        institucion: qrData.institucion || 'Hospital Ernesto Segundo Paolini',
        fecha_registro: new Date().toISOString()
    };
    
    registeredEmployees.push(nuevoEmpleado);
    guardarEmpleados();
    
    mostrarToast(`✅ Empleado ${nuevoEmpleado.nombre} registrado correctamente`, 'success');
    
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'flex';
    
    registerResult.innerHTML = `
        <div class="result-card success-card">
            <div class="result-header" style="background: #4CAF50;">
                <span class="result-action-icon">✅</span>
                <span class="result-action-text">REGISTRADO</span>
            </div>
            <div class="result-body">
                <div class="result-field">
                    <span class="field-label">EMPLEADO:</span>
                    <span class="field-value">${nuevoEmpleado.nombre}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">CÉDULA:</span>
                    <span class="field-value">${nuevoEmpleado.empleado_id}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">INSTITUCIÓN:</span>
                    <span class="field-value">${nuevoEmpleado.institucion}</span>
                </div>
            </div>
        </div>
    `;
}

function procesarAsistencia(qrData) {
    const empleado = registeredEmployees.find(emp => emp.empleado_id === qrData.empleado_id);
    
    if (!empleado) {
        mostrarToast(`❌ EMPLEADO NO REGISTRADO\nC.I.: ${qrData.empleado_id}\n\nUse el botón "REGISTRAR EMPLEADO" primero`, 'error');
        volverInicio();
        return;
    }
    
    if (empleado.nombre !== qrData.nombre) {
        mostrarToast(`❌ DATOS INCONSISTENTES\nEl nombre del QR no coincide con el registro`, 'error');
        volverInicio();
        return;
    }
    
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-ES');
    const horaFormateada = ahora.toLocaleTimeString('es-ES');
    
    const registro = {
        nombre: empleado.nombre,
        cedula: empleado.empleado_id,
        accion: currentAction,
        timestamp: ahora.toISOString()
    };
    
    attendanceHistory.push(registro);
    guardarHistorial();
    
    const accionTexto = currentAction === 'entrada' ? 'ENTRADA' : 'SALIDA';
    const colorAccion = currentAction === 'entrada' ? '#4CAF50' : '#f44336';
    
    mostrarToast(`✅ ${accionTexto} registrada para ${empleado.nombre}`, 'success');
    
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    registerScreen.style.display = 'none';
    employeesScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    
    resultContainer.style.display = 'block';
    scanResult.innerHTML = `
        <div class="result-card">
            <div class="result-header" style="background: ${colorAccion};">
                <span class="result-action-icon">${currentAction === 'entrada' ? '🚪' : '🚶'}</span>
                <span class="result-action-text">${accionTexto}</span>
            </div>
            <div class="result-body">
                <div class="result-field">
                    <span class="field-label">EMPLEADO:</span>
                    <span class="field-value">${empleado.nombre}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">CÉDULA:</span>
                    <span class="field-value">${empleado.empleado_id}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">FECHA:</span>
                    <span class="field-value">${fechaFormateada}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">HORA:</span>
                    <span class="field-value result-time">${horaFormateada}</span>
                </div>
            </div>
            <div class="result-footer">
                <button id="back-to-home-btn" class="btn btn-primary result-home-btn">
                    ← VOLVER AL INICIO
                </button>
            </div>
        </div>
    `;
    
    const backBtn = document.getElementById('back-to-home-btn');
    if (backBtn) {
        backBtn.addEventListener('click', volverInicio);
    }
}

function detenerEscaneo() {
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) video.srcObject = null;
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    volverInicio();
}

function resetearEscaneo() {
    detenerEscaneo();
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (!document.getElementById('installButton') && buttonsContainer) {
        const btn = document.createElement('button');
        btn.id = 'installButton';
        btn.className = 'btn btn-primary';
        btn.textContent = '📲 INSTALAR APP';
        btn.onclick = instalarPWA;
        buttonsContainer.appendChild(btn);
    }
});

function instalarPWA() {
    if (!deferredPrompt) {
        alert('No disponible para instalar ahora');
        return;
    }
    
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Usuario aceptó instalar');
        }
        deferredPrompt = null;
        document.getElementById('installButton')?.remove();
    });
}

window.addEventListener('appinstalled', () => {
    document.getElementById('installButton')?.remove();
});

window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
});