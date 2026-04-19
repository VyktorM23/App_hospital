// app.js - Funcionalidad completa de escaneo con registro de asistencia
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Estado de la aplicación
let currentAction = null; // 'entrada', 'salida', o 'registro'
let attendanceHistory = []; // Historial de asistencias
let registeredEmployees = []; // Lista de empleados registrados

// Elementos del DOM
const scanButton = document.getElementById('scanButton');
const loginButton = document.getElementById('loginButton');
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
const body = document.body;
const hospitalTitle = document.querySelector('.hospital-title');
const container = document.querySelector('.container');
const buttonsContainer = document.querySelector('.buttons-container');

// Nuevos elementos para el menú de inicio de sesión
const loginMenuScreen = document.getElementById('login-menu-screen');
const registerEmployeeBtn = document.getElementById('register-employee-btn');
const viewEmployeesBtn = document.getElementById('view-employees-btn');
const backFromLoginMenuBtn = document.getElementById('back-from-login-menu-btn');

// Pantalla de lista de empleados
const employeesListScreen = document.getElementById('employees-list-screen');
const employeesListContainer = document.getElementById('employees-list-container');
const backFromEmployeesListBtn = document.getElementById('back-from-employees-list-btn');

// Variable para controlar si ya se solicitó permiso de cámara
let cameraPermissionGranted = false;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciada');
    cargarDatos();
    configurarBotones();
    registrarServiceWorker();
    
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR listo');
        if (scanButton) {
            scanButton.disabled = false;
        }
    }
    
    // Precargar la cámara en segundo plano
    precargarCamara();
});

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
}

function guardarEmpleados() {
    localStorage.setItem('registeredEmployees', JSON.stringify(registeredEmployees));
}

function guardarHistorial() {
    localStorage.setItem('attendanceHistory', JSON.stringify(attendanceHistory));
}

function precargarCamara() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !cameraPermissionGranted) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        })
        .then(stream => {
            cameraPermissionGranted = true;
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Permiso de cámara pre-obtenido');
        })
        .catch(err => {
            console.log('No se pudo pre-obtener permiso de cámara:', err);
        });
    }
}

function configurarBotones() {
    if (scanButton) {
        scanButton.addEventListener('click', mostrarPantallaAccion);
    }
    
    if (loginButton) {
        loginButton.addEventListener('click', mostrarLoginMenu);
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
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', resetearEscaneo);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', detenerEscaneo);
    }
    
    // Botones del menú de inicio de sesión
    if (registerEmployeeBtn) {
        registerEmployeeBtn.addEventListener('click', () => iniciarEscaneoParaRegistro());
    }
    
    if (viewEmployeesBtn) {
        viewEmployeesBtn.addEventListener('click', mostrarListaEmpleados);
    }
    
    if (backFromLoginMenuBtn) {
        backFromLoginMenuBtn.addEventListener('click', volverInicio);
    }
    
    if (backFromEmployeesListBtn) {
        backFromEmployeesListBtn.addEventListener('click', mostrarLoginMenu);
    }
}

function mostrarLoginMenu() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    loginMenuScreen.style.display = 'flex';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    employeesListScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    container.style.paddingTop = '0';
}

function mostrarListaEmpleados() {
    loginMenuScreen.style.display = 'none';
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
            <div class="employee-institucion">${empleado.institucion}</div>
        `;
        
        employeesListContainer.appendChild(item);
    });
}

function mostrarPantallaAccion() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'flex';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    loginMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    container.style.paddingTop = '0';
}

function mostrarHistorial() {
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'flex';
    resultContainer.style.display = 'none';
    loginMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    container.style.paddingTop = '0';
    actualizarListaHistorial();
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

function volverInicio() {
    hospitalTitle.style.display = 'block';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    buttonsContainer.style.display = 'flex';
    loginMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    container.style.justifyContent = 'center';
    container.style.paddingTop = '0';
    
    const overlay = document.querySelector('.scanning-overlay');
    const instructions = document.querySelector('.scanning-instructions');
    if (overlay) overlay.remove();
    if (instructions) instructions.remove();
    body.classList.remove('scanning-active');
    
    currentAction = null;
}

function iniciarEscaneoParaRegistro() {
    currentAction = 'registro';
    hospitalTitle.style.display = 'none';
    loginMenuScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    iniciarEscaneo();
}

function iniciarEscaneoConAccion(accion) {
    currentAction = accion;
    hospitalTitle.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    resultContainer.style.display = 'none';
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
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
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
        'Escanea el código QR del empleado para registrarlo' : 
        'Coloca el código QR dentro del recuadro';
    
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
        container.style.paddingTop = '0';
        
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
            video.onloadedmetadata = () => {
                resolve();
            };
        });
        
        await video.play();
        console.log('✅ Video reproduciendo');
        
        scanningActive = true;
        realizarEscaneo();
        
        if (scanTimeout) {
            clearTimeout(scanTimeout);
        }
        scanTimeout = setTimeout(function loop() {
            if (!scanningActive) return;
            realizarEscaneo();
            scanTimeout = setTimeout(loop, SCAN_INTERVAL);
        }, SCAN_INTERVAL);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarAlertaError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
        detenerEscaneo();
    }
}

function realizarEscaneo() {
    if (!scanningActive || !video || video.readyState < 2) {
        return;
    }
    
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
            procesarResultado(code.data);
        }
        
    } catch (error) {
        console.error('Error en escaneo:', error);
    }
}

function procesarResultado(data) {
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
    
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }
    
    videoContainer.style.display = 'none';
    
    // Parsear datos del QR
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
        console.log('No es JSON válido');
        mostrarAlertaError('QR inválido: El código escaneado no tiene el formato correcto.');
        volverInicio();
        return;
    }
    
    // Manejar según el tipo de acción
    if (currentAction === 'registro') {
        procesarRegistroEmpleado(qrData, nombre, cedula, institucion, tipo);
    } else if (currentAction === 'entrada' || currentAction === 'salida') {
        procesarAsistencia(qrData, nombre, cedula, institucion, tipo);
    }
}

function procesarRegistroEmpleado(qrData, nombre, cedula, institucion, tipo) {
    // Validar que el QR sea del tipo correcto para registro de asistencia
    if (tipo !== 'registro_asistencia') {
        mostrarAlertaError('QR inválido: Este código no es válido para registro de empleados. Tipo esperado: "registro_asistencia"');
        volverInicio();
        return;
    }
    
    // Validar datos requeridos
    if (cedula === 'No disponible' || nombre === 'No disponible') {
        mostrarAlertaError('QR inválido: El código escaneado no contiene los datos requeridos (empleado_id y nombre).');
        volverInicio();
        return;
    }
    
    // Verificar si el empleado ya está registrado
    const empleadoExistente = registeredEmployees.find(emp => emp.cedula === cedula);
    
    if (empleadoExistente) {
        mostrarAlertaError(`⚠️ Empleado YA REGISTRADO\n\nNombre: ${empleadoExistente.nombre}\nCédula: ${cedula}\n\nNo se puede registrar nuevamente.`);
        volverInicio();
        return;
    }
    
    // Registrar nuevo empleado
    const nuevoEmpleado = {
        cedula: cedula,
        nombre: nombre,
        institucion: institucion,
        fechaRegistro: new Date().toISOString()
    };
    
    registeredEmployees.push(nuevoEmpleado);
    guardarEmpleados();
    
    // Mostrar alerta de éxito
    mostrarAlertaExito(`✅ EMPLEADO REGISTRADO EXITOSAMENTE\n\nNombre: ${nombre}\nCédula: ${cedula}\nInstitución: ${institucion}\n\nEl empleado ya puede registrar su asistencia.`);
    volverInicio();
}

function procesarAsistencia(qrData, nombre, cedula, institucion, tipo) {
    // Validar que el QR sea del tipo correcto
    if (tipo !== 'registro_asistencia') {
        mostrarAlertaError('QR inválido: Este código no es válido para registro de asistencia. Tipo esperado: "registro_asistencia"');
        volverInicio();
        return;
    }
    
    // Validar datos requeridos
    if (cedula === 'No disponible') {
        mostrarAlertaError('QR inválido: El código escaneado no contiene un empleado_id válido.');
        volverInicio();
        return;
    }
    
    // Buscar empleado en la base de datos local
    const empleadoRegistrado = registeredEmployees.find(emp => emp.cedula === cedula);
    
    if (!empleadoRegistrado) {
        mostrarAlertaError(`❌ EMPLEADO NO REGISTRADO\n\nCédula: ${cedula}\n\nEste empleado no está registrado en el sistema. Por favor, contacte al administrador para registrar al empleado primero.`);
        volverInicio();
        return;
    }
    
    // Usar el nombre del empleado registrado (más confiable)
    const nombreFinal = empleadoRegistrado.nombre;
    const institucionFinal = empleadoRegistrado.institucion || institucion;
    
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const horaFormateada = ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Guardar en historial
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
    
    // Ocultar todas las otras pantallas
    hospitalTitle.style.display = 'none';
    buttonsContainer.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    loginMenuScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    
    container.style.justifyContent = 'center';
    container.style.paddingTop = '0';
    
    resultContainer.style.display = 'block';
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
                    <span class="field-label">INSTITUCIÓN:</span>
                    <span class="field-value">${institucionFinal}</span>
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

function mostrarAlertaError(mensaje) {
    // Crear alerta personalizada
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
    
    const btn = alerta.querySelector('.alert-btn');
    btn.addEventListener('click', () => {
        alerta.remove();
    });
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        if (alerta.parentNode) alerta.remove();
    }, 5000);
}

function mostrarAlertaExito(mensaje) {
    const alerta = document.createElement('div');
    alerta.className = 'custom-alert success-alert';
    alerta.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">✅</div>
            <div class="alert-message">${mensaje.replace(/\n/g, '<br>')}</div>
            <button class="alert-btn success-btn">Aceptar</button>
        </div>
    `;
    document.body.appendChild(alerta);
    
    const btn = alerta.querySelector('.alert-btn');
    btn.addEventListener('click', () => {
        alerta.remove();
    });
    
    setTimeout(() => {
        if (alerta.parentNode) alerta.remove();
    }, 4000);
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
    
    if (video) {
        video.srcObject = null;
    }
    
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