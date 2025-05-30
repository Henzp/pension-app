// app.js - JavaScript principal para la App de Pensión Alimenticia

// Variables globales
let pagos = [];
let valoresUTM = {};

// Configuración
const CONFIG = {
    FACTOR_UTM: 3.51360,
    UTM_INICIAL: 68310, // Valor aproximado mayo 2025
    MONEDA: 'CLP'
};

// Funciones de utilidad
function formatearPesos(cantidad) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: CONFIG.MONEDA,
        minimumFractionDigits: 0
    }).format(cantidad);
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CL');
}

function formatearMes(mesAno) {
    const [ano, mes] = mesAno.split('-');
    const fecha = new Date(ano, mes - 1);
    return fecha.toLocaleDateString('es-CL', { 
        year: 'numeric', 
        month: 'long' 
    });
}

// Funciones de almacenamiento local (temporal)
function guardarPagos() {
    try {
        localStorage.setItem('pension_pagos', JSON.stringify(pagos));
        console.log('✅ Pagos guardados localmente');
    } catch (error) {
        console.warn('⚠️ No se pudieron guardar los pagos:', error);
    }
}

function cargarPagos() {
    try {
        const pagosGuardados = localStorage.getItem('pension_pagos');
        if (pagosGuardados) {
            pagos = JSON.parse(pagosGuardados);
            console.log(`✅ ${pagos.length} pagos cargados`);
        }
    } catch (error) {
        console.warn('⚠️ No se pudieron cargar los pagos:', error);
        pagos = [];
    }
}

function guardarValoresUTM() {
    try {
        localStorage.setItem('pension_utm', JSON.stringify(valoresUTM));
        console.log('✅ Valores UTM guardados localmente');
    } catch (error) {
        console.warn('⚠️ No se pudieron guardar los valores UTM:', error);
    }
}

function cargarValoresUTM() {
    try {
        const utmGuardados = localStorage.getItem('pension_utm');
        if (utmGuardados) {
            valoresUTM = JSON.parse(utmGuardados);
            console.log('✅ Valores UTM cargados');
        }
    } catch (error) {
        console.warn('⚠️ No se pudieron cargar los valores UTM:', error);
        valoresUTM = {};
    }
}

// Funciones de cálculo
function calcularPensionMensual(valorUTM) {
    return Math.round(valorUTM * CONFIG.FACTOR_UTM);
}

function obtenerValorUTM(mesAno) {
    return valoresUTM[mesAno] || CONFIG.UTM_INICIAL;
}

function calcularResumen() {
    const totalPagos = pagos.length;
    const montoTotalPagado = pagos.reduce((total, pago) => total + pago.monto, 0);
    
    // Calcular total requerido
    let montoTotalRequerido = 0;
    const mesesConPagos = [...new Set(pagos.map(p => p.mesCorrespondiente))];
    
    mesesConPagos.forEach(mes => {
        const valorUTM = obtenerValorUTM(mes);
        montoTotalRequerido += calcularPensionMensual(valorUTM);
    });
    
    const diferencia = montoTotalPagado - montoTotalRequerido;
    
    // Último pago
    let ultimoPago = '-';
    if (pagos.length > 0) {
        const pagoReciente = pagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        ultimoPago = formatearFecha(pagoReciente.fecha);
    }
    
    return {
        totalPagos,
        montoTotalPagado,
        montoTotalRequerido,
        diferencia,
        ultimoPago
    };
}

// Funciones de interfaz
function mostrarAlerta(mensaje, tipo = 'info') {
    const alertaExistente = document.querySelector('.alert');
    if (alertaExistente) {
        alertaExistente.remove();
    }
    
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    
    const container = document.querySelector('.container');
    container.insertBefore(alerta, container.firstChild);
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
    }, 5000);
}

function actualizarNavegacionActiva() {
    const enlaces = document.querySelectorAll('.nav-link');
    const rutaActual = window.location.pathname;
    
    enlaces.forEach(enlace => {
        enlace.classList.remove('active');
        if (enlace.getAttribute('href') === rutaActual || 
            (rutaActual === '/' && enlace.getAttribute('href') === '/')) {
            enlace.classList.add('active');
        }
    });
}

// Funciones específicas para cada página
function inicializarPaginaInicio() {
    console.log('🏠 Inicializando página de inicio');
    
    const resumen = calcularResumen();
    
    // Actualizar elementos si existen
    const elementoTotalPagos = document.getElementById('totalPagos');
    const elementoMontoTotal = document.getElementById('montoTotal');
    const elementoUltimoPago = document.getElementById('ultimoPago');
    
    if (elementoTotalPagos) elementoTotalPagos.textContent = resumen.totalPagos;
    if (elementoMontoTotal) elementoMontoTotal.textContent = formatearPesos(resumen.montoTotalPagado);
    if (elementoUltimoPago) elementoUltimoPago.textContent = resumen.ultimoPago;
}

function inicializarCalculadora() {
    console.log('🧮 Inicializando calculadora');
    
    // Establecer fecha actual
    const fechaActual = new Date();
    const mesActual = fechaActual.toISOString().slice(0, 7);
    
    const inputMes = document.getElementById('mesCalculo');
    const inputUTM = document.getElementById('valorUTM');
    
    if (inputMes) inputMes.value = mesActual;
    if (inputUTM) inputUTM.value = obtenerValorUTM(mesActual);
}

// Eventos globales
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 App de Pensión Alimenticia iniciada');
    
    // Cargar datos
    cargarPagos();
    cargarValoresUTM();
    
    // Actualizar navegación
    actualizarNavegacionActiva();
    
    // Inicializar según la página
    const ruta = window.location.pathname;
    
    if (ruta === '/' || ruta === '/index.html') {
        inicializarPaginaInicio();
    } else if (ruta === '/calculadora.html') {
        inicializarCalculadora();
    }
    
    console.log('✅ App inicializada correctamente');
});

// Funciones que se exportarán globalmente
window.PensionApp = {
    // Datos
    pagos,
    valoresUTM,
    CONFIG,
    
    // Funciones de utilidad
    formatearPesos,
    formatearFecha,
    formatearMes,
    
    // Funciones de cálculo
    calcularPensionMensual,
    obtenerValorUTM,
    calcularResumen,
    
    // Funciones de almacenamiento
    guardarPagos,
    cargarPagos,
    guardarValoresUTM,
    cargarValoresUTM,
    
    // Funciones de interfaz
    mostrarAlerta
};

console.log('📦 PensionApp cargado y disponible globalmente');