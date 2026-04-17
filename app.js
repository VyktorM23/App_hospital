// app.js - Sistema de control de asistencia con validación de empleados

let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Estado de la aplicación
let currentAction = null; // 'entrada' o 'salida'
let attendanceHistory = []; // Historial de asistencias
let registeredEmployees = []; // Base de datos de empleados registrados

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const registerEmployeeBtn = document.getElementById('registerEmployeeBtn');
const historyButton = document.getElementById('historyButton');
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
const body = document.body;
const hospitalTitle = document.querySelector('.hospital-title');
const container = document.querySelector('.container');
const buttonsContainer = document.querySelector('.buttons-container');

let cameraPermissionGranted = false;

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
});

// Cargar datos desde localStorage
function cargarDatos() {
    // Cargar historial de asistencias
    const historialGuardado = localStorage.getItem('attendanceHistory');
    if (historialGuardado) {
        try {
            attendanceHistory = JSON.parse(historialGuardado);
        } catch (e) {
            attendanceHistory = [];
        }
    }
    
    // Cargar empleados registrados
    const empleadosGuardados = localStorage.getItem('registeredEmployees');
    if (empleadosGuardados) {
        try {
            registeredEmployees = JSON.parse(empleadosGuardados);
        } catch (e) {
            registeredEmployees = [];
        }
    }
    
    console.log(`📋 ${registeredEmployees.length} empleados registrados`);
}

// Guardar datos en localStorage
function guardarEmpleados() {
    localStorage.setItem('registeredEmployees', JSON.stringify(registeredEmployees));
}

function guardarHistorial() {
    localStorage.setItem('attendanceHistory', JSON.stringify(attendanceHistory));
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
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
}

// INICIAR REGISTRO DE NUEVO EMPLEADO
function iniciarRegistroEmpleado() {
    currentAction = 'registro';
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    iniciarEscaneo();
}

// MOSTRAR PANTALLAS
function mostrarPantallaAccion() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'flex';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    container.style.justifyContent = 'center';
}

function mostrarHistorial() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'flex';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    actualizarListaHistorial();
}

function volverInicio() {
    hospitalTitle.style.display = 'block';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    registerScreen.style.display = 'none';
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
        historyList.innerHTML = '<div class="no-history">No hay registros de asistencia</div>';
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
        ? 'Escanea el QR del empleado para registrarlo' 
        : 'Coloca el código QR dentro del recuadro';
    
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
        mostrarError('No se pudo acceder a la cámara');
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

// FUNCIÓN PRINCIPAL: Procesar el QR escaneado
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
    
    // Parsear el QR
    let qrData = null;
    
    try {
        // Intentar parsear como JSON
        qrData = JSON.parse(data);
    } catch (e) {
        // Si no es JSON válido, mostrar error
        mostrarError('QR no válido: Formato incorrecto');
        volverInicio();
        return;
    }
    
    // VALIDAR que el QR tenga el tipo correcto
    if (qrData.tipo !== 'registro_asistencia') {
        mostrarError('QR no válido: Este código no es para registro de asistencia');
        volverInicio();
        return;
    }
    
    // Validar campos requeridos
    if (!qrData.empleado_id || !qrData.nombre) {
        mostrarError('QR no válido: Faltan datos del empleado');
        volverInicio();
        return;
    }
    
    // Si es modo REGISTRO de nuevo empleado
    if (currentAction === 'registro') {
        registrarNuevoEmpleado(qrData);
        return;
    }
    
    // Si es modo ENTRADA o SALIDA (asistencia)
    if (currentAction === 'entrada' || currentAction === 'salida') {
        procesarAsistencia(qrData);
        return;
    }
}

// REGISTRAR NUEVO EMPLEADO
function registrarNuevoEmpleado(qrData) {
    // Verificar si el empleado ya existe
    const empleadoExistente = registeredEmployees.find(emp => emp.empleado_id === qrData.empleado_id);
    
    if (empleadoExistente) {
        mostrarError(`El empleado con C.I. ${qrData.empleado_id} ya está registrado`);
        volverInicio();
        return;
    }
    
    // Registrar nuevo empleado
    const nuevoEmpleado = {
        empleado_id: qrData.empleado_id,
        nombre: qrData.nombre,
        institucion: qrData.institucion || 'Hospital Ernesto Segundo Paolini',
        fecha_registro: new Date().toISOString()
    };
    
    registeredEmployees.push(nuevoEmpleado);
    guardarEmpleados();
    
    // Mostrar éxito
    mostrarPantallaRegistroExito(nuevoEmpleado);
}

function mostrarPantallaRegistroExito(empleado) {
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
                    <span class="field-label">EMPLEADO REGISTRADO:</span>
                    <span class="field-value">${empleado.nombre}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">CÉDULA:</span>
                    <span class="field-value">${empleado.empleado_id}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">INSTITUCIÓN:</span>
                    <span class="field-value">${empleado.institucion}</span>
                </div>
            </div>
        </div>
    `;
}

// PROCESAR ASISTENCIA (Entrada/Salida)
function procesarAsistencia(qrData) {
    // Buscar empleado en la base de datos local
    const empleado = registeredEmployees.find(emp => emp.empleado_id === qrData.empleado_id);
    
    if (!empleado) {
        mostrarError(`EMPLEADO NO REGISTRADO\nC.I.: ${qrData.empleado_id}\n\nPrimero debe registrar al empleado usando el botón "REGISTRAR EMPLEADO"`);
        volverInicio();
        return;
    }
    
    // Verificar que el nombre coincida
    if (empleado.nombre !== qrData.nombre) {
        mostrarError(`Datos inconsistentes\nEl nombre no coincide con el registro`);
        volverInicio();
        return;
    }
    
    // Registrar asistencia
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
    
    // Mostrar resultado
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    registerScreen.style.display = 'none';
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
    
    document.getElementById('back-to-home-btn').addEventListener('click', volverInicio);
}

// Mostrar error
function mostrarError(mensaje) {
    // Crear toast de error
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <div class="error-toast-content">
            <span class="error-icon">❌</span>
            <span class="error-message">${mensaje}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    // Animación de entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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