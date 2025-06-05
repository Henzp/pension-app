// backup-system.js - Sistema de backup manual para localStorage

// EXPORTAR DATOS (Descargar backup)
function exportarDatos() {
    try {
        const pagos = localStorage.getItem('pension_pagos');
        const utmValues = localStorage.getItem('pension_utm');
        
        if (!pagos || JSON.parse(pagos).length === 0) {
            mostrarAlerta('❌ No hay datos para exportar', 'danger');
            return;
        }
        
        // Crear objeto de backup completo
        const backup = {
            version: '2.1',
            fechaBackup: new Date().toISOString(),
            dispositivo: navigator.userAgent,
            datos: {
                pagos: JSON.parse(pagos || '[]'),
                valoresUTM: JSON.parse(utmValues || '{}')
            },
            estadisticas: {
                totalPagos: JSON.parse(pagos || '[]').length,
                montoTotal: JSON.parse(pagos || '[]').reduce((total, pago) => total + (pago.monto || 0), 0)
            }
        };
        
        // Crear archivo para descarga
        const jsonString = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Crear nombre de archivo con fecha
        const fechaHoy = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `pension-backup-${fechaHoy}.json`;
        
        // Descargar archivo
        const enlaceDescarga = document.createElement('a');
        enlaceDescarga.href = url;
        enlaceDescarga.download = nombreArchivo;
        enlaceDescarga.style.display = 'none';
        document.body.appendChild(enlaceDescarga);
        enlaceDescarga.click();
        document.body.removeChild(enlaceDescarga);
        
        // Limpiar URL
        URL.revokeObjectURL(url);
        
        mostrarAlerta(`✅ Backup descargado: ${nombreArchivo}`, 'success');
        console.log('✅ Backup exportado exitosamente');
        
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        mostrarAlerta('❌ Error al exportar datos', 'danger');
    }
}

// IMPORTAR DATOS (Subir backup)
function importarDatos(event) {
    const archivo = event.target.files[0];
    
    if (!archivo) {
        return;
    }
    
    if (!archivo.name.endsWith('.json')) {
        mostrarAlerta('❌ Solo se permiten archivos .json', 'danger');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const contenido = e.target.result;
            const backup = JSON.parse(contenido);
            
            // Validar estructura del backup
            if (!validarBackup(backup)) {
                mostrarAlerta('❌ Archivo de backup inválido', 'danger');
                return;
            }
            
            // Confirmar importación
            const totalPagos = backup.datos.pagos.length;
            const confirmacion = confirm(`¿Importar ${totalPagos} pagos?\n\n⚠️ Esto reemplazará todos los datos actuales.`);
            
            if (!confirmacion) {
                return;
            }
            
            // Hacer backup de datos actuales antes de importar
            const backupActual = localStorage.getItem('pension_pagos');
            if (backupActual) {
                const fechaBackup = new Date().toISOString();
                localStorage.setItem(`pension_backup_auto_${fechaBackup}`, backupActual);
            }
            
            // Importar datos
            localStorage.setItem('pension_pagos', JSON.stringify(backup.datos.pagos));
            localStorage.setItem('pension_utm', JSON.stringify(backup.datos.valoresUTM));
            
            mostrarAlerta(`✅ Datos importados: ${totalPagos} pagos`, 'success');
            
            // Recargar página para mostrar nuevos datos
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error importando datos:', error);
            mostrarAlerta('❌ Error al leer el archivo de backup', 'danger');
        }
    };
    
    reader.readAsText(archivo);
    
    // Limpiar input
    event.target.value = '';
}

// VALIDAR ESTRUCTURA DEL BACKUP
function validarBackup(backup) {
    try {
        // Verificar estructura básica
        if (!backup || typeof backup !== 'object') {
            return false;
        }
        
        if (!backup.datos || !Array.isArray(backup.datos.pagos)) {
            return false;
        }
        
        // Verificar que los pagos tengan estructura correcta
        for (const pago of backup.datos.pagos) {
            if (!pago.id || !pago.fecha || !pago.monto) {
                return false;
            }
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

// OBTENER ESTADÍSTICAS DE DATOS
function obtenerEstadisticasBackup() {
    try {
        const pagos = JSON.parse(localStorage.getItem('pension_pagos') || '[]');
        
        if (pagos.length === 0) {
            return null;
        }
        
        const totalPagos = pagos.length;
        const montoTotal = pagos.reduce((total, pago) => total + (pago.monto || 0), 0);
        const ultimoPago = pagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        const primerPago = pagos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
        
        return {
            totalPagos,
            montoTotal,
            ultimoPago: ultimoPago ? formatearFecha(ultimoPago.fecha) : '-',
            primerPago: primerPago ? formatearFecha(primerPago.fecha) : '-',
            rangoFechas: primerPago && ultimoPago ? 
                `${formatearFecha(primerPago.fecha)} - ${formatearFecha(ultimoPago.fecha)}` : '-'
        };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
    }
}

// LIMPIAR BACKUPS AUTOMÁTICOS ANTIGUOS (mantener solo los últimos 5)
function limpiarBackupsAutomaticos() {
    try {
        const claves = Object.keys(localStorage);
        const backupsAuto = claves.filter(clave => clave.startsWith('pension_backup_auto_'));
        
        if (backupsAuto.length > 5) {
            // Ordenar por fecha y eliminar los más antiguos
            backupsAuto.sort();
            const aEliminar = backupsAuto.slice(0, backupsAuto.length - 5);
            
            aEliminar.forEach(clave => {
                localStorage.removeItem(clave);
            });
            
            console.log(`🧹 Limpieza: ${aEliminar.length} backups automáticos antiguos eliminados`);
        }
    } catch (error) {
        console.warn('⚠️ Error limpiando backups automáticos:', error);
    }
}

// FORMATEAR FECHA
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CL');
}

// FORMATEAR PESOS
function formatearPesos(cantidad) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(cantidad);
}

// MOSTRAR ALERTA (debe estar definida en app.js)
function mostrarAlerta(mensaje, tipo = 'info') {
    if (window.PensionApp && window.PensionApp.mostrarAlerta) {
        window.PensionApp.mostrarAlerta(mensaje, tipo);
    } else {
        // Fallback si no está disponible
        const alertaExistente = document.querySelector('.alert');
        if (alertaExistente) {
            alertaExistente.remove();
        }
        
        const alerta = document.createElement('div');
        alerta.className = `alert alert-${tipo}`;
        alerta.textContent = mensaje;
        alerta.style.cssText = `
            padding: 0.75rem 1rem;
            margin: 1rem 0;
            border-radius: 12px;
            background: ${tipo === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
            color: ${tipo === 'success' ? '#81c784' : '#e57373'};
            border: 1px solid ${tipo === 'success' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'};
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alerta, container.firstChild);
            
            setTimeout(() => {
                if (alerta.parentNode) {
                    alerta.remove();
                }
            }, 4000);
        } else {
            alert(mensaje);
        }
    }
}

// INICIALIZAR SISTEMA DE BACKUP
function inicializarSistemaBackup() {
    // Limpiar backups automáticos antiguos al cargar
    limpiarBackupsAutomaticos();
    
    // Actualizar estadísticas si hay un contenedor
    const statsContainer = document.getElementById('backupStats');
    if (statsContainer) {
        const stats = obtenerEstadisticasBackup();
        if (stats) {
            statsContainer.innerHTML = `
                <p><strong>Datos actuales:</strong></p>
                <p>• ${stats.totalPagos} pagos registrados</p>
                <p>• Total: ${formatearPesos(stats.montoTotal)}</p>
                <p>• Período: ${stats.rangoFechas}</p>
            `;
        } else {
            statsContainer.innerHTML = '<p>No hay datos para mostrar</p>';
        }
    }
    
    console.log('📤 Sistema de backup inicializado');
}

// Exportar funciones globalmente
window.BackupSystem = {
    exportarDatos,
    importarDatos,
    obtenerEstadisticasBackup,
    inicializarSistemaBackup
};

console.log('📦 Sistema de Backup cargado y disponible globalmente');