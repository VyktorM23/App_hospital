// app.js - Control de asistencia con login y pantallas completas
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Estado de la aplicación
let currentAction = null; // 'entrada', 'salida', o 'registro'
let attendanceHistory = [];
let registeredEmployees = [];
let isLoggedIn = false;

// Credenciales (en producción esto iría en un backend)
const VALID_USERNAME = "admin";
const VALID_PASSWORD = "hospital2024";

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const hospitalTitle = document.getElementById('hospitalTitle');
const scanButton = document.getElementById('scanButton');
const adminButton = document.getElementById('adminButton');
const historyButton = document.getElementById('historyButton');
const logoutButton = document.getElementById('logoutButton');
const doLoginBtn = document.getElementById('doLoginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultContainer = document.getElementById('result-container');
const scanResult = document.getElementById('scan-result');
const cancelScanBtn = document.getElementById('cancel-scan-btn');

const actionSelectionScreen = document.getElementById('action-selection-screen');
const entryBtn = document.getElementById('entry-btn');
const exitBtn = document.getElementById('exit-btn');
const backFromActionBtn = document.getElementById('back-from-action-btn');

const adminMenuScreen = document.getElementById('admin-menu-screen');
const registerEmployeeBtn = document.getElementById('register-employee-btn');
const viewEmployeesBtn = document.getElementById('view-employees-btn');
const backFromAdminBtn = document.getElementById('back-from-admin-btn');

const employeesListScreen = document.getElementById('employees-list-screen');
const employeesListContainer = document.getElementById('employees-list-container');
const backFromEmployeesListBtn = document.getElementById('back-from-employees-list-btn');

const historyScreen = document.getElementById('history-screen');
const historyList = document.getElementById('history-list');
const backFromHistoryBtn = document.getElementById('back-from-history-btn');

const body = document.body;
const container = document.querySelector('.container');

let cameraPermissionGranted = false;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciada');
    cargarDatos();
    configurarBotones();
    registrarServiceWorker();
    
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR listo');
    }
    
    precargarCamara();
    mostrarLogin();
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
}

function guardarEmpleados() {
    localStorage.setItem('registeredEmployees', JSON.stringify(registeredEmployees));
}

function guardarHistorial() {
    localStorage.setItem('attendanceHistory', JSON.stringify(attendanceHistory));
}

function mostrarLogin() {
    loginScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
    loginError.style.display = 'none';
    isLoggedIn = false;
}

function mostrarMainScreen() {
    loginScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    actionSelectionScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    container.style.justifyContent = 'center';
}

function ocultarTodasPantallas() {
    actionSelectionScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
}

function configurarBotones() {
    doLoginBtn.addEventListener('click', hacerLogin);
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') hacerLogin(); });
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') hacerLogin(); });
    
    scanButton.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarPantallaAccion();
    });
    
    adminButton.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarAdminMenu();
    });
    
    historyButton.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarHistorial();
    });
    
    logoutButton.addEventListener('click', () => {
        mostrarLogin();
    });
    
    entryBtn.addEventListener('click', () => iniciarEscaneoConAccion('entrada'));
    exitBtn.addEventListener('click', () => iniciarEscaneoConAccion('salida'));
    backFromActionBtn.addEventListener('click', mostrarMainScreen);
    
    registerEmployeeBtn.addEventListener('click', () => iniciarEscaneoParaRegistro());
    viewEmployeesBtn.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarListaEmpleados();
    });
    backFromAdminBtn.addEventListener('click', mostrarMainScreen);
    
    backFromEmployeesListBtn.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarAdminMenu();
    });
    
    backFromHistoryBtn.addEventListener('click', mostrarMainScreen);
    cancelScanBtn.addEventListener('click', detenerEscaneo);
}

function hacerLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        isLoggedIn = true;
        loginError.style.display = 'none';
        mostrarMainScreen();
    } else {
        loginError.style.display = 'block';
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.focus();
    }
}

function mostrarPantallaAccion() {
    actionSelectionScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
}

function mostrarAdminMenu() {
    adminMenuScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
}

function mostrarListaEmpleados() {
    employeesListScreen.style.display = 'flex';
    actualizarListaEmpleados();
}

function actualizarListaEmpleados() {
    employeesListContainer.innerHTML = '';
    
    if (registeredEmployees.length === 0) {
        employeesListContainer.innerHTML = '<div class="no-employees">No hay empleados registrados</div>';
        return;
    }
    
    registeredEmployees.forEach(empleado => {
        const item = document.createElement('div');
        item.className = 'employee-item';
        item.innerHTML = `
            <div class="employee-nombre">${empleado.nombre}</div>
            <div class="employee-cedula">C.I: ${empleado.cedula}</div>
            <div class="employee-institucion">${empleado.institucion || 'Hospital Ernesto Segundo Paolini'}</div>
        `;
        employeesListContainer.appendChild(item);
    });
}

function mostrarHistorial() {
    historyScreen.style.display = 'flex';
    actualizarListaHistorial();
}

function actualizarListaHistorial() {
    historyList.innerHTML = '';
    
    const ultimosRegistros = [...attendanceHistory].reverse().slice(0, 20);
    
    if (ultimosRegistros.length === 0) {
        historyList.innerHTML = '<div class="no-history">No hay registros de asistencia</div>';
        return;
    }
    
    ultimosRegistros.forEach(registro => {
        const item = document.createElement('div');
        item.className = `history-item ${registro.accion}`;
        
        const fecha = new Date(registro.timestamp);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const horaFormateada = fecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        item.innerHTML = `
            <div class="history-nombre">${registro.nombre}</div>
            <div class="history-cedula">C.I: ${registro.cedula}</div>
            <div class="history-accion ${registro.accion}">${registro.accion === 'entrada' ? '🚪 ENTRADA' : '🚶 SALIDA'}</div>
            <div class="history-fecha">${fechaFormateada} ${horaFormateada}</div>
        `;
        historyList.appendChild(item);
    });
}

function iniciarEscaneoParaRegistro() {
    currentAction = 'registro';
    ocultarTodasPantallas();
    iniciarEscaneo();
}

function iniciarEscaneoConAccion(accion) {
    currentAction = accion;
    ocultarTodasPantallas();
    iniciarEscaneo();
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
    instructions.textContent = currentAction === 'registro' ? 
        '📝 Escanea el QR del empleado para REGISTRARLO' : 
        '📱 Coloca el código QR dentro del recuadro';
    
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
        mostrarAlertaError('No se pudo acceder a la cámara. Verifica los permisos.');
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
        const code = jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
        
        if (code) {
            console.log('✅ QR detectado:', code.data);
            procesarResultado(code.data);
        }
    } catch (error) {
        console.error('Error en escaneo:', error);
    }
}

function procesarResultado(data) {
    scanningActive = false;
    if (scanTimeout) clearTimeout(scanTimeout);
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    if (video) video.srcObject = null;
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    body.classList.remove('scanning-active');
    
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    videoContainer.style.display = 'none';
    
    let qrData = null;
    let nombre = 'No disponible';
    let cedula = 'No disponible';
    let institucion = 'No disponible';
    let tipo = null;
    
    try {
        qrData = JSON.parse(data);
        cedula = qrData.empleado_id || 'No disponible';
        nombre = qrData.nombre || 'No disponible';
        institucion = qrData.institucion || 'No disponible';
        tipo = qrData.tipo || null;
    } catch (e) {
        mostrarAlertaError('QR inválido: El código escaneado no tiene el formato correcto.');
        mostrarMainScreen();
        return;
    }
    
    if (currentAction === 'registro') {
        procesarRegistroEmpleado(qrData, nombre, cedula, institucion, tipo);
    } else if (currentAction === 'entrada' || currentAction === 'salida') {
        procesarAsistencia(qrData, nombre, cedula, institucion, tipo);
    }
}

function procesarRegistroEmpleado(qrData, nombre, cedula, institucion, tipo) {
    if (tipo !== 'registro_asistencia') {
        mostrarAlertaError('QR inválido: Este código no es válido para registro de empleados. Tipo esperado: "registro_asistencia"');
        mostrarMainScreen();
        return;
    }
    
    if (cedula === 'No disponible' || nombre === 'No disponible') {
        mostrarAlertaError('QR inválido: El código no contiene los datos requeridos (empleado_id y nombre).');
        mostrarMainScreen();
        return;
    }
    
    const empleadoExistente = registeredEmployees.find(emp => emp.cedula === cedula);
    
    if (empleadoExistente) {
        mostrarAlertaError(`⚠️ EMPLEADO YA REGISTRADO\n\nNombre: ${empleadoExistente.nombre}\nCédula: ${cedula}`);
        mostrarMainScreen();
        return;
    }
    
    const nuevoEmpleado = {
        cedula: cedula,
        nombre: nombre,
        institucion: institucion,
        fechaRegistro: new Date().toISOString()
    };
    
    registeredEmployees.push(nuevoEmpleado);
    guardarEmpleados();
    
    mostrarAlertaExito(`✅ EMPLEADO REGISTRADO\n\nNombre: ${nombre}\nCédula: ${cedula}\nInstitución: ${institucion}`);
    mostrarMainScreen();
}

function procesarAsistencia(qrData, nombre, cedula, institucion, tipo) {
    if (tipo !== 'registro_asistencia') {
        mostrarAlertaError('QR inválido: Este código no es válido para registro de asistencia.');
        mostrarMainScreen();
        return;
    }
    
    if (cedula === 'No disponible') {
        mostrarAlertaError('QR inválido: El código no contiene un empleado_id válido.');
        mostrarMainScreen();
        return;
    }
    
    const empleadoRegistrado = registeredEmployees.find(emp => emp.cedula === cedula);
    
    if (!empleadoRegistrado) {
        mostrarAlertaError(`❌ EMPLEADO NO REGISTRADO\n\nCédula: ${cedula}\n\nDebe registrarse primero en el menú ADMINISTRADOR.`);
        mostrarMainScreen();
        return;
    }
    
    const nombreFinal = empleadoRegistrado.nombre;
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-ES');
    const horaFormateada = ahora.toLocaleTimeString('es-ES');
    
    const registro = {
        nombre: nombreFinal,
        cedula: cedula,
        accion: currentAction,
        timestamp: ahora.toISOString()
    };
    
    attendanceHistory.push(registro);
    guardarHistorial();
    
    const accionTexto = currentAction === 'entrada' ? 'ENTRADA' : 'SALIDA';
    const colorAccion = currentAction === 'entrada' ? '#4CAF50' : '#f44336';
    
    resultContainer.style.display = 'flex';
    scanResult.innerHTML = `
        <div class="result-card">
            <div class="result-header" style="background: ${colorAccion};">
                <span class="result-action-icon">${currentAction === 'entrada' ? '🚪' : '🚶'}</span>
                <span class="result-action-text">${accionTexto}</span>
            </div>
            <div class="result-body">
                <div class="result-field">
                    <span class="field-label">NOMBRES:</span>
                    <span class="field-value">${nombreFinal}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">CEDULA:</span>
                    <span class="field-value">${cedula}</span>
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
                <button id="back-to-home-btn" class="btn result-home-btn">← VOLVER AL INICIO</button>
            </div>
        </div>
    `;
    
    document.getElementById('back-to-home-btn').addEventListener('click', () => {
        resultContainer.style.display = 'none';
        mostrarMainScreen();
    });
}

function mostrarAlertaError(mensaje) {
    const alerta = document.createElement('div');
    alerta.className = 'custom-alert error-alert';
    alerta.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">❌</div>
            <div class="alert-message">${mensaje.replace(/\n/g, '<br>')}</div>
            <button class="alert-btn">Aceptar</button>
        </div>
    `;
    document.body.appendChild(alerta);
    alerta.querySelector('.alert-btn').addEventListener('click', () => alerta.remove());
    setTimeout(() => { if (alerta.parentNode) alerta.remove(); }, 5000);
}

function mostrarAlertaExito(mensaje) {
    const alerta = document.createElement('div');
    alerta.className = 'custom-alert success-alert';
    alerta.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">✅</div>
            <div class="alert-message">${mensaje.replace(/\n/g, '<br>')}</div>
            <button class="alert-btn">Aceptar</button>
        </div>
    `;
    document.body.appendChild(alerta);
    alerta.querySelector('.alert-btn').addEventListener('click', () => alerta.remove());
    setTimeout(() => { if (alerta.parentNode) alerta.remove(); }, 4000);
}

function detenerEscaneo() {
    scanningActive = false;
    if (scanTimeout) clearTimeout(scanTimeout);
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    if (video) video.srcObject = null;
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    body.classList.remove('scanning-active');
    
    mostrarMainScreen();
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.createElement('button');
    btn.id = 'installButton';
    btn.className = 'btn btn-primary';
    btn.textContent = '📲 INSTALAR APP';
    btn.onclick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => { deferredPrompt = null; btn.remove(); });
        }
    };
    setTimeout(() => {
        if (document.querySelector('.buttons-container') && !document.getElementById('installButton')) {
            document.querySelector('.buttons-container').appendChild(btn);
        }
    }, 1000);
});

window.addEventListener('beforeunload', () => {
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    if (scanTimeout) clearTimeout(scanTimeout);
});