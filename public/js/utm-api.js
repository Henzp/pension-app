// utm-api.js - API UTM con búsqueda por mes específico CORREGIDA

// URL base de la API
const API_BASE_URL = 'https://mindicador.cl/api';

/**
 * Obtiene el valor actual de la UTM (más reciente)
 * @returns {Promise<Object>} Objeto con datos de UTM
 */
async function obtenerUTMActual() {
    try {
        console.log('🔄 Obteniendo valor UTM más reciente...');
        
        const response = await fetch(`${API_BASE_URL}/utm`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ UTM más reciente obtenida:', data.serie[0]);
        
        return {
            valor: data.serie[0].valor,
            fecha: data.serie[0].fecha,
            unidad_medida: data.unidad_medida,
            codigo: data.codigo
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo UTM actual:', error);
        throw error;
    }
}

/**
 * Obtiene todos los valores UTM disponibles
 * @returns {Promise<Array>} Array con valores UTM
 */
async function obtenerTodosLosValoresUTM() {
    try {
        console.log('🔄 Obteniendo todos los valores UTM...');
        
        const response = await fetch(`${API_BASE_URL}/utm`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mapear todos los valores con fecha formateada
        const valoresMapeados = data.serie.map(item => ({
            valor: item.valor,
            fecha: item.fecha,
            mesAno: formatearFechaParaMes(item.fecha),
            fechaOriginal: new Date(item.fecha)
        }));
        
        console.log(`✅ ${valoresMapeados.length} valores UTM obtenidos`);
        return valoresMapeados;
        
    } catch (error) {
        console.error('❌ Error obteniendo valores UTM:', error);
        throw error;
    }
}

/**
 * Busca el valor UTM para un mes específico
 * @param {string} mesAno - Formato "2025-01" para enero 2025
 * @returns {Promise<number>} Valor de UTM para ese mes
 */
async function obtenerUTMPorMes(mesAno) {
    try {
        console.log(`🔍 Buscando UTM para el mes específico: ${mesAno}`);
        
        // Obtener todos los valores disponibles
        const todosLosValores = await obtenerTodosLosValoresUTM();
        
        // Buscar coincidencia exacta del mes
        const valorEncontrado = todosLosValores.find(item => {
            const match = item.mesAno === mesAno;
            if (match) {
                console.log(`🎯 Coincidencia encontrada: ${item.mesAno} = ${mesAno}`);
            }
            return match;
        });
        
        if (valorEncontrado) {
            console.log(`✅ UTM encontrada para ${mesAno}: $${valorEncontrado.valor}`);
            return valorEncontrado.valor;
        }
        
        // Si no se encuentra coincidencia exacta, buscar el más cercano del mismo año
        const [anoSolicitado, mesSolicitado] = mesAno.split('-');
        console.log(`🔍 No hay coincidencia exacta, buscando en el año ${anoSolicitado}...`);
        
        const valoresDelAno = todosLosValores.filter(item => {
            const [anoItem] = item.mesAno.split('-');
            return anoItem === anoSolicitado;
        });
        
        if (valoresDelAno.length > 0) {
            // Ordenar por fecha y tomar el más reciente del año
            valoresDelAno.sort((a, b) => b.fechaOriginal - a.fechaOriginal);
            const valorDelAno = valoresDelAno[0];
            
            console.log(`📅 Usando valor más reciente del año ${anoSolicitado}: ${valorDelAno.mesAno} = $${valorDelAno.valor}`);
            return valorDelAno.valor;
        }
        
        // Si no hay nada del año, usar el más reciente disponible
        console.log(`⚠️ No hay datos para ${anoSolicitado}, usando valor más reciente disponible`);
        const valorActual = await obtenerUTMActual();
        return valorActual.valor;
        
    } catch (error) {
        console.error(`❌ Error obteniendo UTM para ${mesAno}:`, error);
        
        // En caso de error total, retornar valor por defecto
        console.log('🔄 Usando valor por defecto debido a error');
        return 68310; // Valor por defecto
    }
}

/**
 * Obtiene UTM del último mes disponible
 * @returns {Promise<Array>} Array con valores UTM recientes
 */
async function obtenerUTMUltimoMes() {
    try {
        console.log('🔄 Obteniendo valores UTM del último mes...');
        
        const response = await fetch(`${API_BASE_URL}/utm`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Retorna los últimos 30 valores (aproximadamente un mes)
        return data.serie.slice(0, 30).map(item => ({
            valor: item.valor,
            fecha: item.fecha,
            mesAno: formatearFechaParaMes(item.fecha)
        }));
        
    } catch (error) {
        console.error('❌ Error obteniendo UTM del mes:', error);
        throw error;
    }
}

/**
 * Obtiene todos los indicadores económicos
 * @returns {Promise<Object>} Objeto con todos los indicadores
 */
async function obtenerTodosLosIndicadores() {
    try {
        console.log('🔄 Obteniendo todos los indicadores...');
        
        const response = await fetch(API_BASE_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            utm: data.utm,
            uf: data.uf,
            dolar: data.dolar,
            euro: data.euro,
            fecha: data.fecha
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo indicadores:', error);
        throw error;
    }
}

/**
 * Actualiza automáticamente los valores UTM en la aplicación
 */
async function actualizarValoresUTMAutomaticamente() {
    try {
        console.log('🔄 Actualizando valores UTM automáticamente...');
        
        const valoresUTM = await obtenerTodosLosValoresUTM();
        
        // Actualizar el objeto global de valores UTM si existe
        if (window.PensionApp && window.PensionApp.valoresUTM) {
            valoresUTM.forEach(item => {
                window.PensionApp.valoresUTM[item.mesAno] = item.valor;
            });
        }
        
        // Guardar en localStorage
        if (window.PensionApp && window.PensionApp.guardarValoresUTM) {
            window.PensionApp.guardarValoresUTM();
        }
        
        console.log(`✅ ${valoresUTM.length} valores UTM actualizados automáticamente`);
        return true;
        
    } catch (error) {
        console.error('❌ Error en actualización automática:', error);
        return false;
    }
}

/**
 * Formatea una fecha para obtener el formato mes-año
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} Formato "2025-01"
 */
function formatearFechaParaMes(fecha) {
    const date = new Date(fecha);
    const año = date.getFullYear();
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const resultado = `${año}-${mes}`;
    
    // Debug: mostrar conversión ocasionalmente
    if (Math.random() < 0.1) { // 10% de las veces
        console.log(`🔄 Fecha convertida: ${fecha} → ${resultado}`);
    }
    
    return resultado;
}

/**
 * Muestra una alerta con el estado de la conexión a la API
 */
async function verificarConexionAPI() {
    try {
        const utm = await obtenerUTMActual();
        mostrarAlerta(`✅ Conexión exitosa. UTM actual: $${utm.valor.toLocaleString('es-CL')}`, 'success');
        return true;
    } catch (error) {
        mostrarAlerta('❌ Error conectando con la API de UTM. Usando valores locales.', 'danger');
        return false;
    }
}

/**
 * Función de prueba para verificar búsqueda por mes
 * @param {string} mesAno - Mes a probar
 */
async function probarBusquedaPorMes(mesAno) {
    try {
        console.log(`🧪 PRUEBA: Buscando UTM para ${mesAno}`);
        
        const valor = await obtenerUTMPorMes(mesAno);
        console.log(`🧪 RESULTADO: UTM para ${mesAno} = $${valor}`);
        
        return valor;
    } catch (error) {
        console.error(`🧪 ERROR: No se pudo obtener UTM para ${mesAno}:`, error);
        return null;
    }
}

// Función para mostrar alertas (debe estar definida en app.js)
function mostrarAlerta(mensaje, tipo = 'info') {
    if (window.PensionApp && window.PensionApp.mostrarAlerta) {
        window.PensionApp.mostrarAlerta(mensaje, tipo);
    } else {
        console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    }
}

// Exportar funciones globalmente
window.UTMAPI = {
    obtenerUTMActual,
    obtenerTodosLosValoresUTM,
    obtenerUTMPorMes,
    obtenerUTMUltimoMes,
    obtenerTodosLosIndicadores,
    actualizarValoresUTMAutomaticamente,
    verificarConexionAPI,
    probarBusquedaPorMes // Para debugging
};

console.log('📦 API UTM cargada con búsqueda por mes específico - v2.0.1');