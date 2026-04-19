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

// Credenciales
const VALID_USERNAME = "admin";
const VALID_PASSWORD = "1234";

// Elementos del DOM
const mainScreen = document.getElementById('main-screen');
const loginScreen = document.getElementById('login-screen');
const adminMenuScreen = document.getElementById('admin-menu-screen');
const actionSelectionScreen = document.getElementById('action-selection-screen');
const employeesListScreen = document.getElementById('employees-list-screen');
const historyScreen = document.getElementById('history-screen');
const configScreen = document.getElementById('config-screen');
const resultContainer = document.getElementById('result-container');
const videoContainer = document.getElementById('video-container');
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const scanResult = document.getElementById('scan-result');

// Botones principales
const loginButton = document.getElementById('loginButton');
const scanButton = document.getElementById('scanButton');
const historyButton = document.getElementById('historyButton');
const configButton = document.getElementById('configButton');

// Botones login
const doLoginBtn = document.getElementById('doLoginBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

// Botones admin
const registerEmployeeBtn = document.getElementById('register-employee-btn');
const viewEmployeesBtn = document.getElementById('view-employees-btn');
const logoutFromAdminBtn = document.getElementById('logout-from-admin-btn');

// Botones configuración
const clearDataBtn = document.getElementById('clear-data-btn');
const aboutBtn = document.getElementById('about-btn');
const backFromConfigBtn = document.getElementById('back-from-config-btn');

// Botones acción
const entryBtn = document.getElementById('entry-btn');
const exitBtn = document.getElementById('exit-btn');
const backFromActionBtn = document.getElementById('back-from-action-btn');

// Botones lista empleados
const backFromEmployeesListBtn = document.getElementById('back-from-employees-list-btn');

// Botones historial
const backFromHistoryBtn = document.getElementById('back-from-history-btn');

// Botones escaneo
const cancelScanBtn = document.getElementById('cancel-scan-btn');

const body = document.body;
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

function mostrarPantallaPrincipal() {
    mainScreen.style.display = 'flex';
    loginScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    configScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    isLoggedIn = false;
}

function mostrarLogin() {
    loginScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    configScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
    loginError.style.display = 'none';
}

function mostrarAdminMenu() {
    adminMenuScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    configScreen.style.display = 'none';
    resultContainer.style.display = 'none';
}

function mostrarConfiguracion() {
    configScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
}

function ocultarTodasPantallas() {
    mainScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    configScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
}

function configurarBotones() {
    // Botones principales
    loginButton.addEventListener('click', mostrarLogin);
    scanButton.addEventListener('click', () => {
        ocultarTodasPantallas();
        actionSelectionScreen.style.display = 'flex';
    });
    historyButton.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarHistorial();
    });
    configButton.addEventListener('click', mostrarConfiguracion);
    
    // Login
    doLoginBtn.addEventListener('click', hacerLogin);
    cancelLoginBtn.addEventListener('click', mostrarPantallaPrincipal);
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') hacerLogin(); });
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') hacerLogin(); });
    
    // Admin
    registerEmployeeBtn.addEventListener('click', () => {
        currentAction = 'registro';
        ocultarTodasPantallas();
        iniciarEscaneo();
    });
    viewEmployeesBtn.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarListaEmpleados();
    });
    logoutFromAdminBtn.addEventListener('click', () => {
        isLoggedIn = false;
        mostrarPantallaPrincipal();
    });
    
    // Configuración
    clearDataBtn.addEventListener('click', limpiarDatos);
    aboutBtn.addEventListener('click', mostrarAcercaDe);
    backFromConfigBtn.addEventListener('click', mostrarPantallaPrincipal);
    
    // Acción (Entrada/Salida)
    entryBtn.addEventListener('click', () => {
        currentAction = 'entrada';
        ocultarTodasPantallas();
        iniciarEscaneo();
    });
    exitBtn.addEventListener('click', () => {
        currentAction = 'salida';
        ocultarTodasPantallas();
        iniciarEscaneo();
    });
    backFromActionBtn.addEventListener('click', mostrarPantallaPrincipal);
    
    // Lista empleados
    backFromEmployeesListBtn.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarAdminMenu();
    });
    
    // Historial
    backFromHistoryBtn.addEventListener('click', mostrarPantallaPrincipal);
    
    // Escaneo - CANCELAR ARREGLADO
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', () => {
            detenerEscaneo();
        });
    }
}

function limpiarDatos() {
    if (confirm('¿Estás seguro de que deseas eliminar TODOS los empleados registrados y el historial de asistencias? Esta acción no se puede deshacer.')) {
        registeredEmployees = [];
        attendanceHistory = [];
        guardarEmpleados();
        guardarHistorial();
        mostrarAlertaExito('✅ Datos eliminados correctamente');
        mostrarPantallaPrincipal();
    }
}

function mostrarAcercaDe() {
    mostrarAlertaInfo('HOSPITAL ERNESTO SEGUNDO PAOLINI\n\nSistema de Control de Asistencia\nVersión 1.0\n\nDesarrollado para RR.HH.\n\nDesarrolado por:\n•T.S.U. Victor Medina\n•T.S.U. Carlos Roa\n•T.S.U. Eduardo Castellano\n•T.S.U. Leonel Marquez ');
}

function hacerLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        isLoggedIn = true;
        loginError.style.display = 'none';
        mostrarAdminMenu();
    } else {
        loginError.style.display = 'block';
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.focus();
    }
}

function mostrarListaEmpleados() {
    employeesListScreen.style.display = 'flex';
    actualizarTablaEmpleados();
}

function actualizarTablaEmpleados() {
    const tableBody = document.getElementById('employees-table-body');
    tableBody.innerHTML = '';
    
    if (registeredEmployees.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2" class="no-data">No hay empleados registrados</td></tr>';
        return;
    }
    
    registeredEmployees.forEach(empleado => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empleado.nombre}</td>
            <td>${empleado.cedula}</td>
        `;
        tableBody.appendChild(row);
    });
}

function mostrarHistorial() {
    historyScreen.style.display = 'flex';
    actualizarTablaHistorial();
}

function actualizarTablaHistorial() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';
    
    const ultimosRegistros = [...attendanceHistory].reverse().slice(0, 50);
    
    if (ultimosRegistros.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No hay registros de asistencia</td></tr>';
        return;
    }
    
    ultimosRegistros.forEach(registro => {
        const row = document.createElement('tr');
        const fecha = new Date(registro.timestamp);
        const fechaFormateada = fecha.toLocaleDateString('es-ES');
        const horaFormateada = fecha.toLocaleTimeString('es-ES');
        
        // Asignar clase según entrada o salida
        let accionClass = '';
        let accionTexto = '';
        
        if (registro.accion === 'entrada') {
            accionClass = 'accion-entrada';
            accionTexto = 'ENTRADA';
        } else {
            accionClass = 'accion-salida';
            accionTexto = 'SALIDA';
        }
        
        row.innerHTML = `
            <td style="font-weight: 500;">${registro.nombre}</td>
            <td>${registro.cedula}</td>
            <td class="${accionClass}">${accionTexto}</td>
            <td style="font-size: 12px; color: #666;">${fechaFormateada}<br>${horaFormateada}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // Forzar reflow para asegurar que los estilos se apliquen
    console.log('✅ Tabla actualizada con colores:', 
        document.querySelectorAll('.accion-entrada').length, 'entradas,',
        document.querySelectorAll('.accion-salida').length, 'salidas');
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
        'Escanea el QR del empleado para REGISTRARLO' : 
        'Coloca el código QR dentro del recuadro';
    
    body.appendChild(overlay);
    body.appendChild(instructions);
}

async function iniciarEscaneo() {
    console.log('Iniciando escaneo...');
    
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
        if (currentAction === 'registro') {
            mostrarAdminMenu();
        } else {
            mostrarPantallaPrincipal();
        }
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
        mostrarAdminMenu();
        return;
    }
    
    if (cedula === 'No disponible' || nombre === 'No disponible') {
        mostrarAlertaError('QR inválido: El código no contiene los datos requeridos (empleado_id y nombre).');
        mostrarAdminMenu();
        return;
    }
    
    const empleadoExistente = registeredEmployees.find(emp => emp.cedula === cedula);
    
    if (empleadoExistente) {
        mostrarAlertaError(`⚠️ EMPLEADO YA REGISTRADO\n\nNombre: ${empleadoExistente.nombre}\nCédula: ${cedula}`);
        mostrarAdminMenu();
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
    mostrarAdminMenu();
}

function procesarAsistencia(qrData, nombre, cedula, institucion, tipo) {
    if (tipo !== 'registro_asistencia') {
        mostrarAlertaError('QR inválido: Este código no es válido para registro de asistencia.');
        mostrarPantallaPrincipal();
        return;
    }
    
    if (cedula === 'No disponible') {
        mostrarAlertaError('QR inválido: El código no contiene un empleado_id válido.');
        mostrarPantallaPrincipal();
        return;
    }
    
    const empleadoRegistrado = registeredEmployees.find(emp => emp.cedula === cedula);
    
    if (!empleadoRegistrado) {
        mostrarAlertaError(`❌ EMPLEADO NO REGISTRADO\n\nCédula: ${cedula}\n\nDebe registrarse primero en el menú ADMINISTRADOR.`);
        mostrarPantallaPrincipal();
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
                <span class="result-action-icon">${currentAction === 'entrada' ? '' : ''}</span>
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
        mostrarPantallaPrincipal();
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

function mostrarAlertaInfo(mensaje) {
    const alerta = document.createElement('div');
    alerta.className = 'custom-alert';
    alerta.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">ℹ️</div>
            <div class="alert-message">${mensaje.replace(/\n/g, '<br>')}</div>
            <button class="alert-btn">Aceptar</button>
        </div>
    `;
    document.body.appendChild(alerta);
    alerta.querySelector('.alert-btn').addEventListener('click', () => alerta.remove());
    setTimeout(() => { if (alerta.parentNode) alerta.remove(); }, 5000);
}

function detenerEscaneo() {
    console.log('🛑 Deteniendo escaneo...');
    scanningActive = false;
    
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    
    body.classList.remove('scanning-active');
    videoContainer.style.display = 'none';
    
    // Volver a la pantalla correcta según la acción
    if (currentAction === 'registro') {
        mostrarAdminMenu();
    } else {
        mostrarPantallaPrincipal();
    }
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.createElement('button');
    btn.id = 'installButton';
    btn.className = 'btn btn-login-main';
    btn.textContent = 'INSTALAR APP';
    btn.onclick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => { deferredPrompt = null; btn.remove(); });
        }
    };
    setTimeout(() => {
        if (document.querySelector('.center-buttons') && !document.getElementById('installButton')) {
            document.querySelector('.center-buttons').appendChild(btn);
        }
    }, 1000);
});

window.addEventListener('beforeunload', () => {
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    if (scanTimeout) clearTimeout(scanTimeout);
});