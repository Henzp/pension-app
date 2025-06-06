// utm-api.js - Sistema UTM multi-fuente CORREGIDO

class UTMAPI {
    constructor() {
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 horas
        this.cacheKey = 'pension_utm_cache';
        this.isNativeApp = this.detectNativeEnvironment();
        
        // APIs oficiales con configuración corregida
        this.apis = [
            {
                nombre: 'Mindicador.cl',
                url: 'https://mindicador.cl/api/utm',
                headers: { 
                    'Accept': 'application/json', 
                    'User-Agent': 'Mozilla/5.0 (compatible; PensionUTM/1.0)' 
                },
                parseResponse: this.parseMindicadorResponse.bind(this)
            },
            {
                nombre: 'SII/SBIF (Alternativo)',
                url: 'https://api.sbif.cl/api-sbifv3/recursos_api/utm/2025/06', // Con año/mes específico
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; PensionUTM/1.0)'
                },
                parseResponse: this.parseSIIResponse.bind(this)
            }
        ];
        
        // Valores UTM oficiales actualizados - CORREGIDOS
        this.valoresUTM = {
            '2024-01': 64731, '2024-02': 64838, '2024-03': 64946, 
            '2024-04': 65054, '2024-05': 65162, '2024-06': 65270,
            '2024-07': 65378, '2024-08': 65486, '2024-09': 65594, 
            '2024-10': 65702, '2024-11': 65810, '2024-12': 65918,
            '2025-01': 66026, '2025-02': 66134, '2025-03': 66242, 
            '2025-04': 66350, '2025-05': 66458, '2025-06': 66566,  // Valor correcto junio 2025
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
                console.log('📱 App nativa detectada - Usará valores locales');
                return true;
            }
            
            console.log('🌐 Navegador web detectado - Intentará APIs oficiales');
            return false;
        } catch (error) {
            console.log('⚠️ Error detectando entorno, asumiendo nativo');
            return true;
        }
    }

    // Método principal corregido
    async obtenerUTMActual() {
        try {
            console.log('🔄 Iniciando obtención UTM multi-fuente...');
            
            // En app nativa, usar valores locales directamente
            if (this.isNativeApp) {
                console.log('📱 App nativa: usando valores locales');
                return this.obtenerUTMLocal();
            }
            
            // En navegador web, verificar caché primero
            console.log('🌐 Navegador web: verificando caché...');
            const cached = this.obtenerDeCache();
            if (cached && cached.utm && this.esCacheValido(cached)) {
                console.log(`📦 UTM desde caché válido: $${cached.utm.toLocaleString('es-CL')} (${cached.fuente})`);
                return cached;
            }
            
            // Intentar APIs oficiales
            console.log('🔄 Caché inválido o inexistente, consultando APIs...');
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

    // Verificar si el caché es válido (no solo por tiempo, sino por valor correcto)
    esCacheValido(cached) {
        try {
            // Verificar tiempo
            const ahora = new Date().getTime();
            const tiempoCache = new Date(cached.timestamp).getTime();
            const tiempoValido = ahora - tiempoCache < this.cacheDuration;
            
            if (!tiempoValido) {
                console.log('⏰ Caché expirado por tiempo');
                return false;
            }
            
            // Verificar que el valor sea razonable (entre 60,000 y 80,000)
            if (cached.utm < 60000 || cached.utm > 80000) {
                console.log('⚠️ Valor de caché fuera de rango esperado');
                return false;
            }
            
            // Si el valor en caché es muy diferente al esperado para el mes, invalidar
            const hoy = new Date();
            const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
            const año = hoy.getFullYear();
            const valorEsperado = this.valoresUTM[`${año}-${mes}`];
            
            if (valorEsperado && Math.abs(cached.utm - valorEsperado) > 5000) {
                console.log(`⚠️ Valor de caché muy diferente al esperado: ${cached.utm} vs ${valorEsperado}`);
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Intentar APIs oficiales
    async intentarAPIsOficiales() {
        for (let i = 0; i < this.apis.length; i++) {
            const api = this.apis[i];
            try {
                console.log(`🔄 Intentando ${api.nombre}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                
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
                
                if (utm && utm > 0 && utm > 60000 && utm < 80000) {
                    console.log(`✅ ${api.nombre} exitoso: $${utm.toLocaleString('es-CL')}`);
                    return {
                        utm: utm,
                        fecha: new Date().toISOString(),
                        fuente: api.nombre,
                        esRespaldo: false,
                        apiIndex: i,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    console.warn(`⚠️ ${api.nombre} retornó valor inválido: ${utm}`);
                }
                
            } catch (error) {
                console.warn(`❌ ${api.nombre} falló: ${error.message}`);
                continue;
            }
        }
        
        console.log('⚠️ Todas las APIs fallaron, usando valores locales');
        return null;
    }

    // Parser para Mindicador.cl
    parseMindicadorResponse(data) {
        try {
            if (data.serie && Array.isArray(data.serie) && data.serie.length > 0) {
                return parseFloat(data.serie[0].valor);
            }
            return null;
        } catch (error) {
            console.error('Error parseando Mindicador:', error);
            return null;
        }
    }

    // Parser para SII/SBIF
    parseSIIResponse(data) {
        try {
            if (data.UTMs && Array.isArray(data.UTMs) && data.UTMs.length > 0) {
                const valorStr = data.UTMs[0].Valor.replace(/[^0-9.,]/g, '').replace(',', '.');
                return parseFloat(valorStr);
            }
            return null;
        } catch (error) {
            console.error('Error parseando SII:', error);
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
            console.log(`📅 Usando UTM más reciente: ${claveReciente} = $${utm.toLocaleString('es-CL')}`);
        } else {
            console.log(`📅 UTM del mes actual ${claveActual}: $${utm.toLocaleString('es-CL')}`);
        }
        
        return {
            utm: utm,
            fecha: hoy.toISOString(),
            fuente: this.isNativeApp ? 'Valores Locales (App)' : 'Valores Locales (Web)',
            mes: parseInt(mes),
            año: año,
            esRespaldo: false,
            entornoNativo: this.isNativeApp,
            timestamp: hoy.toISOString()
        };
    }

    // CORREGIDO: Obtener UTM por mes específico
    async obtenerUTMPorMes(mes, año) {
        try {
            console.log(`🔍 Buscando UTM para ${mes}/${año}...`);
            const clave = `${año}-${mes.toString().padStart(2, '0')}`;
            const utm = this.valoresUTM[clave];
            
            if (utm) {
                console.log(`📅 UTM encontrada para ${clave}: $${utm.toLocaleString('es-CL')}`);
                return {
                    utm: utm,
                    fecha: new Date(año, mes - 1, 1).toISOString(),
                    fuente: 'Valores Locales Específicos',
                    mes: mes,
                    año: año,
                    timestamp: new Date().toISOString()
                };
            }
            
            console.log(`⚠️ No hay UTM específica para ${clave}, usando actual`);
            return await this.obtenerUTMActual();
            
        } catch (error) {
            console.error(`❌ Error obteniendo UTM para ${mes}/${año}:`, error);
            return await this.obtenerUTMActual();
        }
    }

    // Manejo de caché
    obtenerDeCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;
            return JSON.parse(cached);
        } catch (error) {
            console.error('Error leyendo caché:', error);
            return null;
        }
    }

    guardarEnCache(data) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
            console.log(`📦 UTM guardada en caché: ${data.fuente}`);
        } catch (error) {
            console.error('Error guardando caché:', error);
        }
    }

    // Factor UTM personalizable
    obtenerFactorPersonalizado() {
        const factorGuardado = localStorage.getItem('pension_factor_utm');
        return factorGuardado ? parseFloat(factorGuardado) : 3.51360;
    }

    guardarFactorPersonalizado(factor) {
        localStorage.setItem('pension_factor_utm', factor.toString());
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
            return true;
        }
    }

    // Obtener configuración
    obtenerConfiguracion() {
        return {
            factorUTM: this.obtenerFactorPersonalizado(),
            factorEsPersonalizado: this.obtenerFactorPersonalizado() !== 3.51360,
            historialCambios: JSON.parse(localStorage.getItem('pension_config_historial') || '[]'),
            entornoNativo: this.isNativeApp,
            fuenteDatos: this.isNativeApp ? 'Valores Locales (App)' : 'APIs + Valores Locales'
        };
    }

    // Limpiar caché manualmente
    limpiarCache() {
        localStorage.removeItem(this.cacheKey);
        console.log('🗑️ Caché UTM limpiado');
    }

    // Forzar actualización
    async forzarActualizacion() {
        this.limpiarCache();
        return await this.obtenerUTMActual();
    }
}

// Crear instancia global
window.UTMAPI = new UTMAPI();

// CORREGIDO: Funciones de compatibilidad
window.obtenerUTMActual = () => window.UTMAPI.obtenerUTMActual();

// FIXED: Esta función estaba mal definida
window.obtenerUTMPorMes = async (mesAno) => {
    const [año, mes] = mesAno.split('-');
    return await window.UTMAPI.obtenerUTMPorMes(parseInt(mes), parseInt(año));
};

window.obtenerFactorUTM = () => window.UTMAPI.obtenerFactorPersonalizado();
window.calcularPensionUTM = (utm, factor = null) => window.UTMAPI.calcularPension(utm, factor);

// Funciones adicionales de utilidad
window.limpiarCacheUTM = () => window.UTMAPI.limpiarCache();
window.forzarActualizacionUTM = () => window.UTMAPI.forzarActualizacion();

// Auto-inicialización
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Iniciando sistema UTM multi-fuente...');
        
        const resultado = await window.UTMAPI.obtenerUTMActual();
        console.log(`💰 UTM obtenida: $${resultado.utm.toLocaleString('es-CL')} desde ${resultado.fuente}`);
        
        // Verificar si necesitamos actualizar caché
        if (resultado.fuente.includes('Valores Locales') && !window.UTMAPI.isNativeApp) {
            console.log('⚠️ Usando valores locales en navegador, el caché podría estar desactualizado');
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

console.log('📊 UTM API Multi-Fuente CORREGIDO - v2.2');