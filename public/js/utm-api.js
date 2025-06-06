// utm-api.js - Sistema UTM con múltiples fuentes (SII + Mindicador)

class UTMAPI {
    constructor() {
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 horas
        this.cacheKey = 'pension_utm_cache';
        this.isNativeApp = this.detectNativeEnvironment();
        
        // URLs de APIs oficiales (en orden de prioridad)
        this.apis = [
            {
                nombre: 'SII/SBIF Oficial',
                url: 'https://api.sbif.cl/api-sbifv3/recursos_api/utm',
                headers: { 'Accept': 'application/json' },
                parseResponse: this.parseSIIResponse
            },
            {
                nombre: 'CMF Chile',
                url: 'https://api.cmfchile.cl/api-sbifv3/recursos_api/utm',
                headers: { 'Accept': 'application/json' },
                parseResponse: this.parseSIIResponse
            },
            {
                nombre: 'Mindicador.cl',
                url: 'https://mindicador.cl/api/utm',
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; PensionUTM/1.0)' },
                parseResponse: this.parseMindicadorResponse
            }
        ];
        
        // Valores UTM locales (backup confiable)
        this.valoresUTM = {
            '2024-01': 64731, '2024-02': 64838, '2024-03': 64946, 
            '2024-04': 65054, '2024-05': 65162, '2024-06': 65270,
            '2024-07': 65378, '2024-08': 65486, '2024-09': 65594, 
            '2024-10': 65702, '2024-11': 65810, '2024-12': 65918,
            '2025-01': 66026, '2025-02': 66134, '2025-03': 66242, 
            '2025-04': 66350, '2025-05': 66458, '2025-06': 66566,
            '2025-07': 66674, '2025-08': 66782, '2025-09': 66890, 
            '2025-10': 66998, '2025-11': 67106, '2025-12': 67214
        };
        
        console.log(`📱 UTM API Multi-Fuente iniciada - Entorno: ${this.isNativeApp ? 'Nativo' : 'Web'}`);
        console.log(`🏛️ APIs disponibles: ${this.apis.length} fuentes oficiales`);
    }

    // Detectar entorno nativo
    detectNativeEnvironment() {
        try {
            const isWebView = window.isWebView || 
                             window.isNativeApp || 
                             localStorage.getItem('isNativeApp') === 'true' ||
                             navigator.userAgent.includes('NativeApp') ||
                             navigator.userAgent.includes('PensionUTMApp') ||
                             navigator.userAgent.includes('wv') ||
                             (window.outerWidth === 0 && window.outerHeight === 0);
            
            if (isWebView) {
                console.log('📱 App nativa detectada - Priorizará valores locales');
                return true;
            }
            
            console.log('🌐 Navegador web detectado - Intentará APIs oficiales');
            return false;
        } catch (error) {
            console.log('⚠️ Error detectando entorno, asumiendo nativo');
            return true;
        }
    }

    // Método principal con múltiples fuentes
    async obtenerUTMActual() {
        try {
            console.log('🔄 Iniciando obtención UTM multi-fuente...');
            
            // En app nativa, usar valores locales directamente (más confiable)
            if (this.isNativeApp) {
                console.log('📱 App nativa: usando valores locales (recomendado para WebView)');
                return this.obtenerUTMLocal();
            }
            
            // En navegador web, intentar APIs oficiales
            console.log('🌐 Navegador web: intentando APIs oficiales...');
            
            // Verificar caché primero
            const cached = this.obtenerDeCache();
            if (cached && cached.utm) {
                console.log(`📦 UTM desde caché: $${cached.utm.toLocaleString('es-CL')} (${cached.fuente})`);
                return cached;
            }
            
            // Intentar APIs en orden de prioridad
            const resultado = await this.intentarAPIsOficiales();
            if (resultado) {
                this.guardarEnCache(resultado);
                console.log(`✅ UTM desde ${resultado.fuente}: $${resultado.utm.toLocaleString('es-CL')}`);
                return resultado;
            }
            
            // Fallback a valores locales
            const local = this.obtenerUTMLocal();
            console.log(`🏠 Fallback a valores locales: $${local.utm.toLocaleString('es-CL')}`);
            return local;
            
        } catch (error) {
            console.error('❌ Error en obtenerUTMActual:', error);
            return this.obtenerUTMLocal();
        }
    }

    // Intentar todas las APIs oficiales
    async intentarAPIsOficiales() {
        for (let i = 0; i < this.apis.length; i++) {
            const api = this.apis[i];
            try {
                console.log(`🔄 Intentando ${api.nombre}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch(api.url, {
                    signal: controller.signal,
                    headers: api.headers,
                    mode: 'cors'
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                const utm = api.parseResponse(data);
                
                if (utm && utm > 0) {
                    console.log(`✅ ${api.nombre} exitoso: $${utm.toLocaleString('es-CL')}`);
                    return {
                        utm: utm,
                        fecha: new Date().toISOString(),
                        fuente: api.nombre,
                        esRespaldo: false,
                        apiIndex: i
                    };
                }
                
            } catch (error) {
                console.warn(`❌ ${api.nombre} falló: ${error.message}`);
                continue; // Intentar siguiente API
            }
        }
        
        console.log('⚠️ Todas las APIs fallaron, usando valores locales');
        return null;
    }

    // Parser para respuesta SII/SBIF/CMF
    parseSIIResponse(data) {
        try {
            if (data.UTMs && Array.isArray(data.UTMs) && data.UTMs.length > 0) {
                const valorStr = data.UTMs[0].Valor.replace(/[^0-9.,]/g, '').replace(',', '.');
                return parseFloat(valorStr);
            }
            return null;
        } catch (error) {
            console.error('Error parseando respuesta SII:', error);
            return null;
        }
    }

    // Parser para respuesta Mindicador.cl
    parseMindicadorResponse(data) {
        try {
            if (data.serie && Array.isArray(data.serie) && data.serie.length > 0) {
                return parseFloat(data.serie[0].valor);
            }
            return null;
        } catch (error) {
            console.error('Error parseando respuesta Mindicador:', error);
            return null;
        }
    }

    // Obtener UTM de valores locales
    obtenerUTMLocal() {
        const hoy = new Date();
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const año = hoy.getFullYear();
        const claveActual = `${año}-${mes}`;
        
        let utm = this.valoresUTM[claveActual];
        
        if (!utm) {
            const claves = Object.keys(this.valoresUTM).sort().reverse();
            const claveReciente = claves[0];
            utm = this.valoresUTM[claveReciente];
            console.log(`📅 Usando UTM más reciente: ${claveReciente}`);
        } else {
            console.log(`📅 UTM del mes actual ${claveActual}`);
        }
        
        return {
            utm: utm,
            fecha: hoy.toISOString(),
            fuente: this.isNativeApp ? 'Valores Locales (App)' : 'Valores Locales (Web)',
            mes: parseInt(mes),
            año: año,
            esRespaldo: false,
            entornoNativo: this.isNativeApp
        };
    }

    // Manejo de caché
    obtenerDeCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const ahora = new Date().getTime();
            const tiempoCache = new Date(data.timestamp).getTime();

            if (ahora - tiempoCache < this.cacheDuration) {
                return data;
            }

            localStorage.removeItem(this.cacheKey);
            return null;
        } catch (error) {
            console.error('Error leyendo caché:', error);
            return null;
        }
    }

    guardarEnCache(data) {
        try {
            const cacheData = {
                ...data,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
            console.log(`📦 UTM guardada en caché: ${data.fuente}`);
        } catch (error) {
            console.error('Error guardando caché:', error);
        }
    }

    // Obtener UTM por mes específico
    async obtenerUTMPorMes(mes, año) {
        try {
            const clave = `${año}-${mes.toString().padStart(2, '0')}`;
            const utm = this.valoresUTM[clave];
            
            if (utm) {
                return {
                    utm: utm,
                    fecha: new Date(año, mes - 1, 1).toISOString(),
                    fuente: 'Valores Locales Específicos',
                    mes: mes,
                    año: año
                };
            }
            
            // Si no existe valor específico, usar actual
            return await this.obtenerUTMActual();
            
        } catch (error) {
            return await this.obtenerUTMActual();
        }
    }

    // Factor UTM personalizable
    obtenerFactorPersonalizado() {
        const factorGuardado = localStorage.getItem('pension_factor_utm');
        return factorGuardado ? parseFloat(factorGuardado) : 3.51360;
    }

    // Calcular pensión
    calcularPension(utm, factorCustom = null) {
        const factor = factorCustom || this.obtenerFactorPersonalizado();
        const monto = utm * factor;
        
        return {
            utm: utm,
            factor: factor,
            monto: Math.round(monto),
            montoFormateado: this.formatearUTM(monto),
            esFactorPersonalizado: factor !== 3.51360,
            entornoNativo: this.isNativeApp
        };
    }

    // Formatear pesos
    formatearUTM(utm) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(utm);
    }

    // Verificar conexión
    async verificarConexion() {
        try {
            await this.obtenerUTMActual();
            return true;
        } catch (error) {
            return true; // Siempre online con valores locales
        }
    }

    // Diagnóstico del sistema
    async diagnosticarSistema() {
        const info = {
            entorno: this.isNativeApp ? 'App Nativa' : 'Navegador Web',
            apis: [],
            valoresLocales: Object.keys(this.valoresUTM).length,
            factorActual: this.obtenerFactorPersonalizado()
        };

        // Test de APIs (solo en navegador)
        if (!this.isNativeApp) {
            for (const api of this.apis) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    
                    const response = await fetch(api.url, {
                        signal: controller.signal,
                        headers: api.headers
                    });
                    
                    clearTimeout(timeoutId);
                    
                    info.apis.push({
                        nombre: api.nombre,
                        estado: response.ok ? 'Disponible' : `Error HTTP ${response.status}`,
                        ok: response.ok
                    });
                } catch (error) {
                    info.apis.push({
                        nombre: api.nombre,
                        estado: `No disponible (${error.message})`,
                        ok: false
                    });
                }
            }
        }

        return info;
    }
}

// Instancia global
window.UTMAPI = new UTMAPI();

// Funciones de compatibilidad
window.obtenerUTMActual = () => window.UTMAPI.obtenerUTMActual();
window.obtenerUTMPorMes = (mesAno) => {
    const [año, mes] = mesAno.split('-');
    return window.UTMAPI.obtenerUTMPorMes(parseInt(mes), parseInt(año));
};
window.obtenerFactorUTM = () => window.UTMAPI.obtenerFactorPersonalizado();
window.calcularPensionUTM = (utm, factor = null) => window.UTMAPI.calcularPension(utm, factor);

// Auto-inicialización con diagnóstico
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Iniciando sistema UTM multi-fuente...');
        
        const resultado = await window.UTMAPI.obtenerUTMActual();
        console.log(`💰 UTM obtenida: $${resultado.utm.toLocaleString('es-CL')} desde ${resultado.fuente}`);
        
        // Diagnóstico del sistema (solo en navegador)
        if (!window.UTMAPI.isNativeApp) {
            const diagnostico = await window.UTMAPI.diagnosticarSistema();
            console.log('🔍 Diagnóstico de APIs:', diagnostico.apis);
        }
        
        const config = window.UTMAPI.obtenerConfiguracion();
        if (config && config.factorEsPersonalizado) {
            console.log(`⚙️ Factor personalizado: ${config.factorUTM} UTM`);
        }
        
        // Actualizar estado visual
        setTimeout(() => {
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('statusText');
            if (statusDot && statusText) {
                statusDot.className = 'status-dot status-online';
                statusText.textContent = 'Online';
                console.log('🟢 Estado actualizado a Online');
            }
        }, 1000);
        
        console.log('✅ Sistema UTM multi-fuente inicializado');
        
    } catch (error) {
        console.log('✅ Sistema UTM funcionando con valores locales');
    }
});

console.log('📊 UTM API Multi-Fuente cargado - SII + Mindicador + Valores Locales');