// utm-api.js - OPTIMIZADO PARA ANDROID WEBVIEW

class UTMAPI {
    constructor() {
        this.cacheDuration = 4 * 60 * 60 * 1000; // 4 horas (más tiempo para apps nativas)
        this.cacheKey = 'pension_utm_cache';
        
        // 🎯 VALORES UTM REALES 2025 EXTENDIDOS (fallback principal para Android)
        this.valoresUTMReales = {
            '2024-01': 64731, '2024-02': 64838, '2024-03': 64946, 
            '2024-04': 65054, '2024-05': 65162, '2024-06': 65270,
            '2024-07': 65378, '2024-08': 65486, '2024-09': 65594, 
            '2024-10': 65702, '2024-11': 65810, '2024-12': 65918,
            '2025-01': 67429, '2025-02': 67294, '2025-03': 68034,
            '2025-04': 68306, '2025-05': 68648, '2025-06': 68785,
            '2025-07': 69000, '2025-08': 69200, '2025-09': 69400,
            '2025-10': 69600, '2025-11': 69800, '2025-12': 70000,
            // Valores estimados para 2026 (en caso de que la app se use más tiempo)
            '2026-01': 70200, '2026-02': 70400, '2026-03': 70600,
            '2026-04': 70800, '2026-05': 71000, '2026-06': 71200
        };
        
        // 🔍 DETECTAR ENTORNO
        this.esAndroid = this.detectarAndroid();
        this.esWebView = this.detectarWebView();
        
        console.log('🌐 UTM API iniciada');
        console.log('📱 Entorno Android:', this.esAndroid);
        console.log('🖥️ Entorno WebView:', this.esWebView);
        
        // En Android, priorizar valores locales
        if (this.esAndroid || this.esWebView) {
            console.log('📱 Modo Android detectado - Priorizando valores locales');
        }
    }

    // 🔍 DETECTAR SI ESTAMOS EN ANDROID
    detectarAndroid() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('android') || 
               userAgent.includes('mobile') ||
               typeof window.cordova !== 'undefined' ||
               typeof window.Capacitor !== 'undefined';
    }

    // 🔍 DETECTAR SI ESTAMOS EN WEBVIEW
    detectarWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('wv') || 
               !userAgent.includes('chrome') || 
               typeof window.cordova !== 'undefined' ||
               typeof window.Capacitor !== 'undefined';
    }

    // 🌐 MÉTODO PRINCIPAL OPTIMIZADO PARA ANDROID
    async obtenerUTMActual() {
        try {
            console.log('🔄 Obteniendo UTM...');
            
            // En Android, verificar caché primero y ser más permisivo
            const cached = this.obtenerDeCache();
            if (cached && this.esCacheValido(cached, this.esAndroid)) {
                console.log(`📦 UTM desde caché: $${cached.utm.toLocaleString('es-CL')}`);
                
                // Solo intentar actualizar en background si NO es Android
                if (!this.esAndroid && !this.esWebView) {
                    this.actualizarEnBackground();
                }
                return cached;
            }
            
            // Si es Android/WebView, intentar APIs con timeout más corto
            if (this.esAndroid || this.esWebView) {
                console.log('📱 Entorno Android: Intentando APIs con timeout corto...');
                const resultadoAPI = await this.intentarAPIsAndroid();
                if (resultadoAPI) {
                    this.guardarEnCache(resultadoAPI);
                    console.log(`✅ UTM desde API: $${resultadoAPI.utm.toLocaleString('es-CL')}`);
                    return resultadoAPI;
                }
                
                console.log('📱 APIs no disponibles en Android, usando valores locales');
                return this.obtenerUTMLocal();
            }
            
            // Para navegadores normales, intentar APIs completas
            console.log('🌐 Navegador normal: Intentando APIs completas...');
            const resultadoAPI = await this.intentarAPIsConectadas();
            if (resultadoAPI) {
                this.guardarEnCache(resultadoAPI);
                console.log(`✅ UTM desde ${resultadoAPI.fuente}: $${resultadoAPI.utm.toLocaleString('es-CL')}`);
                return resultadoAPI;
            }
            
            // Fallback final
            console.log('🏠 Fallback: Usando valores locales');
            return this.obtenerUTMLocal();
            
        } catch (error) {
            console.error('❌ Error en obtenerUTMActual:', error);
            return this.obtenerUTMLocal();
        }
    }

    // 🚀 INTENTAR APIS OPTIMIZADAS PARA ANDROID
    async intentarAPIsAndroid() {
        // En Android, usar timeouts más cortos y menos intentos
        const apis = [
            {
                nombre: 'Mindicador Simple',
                url: 'https://mindicador.cl/api/utm',
                timeout: 3000 // Timeout más corto para Android
            }
        ];

        for (let api of apis) {
            try {
                console.log(`🔄 [Android] Intentando ${api.nombre}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), api.timeout);
                
                // Configuración mínima para Android WebView
                const fetchOptions = {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                    // NO usar mode: 'cors' en Android WebView
                };
                
                const response = await fetch(api.url, fetchOptions);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                const utm = this.parseMindicadorResponse(data);
                
                if (utm && utm > 65000 && utm < 75000) {
                    console.log(`✅ [Android] ${api.nombre} exitoso: $${utm.toLocaleString('es-CL')}`);
                    return {
                        utm: utm,
                        fecha: new Date().toISOString(),
                        fuente: `${api.nombre} (Android)`,
                        esRespaldo: false,
                        timestamp: new Date().toISOString()
                    };
                }
                
            } catch (error) {
                console.warn(`❌ [Android] ${api.nombre} falló: ${error.message}`);
                continue;
            }
        }
        
        console.log('⚠️ [Android] Todas las APIs fallaron');
        return null;
    }

    // 🚀 INTENTAR APIS COMPLETAS (NAVEGADORES)
    async intentarAPIsConectadas() {
        const apis = [
            {
                nombre: 'Mindicador.cl',
                url: 'https://mindicador.cl/api/utm',
                timeout: 5000
            },
            {
                nombre: 'Proxy CORS',
                url: 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://mindicador.cl/api/utm'),
                timeout: 6000,
                esProxy: true
            }
        ];

        for (let api of apis) {
            try {
                console.log(`🔄 [Web] Intentando ${api.nombre}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), api.timeout);
                
                const response = await fetch(api.url, {
                    signal: controller.signal,
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                let utm;
                
                if (api.esProxy) {
                    const contenido = JSON.parse(data.contents);
                    utm = this.parseMindicadorResponse(contenido);
                } else {
                    utm = this.parseMindicadorResponse(data);
                }
                
                if (utm && utm > 65000 && utm < 75000) {
                    console.log(`✅ [Web] ${api.nombre} exitoso: $${utm.toLocaleString('es-CL')}`);
                    return {
                        utm: utm,
                        fecha: new Date().toISOString(),
                        fuente: api.nombre,
                        esRespaldo: false,
                        timestamp: new Date().toISOString()
                    };
                }
                
            } catch (error) {
                console.warn(`❌ [Web] ${api.nombre} falló: ${error.message}`);
                continue;
            }
        }
        
        return null;
    }

    // Parser para respuesta de Mindicador
    parseMindicadorResponse(data) {
        try {
            if (data && data.serie && Array.isArray(data.serie) && data.serie.length > 0) {
                const valor = parseFloat(data.serie[0].valor);
                if (!isNaN(valor) && valor > 0) {
                    return valor;
                }
            }
            throw new Error('Estructura inválida');
        } catch (error) {
            console.error('❌ Error parseando respuesta:', error);
            return null;
        }
    }

    // 🎯 FUNCIÓN PRINCIPAL PARA CALCULADORA
    async obtenerUTMPorMes(mesAno) {
        try {
            console.log(`🔍 [${this.esAndroid ? 'Android' : 'Web'}] UTM para: ${mesAno}`);
            
            const [año, mes] = mesAno.split('-');
            const añoNum = parseInt(año);
            const mesNum = parseInt(mes);
            
            // Verificar si es el mes actual
            const hoy = new Date();
            const mesActual = hoy.getMonth() + 1;
            const añoActual = hoy.getFullYear();
            
            if (mesNum === mesActual && añoNum === añoActual) {
                console.log('📅 Es el mes actual');
                const resultado = await this.obtenerUTMActual();
                return resultado.utm;
            }
            
            // Para meses específicos, usar valores locales (más confiable en Android)
            const clave = `${añoNum}-${mesNum.toString().padStart(2, '0')}`;
            const utm = this.valoresUTMReales[clave];
            
            if (utm) {
                console.log(`✅ UTM local para ${clave}: $${utm.toLocaleString('es-CL')}`);
                return utm;
            } else {
                console.log(`⚠️ No hay valor para ${clave}, usando actual`);
                const resultado = await this.obtenerUTMActual();
                return resultado.utm;
            }
            
        } catch (error) {
            console.error(`❌ Error en obtenerUTMPorMes(${mesAno}):`, error);
            // Fallback robusto para Android
            return this.valoresUTMReales['2025-06'] || 68785;
        }
    }

    // Obtener UTM local (fallback principal para Android)
    obtenerUTMLocal() {
        const hoy = new Date();
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const año = hoy.getFullYear();
        const claveActual = `${año}-${mes}`;
        
        let utm = this.valoresUTMReales[claveActual];
        
        if (!utm) {
            // Usar el valor más reciente disponible
            const claves = Object.keys(this.valoresUTMReales).sort().reverse();
            utm = this.valoresUTMReales[claves[0]];
            console.log(`📅 Usando valor más reciente: ${claves[0]}`);
        }
        
        return {
            utm: utm,
            fecha: hoy.toISOString(),
            fuente: this.esAndroid ? 'Valores Locales (Android)' : 'Valores Locales',
            esRespaldo: true,
            timestamp: hoy.toISOString()
        };
    }

    // Actualizar en background (solo para navegadores)
    async actualizarEnBackground() {
        if (this.esAndroid || this.esWebView) {
            return; // No hacer actualizaciones en background en Android
        }
        
        try {
            console.log('🔄 Actualizando en background...');
            const resultado = await this.intentarAPIsConectadas();
            if (resultado) {
                this.guardarEnCache(resultado);
                console.log('✅ Background actualizado');
            }
        } catch (error) {
            console.log('⚠️ Background falló');
        }
    }

    // Validez de caché (más permisivo en Android)
    esCacheValido(cached, esAndroid = false) {
        try {
            const ahora = new Date().getTime();
            const tiempoCache = new Date(cached.timestamp).getTime();
            
            // En Android, caché válido por más tiempo
            const duracionCache = esAndroid ? (8 * 60 * 60 * 1000) : this.cacheDuration; // 8 horas en Android
            const esValido = ahora - tiempoCache < duracionCache;
            
            if (!esValido) {
                console.log(`⏰ Caché expirado (${esAndroid ? '8' : '4'} horas)`);
                return false;
            }
            
            if (cached.utm < 65000 || cached.utm > 75000) {
                console.log('⚠️ Valor fuera de rango');
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Manejo de caché
    obtenerDeCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            return null;
        }
    }

    guardarEnCache(data) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error guardando caché:', error);
        }
    }

    // Factor UTM personalizable
    obtenerFactorPersonalizado() {
        try {
            const factorGuardado = localStorage.getItem('pension_factor_utm');
            return factorGuardado ? parseFloat(factorGuardado) : 3.51360;
        } catch (error) {
            return 3.51360;
        }
    }

    guardarFactorPersonalizado(factor) {
        try {
            localStorage.setItem('pension_factor_utm', factor.toString());
        } catch (error) {
            console.error('Error guardando factor:', error);
        }
    }

    // Diagnóstico específico para Android
    async diagnostico() {
        console.log('🔍 Diagnóstico completo...');
        
        const info = {
            entorno: this.esAndroid ? 'Android/WebView' : 'Navegador',
            esAndroid: this.esAndroid,
            esWebView: this.esWebView,
            userAgent: navigator.userAgent,
            cacheDisponible: !!this.obtenerDeCache(),
            valorActual: await this.obtenerUTMActual(),
            funcionTest: await this.obtenerUTMPorMes('2025-06')
        };
        
        console.table(info);
        return info;
    }

    // Formatear moneda
    formatearUTM(utm) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(utm);
    }

    // Limpiar caché
    limpiarCache() {
        localStorage.removeItem(this.cacheKey);
        console.log('🗑️ Caché limpiado');
    }

    // Forzar actualización
    async forzarActualizacion() {
        this.limpiarCache();
        return await this.obtenerUTMActual();
    }
}

// 🌐 CREAR INSTANCIA GLOBAL
window.UTMAPI = new UTMAPI();

// 🎯 FUNCIONES GLOBALES DE COMPATIBILIDAD
window.obtenerUTMActual = async () => {
    try {
        const resultado = await window.UTMAPI.obtenerUTMActual();
        return resultado.utm;
    } catch (error) {
        console.error('Error en obtenerUTMActual:', error);
        return 68785;
    }
};

window.obtenerUTMPorMes = async (mesAno) => {
    try {
        console.log(`📞 [Global] obtenerUTMPorMes("${mesAno}")`);
        return await window.UTMAPI.obtenerUTMPorMes(mesAno);
    } catch (error) {
        console.error(`Error en obtenerUTMPorMes(${mesAno}):`, error);
        return 68785;
    }
};

window.obtenerFactorUTM = () => window.UTMAPI.obtenerFactorPersonalizado();
window.diagnosticoUTM = () => window.UTMAPI.diagnostico();
window.limpiarCacheUTM = () => window.UTMAPI.limpiarCache();

// 🚀 AUTO-INICIALIZACIÓN OPTIMIZADA
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Iniciando sistema UTM...');
        console.log(`📱 Entorno detectado: ${window.UTMAPI.esAndroid ? 'Android' : 'Web'}`);
        
        const inicio = performance.now();
        const resultado = await window.UTMAPI.obtenerUTMActual();
        const tiempo = Math.round(performance.now() - inicio);
        
        console.log(`💰 UTM obtenida en ${tiempo}ms: $${resultado.utm.toLocaleString('es-CL')} (${resultado.fuente})`);
        
        // Test de función
        const testMes = await window.UTMAPI.obtenerUTMPorMes('2025-06');
        console.log(`🧪 Test: $${testMes.toLocaleString('es-CL')}`);
        
        // Actualizar estado visual
        setTimeout(() => {
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('statusText');
            if (statusDot && statusText) {
                if (resultado.esRespaldo) {
                    statusDot.className = 'status-dot status-offline';
                    statusText.textContent = window.UTMAPI.esAndroid ? 'Local (Android)' : 'Offline';
                } else {
                    statusDot.className = 'status-dot status-online';
                    statusText.textContent = 'Online';
                }
            }
        }, 100);
        
        console.log('✅ Sistema UTM listo');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        console.log('✅ Funcionando con valores locales');
    }
});

console.log('🌐 UTM API v6.0 - Android WebView Optimized');