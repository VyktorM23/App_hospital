// app.js - Control de asistencia con Super Usuario y gestión de usuarios
let deferredPrompt;
let videoStream = null;
let scanningActive = false;
let scanTimeout = null;
const SCAN_INTERVAL = 200;

// Estado de la aplicación
let currentAction = null;
let attendanceHistory = [];
let registeredEmployees = [];
let isLoggedIn = false;
let currentUser = null;
let currentUserRole = null;

let currentCedulaEmployee = null;
let currentCedula = '';

let vibrationEnabled = true;  // Activado por defecto
const VIBRATION_DURATION = 200;  // 200 milisegundos

// ========== ESTRUCTURA DE USUARIOS - SOLO SUPER USUARIO ==========
let systemUsers = [
    {
        id: "user_super_001",
        username: "superadmin",
        password: "1234",
        role: "super_admin",
        name: "Super Administrador",
        securityQuestion: "¿Cuál es el nombre de la mascota de la abuela?",
        securityAnswer: "firulais",
        createdAt: new Date().toISOString()
    }
];

// Variables para recuperación
let recoveryStep = 1;
let currentRecoveryUser = null;

// Elementos del DOM
const mainScreen = document.getElementById('main-screen');
const loginScreen = document.getElementById('login-screen');
const adminMenuScreen = document.getElementById('admin-menu-screen');
const actionSelectionScreen = document.getElementById('action-selection-screen');
const employeesListScreen = document.getElementById('employees-list-screen');
const historyScreen = document.getElementById('history-screen');
const configScreen = document.getElementById('config-screen');
const userManagementScreen = document.getElementById('user-management-screen');
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
const forgotPasswordBtn = document.getElementById('forgot-password-btn');

// Botones admin
const registerEmployeeBtn = document.getElementById('register-employee-btn');
const viewEmployeesBtn = document.getElementById('view-employees-btn');
const manageUsersBtn = document.getElementById('manage-users-btn');
const logoutFromAdminBtn = document.getElementById('logout-from-admin-btn');

// Botones gestión de usuarios
const backFromUsersBtn = document.getElementById('back-from-users-btn');
const createUserBtn = document.getElementById('create-user-btn');
const usersTableBody = document.getElementById('users-table-body');

// Modal crear/editar usuario
const userModal = document.getElementById('user-modal');
const modalTitle = document.getElementById('modal-title');
const userForm = document.getElementById('user-form');
const userIdField = document.getElementById('user-id');
const userUsername = document.getElementById('user-username');
const userPassword = document.getElementById('user-password');
const userRole = document.getElementById('user-role');
const userName = document.getElementById('user-name');
const userSecurityQuestion = document.getElementById('user-security-question');
const userSecurityAnswer = document.getElementById('user-security-answer');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// Modal recuperación
const recoveryModal = document.getElementById('recovery-modal');
const recoveryUsername = document.getElementById('recovery-username');
const recoveryMessage = document.getElementById('recovery-message');
const recoveryAnswer = document.getElementById('recovery-answer');
const sendRecoveryBtn = document.getElementById('send-recovery-btn');
const cancelRecoveryBtn = document.getElementById('cancel-recovery-btn');
const closeRecoveryModalBtn = document.getElementById('close-recovery-modal-btn');

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

//cedula
const cedulaScreen = document.getElementById('cedula-screen');
const cedulaActionScreen = document.getElementById('cedula-action-screen');
const cedulaInput = document.getElementById('cedula-input');
const cedulaVerifyBtn = document.getElementById('cedula-verify-btn');
const cedulaCancelBtn = document.getElementById('cedula-cancel-btn');
const cedulaEntryBtn = document.getElementById('cedula-entry-btn');
const cedulaExitBtn = document.getElementById('cedula-exit-btn');
const cedulaBackBtn = document.getElementById('cedula-back-btn');
const cedulaEmployeeInfo = document.getElementById('cedula-employee-info');

const body = document.body;
let cameraPermissionGranted = false;

// ========== SPLASH SCREEN ==========
function ocultarSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.style.display = 'none';
        }, 2600);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App iniciada con Super Usuario');
    cargarTodosLosDatos();
    configurarBotones();
    registrarServiceWorker();
    actualizarMenuSegunRol();
    cargarConfiguracion();
    
    if (typeof jsQR !== 'undefined') {
        console.log('✅ jsQR listo');
    }
    
    precargarCamara();
});

// Ocultar splash cuando la página esté completamente cargada
window.addEventListener('load', () => {
    ocultarSplash();
});

// También ocultar si el DOM está listo antes
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash && splash.style.display !== 'none') {
        splash.style.display = 'none';
    }
}, 3500);

function vibrar() {
    if (vibrationEnabled && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(VIBRATION_DURATION);
        console.log('📳 Vibración ejecutada');
    }
}

function vibrarDoble() {
    if (vibrationEnabled && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([VIBRATION_DURATION, 100, VIBRATION_DURATION]);
        console.log('📳 Vibración doble ejecutada');
    }
}

function vibrarError() {
    if (vibrationEnabled && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([500, 200, 500]);
    }
}

function normalizarCedula(cedula) {
    if (!cedula) return '';
    return cedula.toString().replace(/[^0-9]/g, '');
}

function cargarTodosLosDatos() {
    // Cargar historial
    const historialGuardado = localStorage.getItem('attendanceHistory');
    if (historialGuardado) {
        try {
            attendanceHistory = JSON.parse(historialGuardado);
        } catch (e) {
            attendanceHistory = [];
        }
    }
    
    // Cargar empleados
    const empleadosGuardados = localStorage.getItem('registeredEmployees');
    if (empleadosGuardados) {
        try {
            registeredEmployees = JSON.parse(empleadosGuardados);
        } catch (e) {
            registeredEmployees = [];
        }
    }
    
    // Cargar usuarios del sistema
    const usuariosGuardados = localStorage.getItem('systemUsers');
    if (usuariosGuardados) {
        try {
            const parsedUsers = JSON.parse(usuariosGuardados);
            const hasSuperAdmin = parsedUsers.some(u => u.username === 'superadmin');
            if (hasSuperAdmin && parsedUsers.length > 0) {
                systemUsers = parsedUsers;
            } else {
                saveUsers();
            }
        } catch (e) {
            saveUsers();
        }
    } else {
        saveUsers();
    }
}

function saveUsers() {
    localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
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
    userManagementScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
    isLoggedIn = false;
    currentUser = null;
    currentUserRole = null;
}

function mostrarLogin() {
    loginScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    configScreen.style.display = 'none';
    userManagementScreen.style.display = 'none';
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
    userManagementScreen.style.display = 'none';
    resultContainer.style.display = 'none';
}

function mostrarGestionUsuarios() {
    userManagementScreen.style.display = 'flex';
    actualizarTablaUsuarios();
}

function actualizarTablaUsuarios() {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = '';
    
    if (systemUsers.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="5" class="no-data">No hay usuarios registrados</td><tr>';
        return;
    }
    
    const superAdmin = systemUsers.find(u => u.role === 'super_admin');
    const admins = systemUsers.filter(u => u.role === 'admin');
    
    if (superAdmin) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${superAdmin.username}</strong></td>
            <td>${superAdmin.name || 'Sin nombre'}</td>
            <td class="role-superadmin">SUPER ADMIN</td>
            <td>${new Date(superAdmin.createdAt).toLocaleDateString()}</td>
            <td><span style="opacity:0.5;">Protegido</span></td>
        `;
        usersTableBody.appendChild(row);
    }
    
    admins.forEach(usuario => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${usuario.username}</td>
            <td>${usuario.name || 'Sin nombre'}</td>
            <td class="role-admin">ADMINISTRADOR</td>
            <td>${new Date(usuario.createdAt).toLocaleDateString()}</td>
            <td class="user-actions">
                <button class="btn-icon btn-edit-user" data-id="${usuario.id}">Editar</button>
                <button class="btn-icon btn-delete-user" data-id="${usuario.id}">Eliminar</button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });
    
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => editarUsuario(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => eliminarUsuario(btn.dataset.id));
    });
}

function mostrarModalCrearUsuario() {
    modalTitle.textContent = '➕ CREAR NUEVO ADMINISTRADOR';
    userIdField.value = '';
    userForm.reset();
    userUsername.value = '';
    userPassword.value = '';
    userName.value = '';
    if (userSecurityQuestion) {
        userSecurityQuestion.value = document.querySelector('#user-security-question option:first-child')?.value || '';
    }
    if (userSecurityAnswer) userSecurityAnswer.value = '';
    userModal.style.display = 'flex';
}

function editarUsuario(userId) {
    const usuario = systemUsers.find(u => u.id === userId);
    if (!usuario || usuario.username === 'superadmin') {
        mostrarAlertaError('No se puede editar el Super Usuario');
        return;
    }
    
    modalTitle.textContent = 'EDITAR ADMINISTRADOR';
    userIdField.value = usuario.id;
    userUsername.value = usuario.username;
    userPassword.value = '';
    userRole.value = usuario.role;
    userName.value = usuario.name || '';
    if (userSecurityQuestion) userSecurityQuestion.value = usuario.securityQuestion || '';
    if (userSecurityAnswer) userSecurityAnswer.value = '';
    
    userModal.style.display = 'flex';
}

function eliminarUsuario(userId) {
    const usuario = systemUsers.find(u => u.id === userId);
    if (!usuario || usuario.username === 'superadmin') {
        mostrarAlertaError('No se puede eliminar el Super Usuario');
        return;
    }
    
    if (confirm(`¿Eliminar al administrador "${usuario.username}"?`)) {
        systemUsers = systemUsers.filter(u => u.id !== userId);
        saveUsers();
        actualizarTablaUsuarios();
        mostrarAlertaExito(`✅ Administrador "${usuario.username}" eliminado`);
    }
}

function crearUsuario(event) {
    event.preventDefault();
    
    const username = userUsername.value.trim();
    const password = userPassword.value;
    const role = userRole?.value || 'admin';
    const name = userName.value.trim();
    const securityQuestion = userSecurityQuestion?.value || '';
    const securityAnswer = userSecurityAnswer?.value.trim().toLowerCase() || '';
    const userId = userIdField.value;
    
    if (!username || !password) {
        mostrarAlertaError('Complete todos los campos requeridos (*)');
        return;
    }
    
    if (!userId && (!securityQuestion || !securityAnswer)) {
        mostrarAlertaError('La pregunta y respuesta de seguridad son obligatorias');
        return;
    }
    
    const existingUser = systemUsers.find(u => u.username === username && u.id !== userId);
    if (existingUser) {
        mostrarAlertaError('El nombre de usuario ya existe');
        return;
    }
    
    if (userId) {
        const userIndex = systemUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            systemUsers[userIndex].username = username;
            if (password) systemUsers[userIndex].password = password;
            systemUsers[userIndex].role = role;
            systemUsers[userIndex].name = name;
            if (securityQuestion && securityAnswer) {
                systemUsers[userIndex].securityQuestion = securityQuestion;
                systemUsers[userIndex].securityAnswer = securityAnswer;
            }
            saveUsers();
            mostrarAlertaExito(`Administrador "${username}" actualizado`);
        }
    } else {
        const newUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            username: username,
            password: password,
            role: 'admin',
            name: name,
            securityQuestion: securityQuestion,
            securityAnswer: securityAnswer.toLowerCase(),
            createdAt: new Date().toISOString()
        };
        systemUsers.push(newUser);
        saveUsers();
        mostrarAlertaExito(`Administrador "${username}" creado exitosamente`);
    }
    
    cerrarModalUsuario();
    actualizarTablaUsuarios();
}

function cerrarModalUsuario() {
    userModal.style.display = 'none';
    userForm.reset();
    userIdField.value = '';
}

function mostrarRecuperacion() {
    recoveryStep = 1;
    currentRecoveryUser = null;
    recoveryModal.style.display = 'flex';
    if (recoveryUsername) recoveryUsername.value = '';
    if (recoveryAnswer) recoveryAnswer.value = '';
    if (recoveryMessage) recoveryMessage.innerHTML = '';
    
    const step1 = document.getElementById('recovery-step1');
    const step2 = document.getElementById('recovery-step2');
    const step3 = document.getElementById('recovery-step3');
    
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
}

function verificarUsuario() {
    const username = recoveryUsername.value.trim();
    
    if (!username) {
        if (recoveryMessage) recoveryMessage.innerHTML = '<span style="color: #ef4444;">❌ Ingrese un nombre de usuario</span>';
        return;
    }
    
    const user = systemUsers.find(u => u.username === username);
    
    if (!user) {
        if (recoveryMessage) recoveryMessage.innerHTML = '<span style="color: #ef4444;">❌ Usuario no encontrado</span>';
        return;
    }
    
    currentRecoveryUser = user;
    recoveryStep = 2;
    
    if (recoveryMessage) recoveryMessage.innerHTML = '';
    
    const step1 = document.getElementById('recovery-step1');
    const step2 = document.getElementById('recovery-step2');
    const questionText = document.getElementById('recovery-question-text');
    
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    if (questionText) questionText.textContent = user.securityQuestion || '¿Cuál es tu color favorito?';
    if (recoveryAnswer) recoveryAnswer.value = '';
}

function verificarRespuesta() {
    const answer = recoveryAnswer?.value.trim().toLowerCase() || '';
    
    if (!answer) {
        mostrarAlertaError('Por favor responda la pregunta de seguridad');
        return;
    }
    
    if (answer === currentRecoveryUser.securityAnswer) {
        recoveryStep = 3;
        
        const step2 = document.getElementById('recovery-step2');
        const step3 = document.getElementById('recovery-step3');
        
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'block';
        
        const recoveredPasswordDiv = document.getElementById('recovered-password');
        const userRole = currentRecoveryUser.role === 'super_admin' ? 'SUPER USUARIO' : 'ADMINISTRADOR';
        
        if (recoveredPasswordDiv) {
            recoveredPasswordDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(14, 165, 233, 0.2)); 
                            padding: 20px; 
                            border-radius: 16px; 
                            margin: 16px 0;
                            border: 1px solid rgba(16, 185, 129, 0.3);">
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">ROL</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #fbbf24;">${userRole}</div>
                    
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">NOMBRE DE USUARIO</div>
                    <div style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">${currentRecoveryUser.username}</div>
                    
                    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">CONTRASEÑA</div>
                    <div style="font-size: 24px; font-weight: 900; color: #10b981; letter-spacing: 2px; word-break: break-all;">${currentRecoveryUser.password}</div>
                    
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #f59e0b;">
                        ⚠️ Recomendamos cambiar esta contraseña después de iniciar sesión
                    </div>
                </div>
            `;
        }
    } else {
        mostrarAlertaError('Respuesta incorrecta. No se puede recuperar la contraseña.');
        cerrarRecuperacion();
    }
}

function cerrarRecuperacion() {
    if (recoveryModal) recoveryModal.style.display = 'none';
    recoveryStep = 1;
    currentRecoveryUser = null;
    if (recoveryUsername) recoveryUsername.value = '';
    if (recoveryAnswer) recoveryAnswer.value = '';
    if (recoveryMessage) recoveryMessage.innerHTML = '';
}

function actualizarMenuSegunRol() {
    if (manageUsersBtn) {
        manageUsersBtn.style.display = currentUserRole === 'super_admin' ? 'flex' : 'none';
    }
    
    if (currentUserRole === 'super_admin') {
        const configButtons = document.querySelector('.config-buttons');
        if (configButtons && !document.getElementById('backup-data-btn')) {
            const backupBtn = document.createElement('button');
            backupBtn.id = 'backup-data-btn';
            backupBtn.className = 'btn config-btn backup-btn';
            backupBtn.textContent = 'RESPALDAR DATOS';
            backupBtn.onclick = respaldarDatos;
            configButtons.appendChild(backupBtn);
        }
    }
}

function respaldarDatos() {
    const backup = {
        fecha: new Date().toISOString(),
        usuarios: systemUsers.map(u => ({ ...u, password: '[PROTEGIDA]' })),
        empleados: registeredEmployees,
        historial: attendanceHistory,
        totalEmpleados: registeredEmployees.length,
        totalRegistros: attendanceHistory.length
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `backup_asistencia_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    mostrarAlertaExito('Respaldo generado exitosamente');
}

function mostrarConfiguracion() {
    configScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    adminMenuScreen.style.display = 'none';
    actionSelectionScreen.style.display = 'none';
    employeesListScreen.style.display = 'none';
    historyScreen.style.display = 'none';
    userManagementScreen.style.display = 'none';
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
    userManagementScreen.style.display = 'none';
    resultContainer.style.display = 'none';
    videoContainer.style.display = 'none';
}

function configurarBotones() {
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
    
    doLoginBtn.addEventListener('click', hacerLogin);
    cancelLoginBtn.addEventListener('click', mostrarPantallaPrincipal);
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', mostrarRecuperacion);
    }
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') hacerLogin(); });
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') hacerLogin(); });
    
    registerEmployeeBtn.addEventListener('click', () => {
        currentAction = 'registro';
        ocultarTodasPantallas();
        iniciarEscaneo();
    });
    viewEmployeesBtn.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarListaEmpleados();
    });
    if (manageUsersBtn) {
        manageUsersBtn.addEventListener('click', () => {
            ocultarTodasPantallas();
            mostrarGestionUsuarios();
        });
    }
    logoutFromAdminBtn.addEventListener('click', () => {
        isLoggedIn = false;
        currentUser = null;
        currentUserRole = null;
        mostrarPantallaPrincipal();
    });
    
    clearDataBtn.addEventListener('click', () => {
        if (currentUserRole === 'super_admin') {
            limpiarDatos();
        } else {
            mostrarAlertaError('Solo el Super Usuario puede limpiar todos los datos');
        }
    });
    aboutBtn.addEventListener('click', mostrarAcercaDe);
    backFromConfigBtn.addEventListener('click', mostrarPantallaPrincipal);
    
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
    
    backFromEmployeesListBtn.addEventListener('click', () => {
        ocultarTodasPantallas();
        mostrarAdminMenu();
    });
    
    backFromHistoryBtn.addEventListener('click', mostrarPantallaPrincipal);
    
    if (backFromUsersBtn) {
        backFromUsersBtn.addEventListener('click', () => {
            ocultarTodasPantallas();
            mostrarAdminMenu();
        });
    }
    if (createUserBtn) {
        createUserBtn.addEventListener('click', mostrarModalCrearUsuario);
    }
    
    if (userForm) {
        userForm.addEventListener('submit', crearUsuario);
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', cerrarModalUsuario);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', cerrarModalUsuario);
    }
    
    if (document.getElementById('verify-user-btn')) {
        document.getElementById('verify-user-btn').addEventListener('click', verificarUsuario);
    }
    if (document.getElementById('verify-answer-btn')) {
        document.getElementById('verify-answer-btn').addEventListener('click', verificarRespuesta);
    }
    if (document.getElementById('back-to-step1-btn')) {
        document.getElementById('back-to-step1-btn').addEventListener('click', () => {
            const step1 = document.getElementById('recovery-step1');
            const step2 = document.getElementById('recovery-step2');
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';
            if (recoveryMessage) recoveryMessage.innerHTML = '';
            if (recoveryAnswer) recoveryAnswer.value = '';
        });
    }
    if (document.getElementById('close-recovery-final-btn')) {
        document.getElementById('close-recovery-final-btn').addEventListener('click', cerrarRecuperacion);
    }
    
    if (sendRecoveryBtn) {
        sendRecoveryBtn.addEventListener('click', verificarUsuario);
    }
    if (cancelRecoveryBtn) {
        cancelRecoveryBtn.addEventListener('click', cerrarRecuperacion);
    }
    if (closeRecoveryModalBtn) {
        closeRecoveryModalBtn.addEventListener('click', cerrarRecuperacion);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', () => {
            detenerEscaneo();
        });
    }

    // ========== BOTÓN MARCAR POR CÉDULA ==========
    const centerButtons = document.querySelector('.center-buttons');
    if (centerButtons && !document.getElementById('cedulaMainBtn')) {
        const cedulaMainBtn = document.createElement('button');
        cedulaMainBtn.id = 'cedulaMainBtn';
        cedulaMainBtn.className = 'btn btn-scan-main';
        cedulaMainBtn.textContent = 'MARCAR POR CÉDULA';
        cedulaMainBtn.onclick = () => mostrarCedulaScreen();
        centerButtons.appendChild(cedulaMainBtn);
    }

    // Eventos del input de cédula (teclado nativo)
    if (cedulaInput) {
        // Validar que solo se ingresen números
        cedulaInput.addEventListener('input', (e) => {
            let value = e.target.value;
            // Filtrar solo números
            value = value.replace(/[^0-9]/g, '');
            // Limitar a 15 dígitos
            if (value.length > 15) {
                value = value.slice(0, 15);
            }
            cedulaInput.value = value;
            currentCedula = value;
        });
        
        // Prevenir caracteres no numéricos en tiempo real
        cedulaInput.addEventListener('keypress', (e) => {
            const charCode = e.which ? e.which : e.keyCode;
            // Permitir solo números (códigos 48-57) y teclas de control
            if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                e.preventDefault();
            }
        });
    }

    // Botones de la pantalla cédula
    if (cedulaVerifyBtn) cedulaVerifyBtn.addEventListener('click', verificarCedula);
    if (cedulaCancelBtn) cedulaCancelBtn.addEventListener('click', cerrarCedulaScreen);
    if (cedulaBackBtn) cedulaBackBtn.addEventListener('click', () => {
        cedulaActionScreen.style.display = 'none';
        mostrarCedulaScreen();
    });
    if (cedulaEntryBtn) cedulaEntryBtn.addEventListener('click', () => marcarAsistenciaPorCedula('entrada'));
    if (cedulaExitBtn) cedulaExitBtn.addEventListener('click', () => marcarAsistenciaPorCedula('salida'));
}

function limpiarDatos() {
    if (confirm('¿ELIMINAR TODOS LOS DATOS?\n\nSe borrarán:\n• Todos los empleados registrados\n• Todo el historial de asistencias\n• ¡Los usuarios NO se eliminarán!\n\nEsta acción no se puede deshacer.')) {
        registeredEmployees = [];
        attendanceHistory = [];
        guardarEmpleados();
        guardarHistorial();
        mostrarAlertaExito('Datos de empleados y asistencias eliminados correctamente\n(Los usuarios permanecen intactos)');
        mostrarPantallaPrincipal();
    }
}

function mostrarAcercaDe() {
    mostrarAlertaInfo('HOSPITAL ERNESTO SEGUNDO PAOLINI\n\nSistema de Control de Asistencia\nVersión 2.0\nDesarrollado para RR.HH.\n\nDesarrollado por:\n• T.S.U. Victor Medina\n• T.S.U. Carlos Roa\n• T.S.U. Eduardo Castellano\n• T.S.U. Leonel Marquez');
}

function hacerLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    const user = systemUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        isLoggedIn = true;
        currentUser = user;
        currentUserRole = user.role;
        loginError.style.display = 'none';
        actualizarMenuSegunRol();
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
}

function precargarCamara() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !cameraPermissionGranted) {
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        })
        .then(stream => {
            cameraPermissionGranted = true;
            stream.getTracks().forEach(track => track.stop());
            console.log('Permiso de cámara pre-obtenido');
        })
        .catch(err => console.log('No se pudo pre-obtener permiso:', err));
    }
}

function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registrado'))
                .catch(err => console.log('Error SW:', err));
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
        console.log('Video reproduciendo');
        
        scanningActive = true;
        realizarEscaneo();
        
        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(function loop() {
            if (!scanningActive) return;
            realizarEscaneo();
            scanTimeout = setTimeout(loop, SCAN_INTERVAL);
        }, SCAN_INTERVAL);
        
    } catch (error) {
        console.error('Error:', error);
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
            console.log('QR detectado:', code.data);
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
    
    vibrar();
    
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
        mostrarAlertaError(`EMPLEADO YA REGISTRADO\n\nNombre: ${empleadoExistente.nombre}\nCédula: ${cedula}`);
        mostrarAdminMenu();
        return;
    }
    
    const nuevoEmpleado = {
        cedula: cedula,
        cedulaNormalizada: normalizarCedula(cedula),
        nombre: nombre,
        institucion: institucion,
        fechaRegistro: new Date().toISOString()
    };

    registeredEmployees.push(nuevoEmpleado);
    guardarEmpleados();

    vibrar();
    
    mostrarAlertaExito(`EMPLEADO REGISTRADO\n\nNombre: ${nombre}\nCédula: ${cedula}\nInstitución: ${institucion}`);
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
    
    const empleadoRegistrado = registeredEmployees.find(emp => 
        emp.cedula === cedula || 
        emp.cedulaNormalizada === normalizarCedula(cedula)
    );
    
    if (!empleadoRegistrado) {
        mostrarAlertaError(`EMPLEADO NO REGISTRADO\n\nCédula: ${cedula}\n\nDebe registrarse primero en el menú ADMINISTRADOR.`);
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
    console.log('Deteniendo escaneo...');
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
    
    if (currentAction === 'registro') {
        mostrarAdminMenu();
    } else {
        mostrarPantallaPrincipal();
    }
}

// ========== FUNCIONES PARA VALIDAR ASISTENCIA ==========
function puedeMarcarAsistencia(cedula, accionDeseada) {
    // Obtener el último registro del empleado
    const registrosEmpleado = attendanceHistory.filter(r => r.cedula === cedula);
    
    if (registrosEmpleado.length === 0) {
        // Si no tiene registros, puede marcar entrada
        if (accionDeseada === 'entrada') return { allowed: true };
        if (accionDeseada === 'salida') return { allowed: false, message: 'No tiene registros previos. Debe marcar ENTRADA primero.' };
    }
    
    const ultimoRegistro = registrosEmpleado[registrosEmpleado.length - 1];
    const ultimaAccion = ultimoRegistro.accion;
    
    if (accionDeseada === 'entrada') {
        if (ultimaAccion === 'entrada') {
            return { 
                allowed: false, 
                message: `Ya marcó ENTRADA a las ${new Date(ultimoRegistro.timestamp).toLocaleTimeString('es-ES')}\nDebe marcar SALIDA antes de una nueva ENTRADA.`
            };
        }
        return { allowed: true };
    }
    
    if (accionDeseada === 'salida') {
        if (ultimaAccion === 'salida') {
            return { 
                allowed: false, 
                message: `Ya marcó SALIDA a las ${new Date(ultimoRegistro.timestamp).toLocaleTimeString('es-ES')}\nLa próxima acción debe ser ENTRADA.`
            };
        }
        return { allowed: true };
    }
    
    return { allowed: true };
}

// ========== FUNCIONES PARA MARCAR POR CÉDULA ==========
function mostrarCedulaScreen() {
    ocultarTodasPantallas();
    currentCedula = '';
    currentCedulaEmployee = null;
    if (cedulaInput) cedulaInput.value = '';
    cedulaScreen.style.display = 'flex';
    // Enfocar automáticamente el input para abrir el teclado
    setTimeout(() => {
        if (cedulaInput) cedulaInput.focus();
    }, 100);
}

function cerrarCedulaScreen() {
    cedulaScreen.style.display = 'none';
    cedulaActionScreen.style.display = 'none';
    currentCedula = '';
    currentCedulaEmployee = null;
    if (cedulaInput) cedulaInput.value = '';
    mostrarPantallaPrincipal();
}

function verificarCedula() {
    // Obtener el valor actual del input
    currentCedula = cedulaInput ? cedulaInput.value : '';
    
    if (!currentCedula || currentCedula.trim() === '') {
        mostrarAlertaError('Ingrese una cédula válida');
        return;
    }

    const empleado = registeredEmployees.find(emp => 
        emp.cedula === currentCedula || 
        emp.cedulaNormalizada === normalizarCedula(currentCedula)
    );
    
    if (!empleado) {
        mostrarAlertaError(`EMPLEADO NO REGISTRADO\n\nCédula: ${currentCedula}\n\nDebe registrarse primero en el menú ADMINISTRADOR.`);
        return;
    }
    
    currentCedulaEmployee = empleado;

    vibrar();
    
    // Obtener último registro del empleado
    const registrosEmpleado = attendanceHistory.filter(r => r.cedula === currentCedula);
    const ultimoRegistro = registrosEmpleado.length > 0 ? registrosEmpleado[registrosEmpleado.length - 1] : null;
    
    let ultimaAccionHTML = '';
    if (ultimoRegistro) {
        const fechaUltimo = new Date(ultimoRegistro.timestamp);
        const accionClass = ultimoRegistro.accion === 'entrada' ? 'last-action-entrada' : 'last-action-salida';
        const accionTexto = ultimoRegistro.accion === 'entrada' ? 'ENTRADA' : 'SALIDA';
        ultimaAccionHTML = `
            <div class="last-action">
                Último registro: <strong class="${accionClass}">${accionTexto}</strong><br>
                ${fechaUltimo.toLocaleDateString('es-ES')} - ${fechaUltimo.toLocaleTimeString('es-ES')}
            </div>
        `;
    } else {
        ultimaAccionHTML = `<div class="last-action last-action-none">Sin registros previos</div>`;
    }
    
    if (cedulaEmployeeInfo) {
        cedulaEmployeeInfo.innerHTML = `
            <div class="employee-name">${empleado.nombre}</div>
            <div class="employee-id">Cédula: ${empleado.cedula}</div>
            <div class="employee-institution">${empleado.institucion || 'Hospital Ernesto Segundo Paolini'}</div>
            ${ultimaAccionHTML}
        `;
    }
    
    cedulaScreen.style.display = 'none';
    cedulaActionScreen.style.display = 'flex';
}

async function marcarAsistenciaPorCedula(accion) {
    if (!currentCedulaEmployee) {
        mostrarAlertaError('Error: No hay empleado seleccionado');
        cerrarCedulaScreen();
        return;
    }
    
    // Validar si puede marcar esta acción
    const validacion = puedeMarcarAsistencia(currentCedulaEmployee.cedula, accion);
    
    if (!validacion.allowed) {
        mostrarAlertaError(validacion.message);
        // Regresar a la pantalla de acción para que pueda elegir la correcta
        cedulaActionScreen.style.display = 'flex';
        return;
    }
    
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-ES');
    const horaFormateada = ahora.toLocaleTimeString('es-ES');
    
    const registro = {
        nombre: currentCedulaEmployee.nombre,
        cedula: currentCedulaEmployee.cedula,
        accion: accion,
        timestamp: ahora.toISOString(),
        metodo: 'cedula' // Para saber que fue marcado por cédula
    };
    
    attendanceHistory.push(registro);
    guardarHistorial();

    vibrar();
    
    const accionTexto = accion === 'entrada' ? 'ENTRADA' : 'SALIDA';
    const colorAccion = accion === 'entrada' ? '#4CAF50' : '#f44336';
    
    resultContainer.style.display = 'flex';
    scanResult.innerHTML = `
        <div class="result-card">
            <div class="result-header" style="background: ${colorAccion};">
                <span class="result-action-text">${accionTexto}</span>
            </div>
            <div class="result-body">
                <div class="result-field">
                    <span class="field-label">NOMBRES:</span>
                    <span class="field-value">${currentCedulaEmployee.nombre}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">CEDULA:</span>
                    <span class="field-value">${currentCedulaEmployee.cedula}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">FECHA:</span>
                    <span class="field-value">${fechaFormateada}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">HORA:</span>
                    <span class="field-value result-time">${horaFormateada}</span>
                </div>
                <div class="result-field">
                    <span class="field-label">MÉTODO:</span>
                    <span class="field-value">Marcado por cédula</span>
                </div>
            </div>
            <div class="result-footer">
                <button id="back-to-home-from-cedula" class="btn result-home-btn">← VOLVER AL INICIO</button>
            </div>
        </div>
    `;
    
    document.getElementById('back-to-home-from-cedula').addEventListener('click', () => {
        resultContainer.style.display = 'none';
        cerrarCedulaScreen();
    });
    
    // Limpiar variables
    currentCedulaEmployee = null;
    currentCedula = '';
    if (cedulaInput) cedulaInput.value = '';
}

// ========== FUNCIONES DE VIBRACIÓN ==========
function cargarConfiguracion() {
    const savedVibration = localStorage.getItem('vibrationEnabled');
    if (savedVibration !== null) {
        vibrationEnabled = savedVibration === 'true';
    }
    
    const toggleCheckbox = document.getElementById('vibration-toggle');
    const vibrationStatus = document.getElementById('vibration-status');
    
    if (toggleCheckbox) {
        toggleCheckbox.checked = vibrationEnabled;
        if (vibrationStatus) {
            vibrationStatus.textContent = vibrationEnabled ? 'Activada' : 'Desactivada';
            vibrationStatus.style.color = vibrationEnabled ? 'var(--success)' : 'var(--danger)';
        }
        
        toggleCheckbox.addEventListener('change', (e) => {
            vibrationEnabled = e.target.checked;
            localStorage.setItem('vibrationEnabled', vibrationEnabled);
            if (vibrationStatus) {
                vibrationStatus.textContent = vibrationEnabled ? 'Activada' : 'Desactivada';
                vibrationStatus.style.color = vibrationEnabled ? 'var(--success)' : 'var(--danger)';
            }
            // Vibrar al cambiar para feedback
            if (vibrationEnabled) vibrar();
        });
    }
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.createElement('button');
    btn.id = 'installButton';
    btn.className = 'btn btn-login-main';
    btn.textContent = '📲 INSTALAR APP';
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