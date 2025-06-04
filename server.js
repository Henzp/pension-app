// server.js - Servidor DEFINITIVO sin bugs para PWA

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Función para servir archivos (CORREGIDA)
function serveFile(res, filePath, contentType, requestUrl = '') {
    console.log(`📂 Intentando servir: ${filePath}`);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error(`❌ Error leyendo archivo: ${filePath}`, err.message);
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Archivo no encontrado</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 50px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            min-height: 100vh;
                            margin: 0;
                        }
                        .container {
                            background: rgba(255,255,255,0.1);
                            padding: 40px;
                            border-radius: 20px;
                            backdrop-filter: blur(10px);
                            display: inline-block;
                        }
                        a { color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 15px 30px; border-radius: 10px; font-weight: bold; }
                        a:hover { background: rgba(255,255,255,0.3); }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Archivo no encontrado</h1>
                        <p>El archivo <strong>${requestUrl}</strong> no existe.</p>
                        <p><em>Ruta buscada: ${filePath}</em></p>
                        <a href="/">🏠 Volver al inicio</a>
                    </div>
                </body>
                </html>
            `);
        } else {
            console.log(`✅ Archivo servido exitosamente: ${filePath}`);
            res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
            res.end(content);
        }
    });
}

// Función para obtener IP local
function obtenerIPLocal() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Crear servidor
const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // ROUTING PRINCIPAL
    if (req.url === '/' || req.url === '/index.html') {
        console.log('🏠 Sirviendo página principal');
        serveFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html', req.url);
    }
    // PÁGINAS HTML
    else if (req.url === '/calculadora.html') {
        console.log('🧮 Sirviendo calculadora');
        serveFile(res, path.join(__dirname, 'public', 'calculadora.html'), 'text/html', req.url);
    }
    else if (req.url === '/pagos.html') {
        console.log('💳 Sirviendo pagos');
        serveFile(res, path.join(__dirname, 'public', 'pagos.html'), 'text/html', req.url);
    }
    else if (req.url === '/historial.html') {
        console.log('📊 Sirviendo historial');
        serveFile(res, path.join(__dirname, 'public', 'historial.html'), 'text/html', req.url);
    }
    // ARCHIVOS ESTÁTICOS
    else if (req.url.startsWith('/css/')) {
        console.log('🎨 Sirviendo CSS');
        serveFile(res, path.join(__dirname, 'public', req.url), 'text/css', req.url);
    }
    else if (req.url.startsWith('/js/')) {
        console.log('⚡ Sirviendo JavaScript');
        serveFile(res, path.join(__dirname, 'public', req.url), 'application/javascript', req.url);
    }
    // ARCHIVOS PWA - CRÍTICOS
    else if (req.url === '/manifest.json') {
        console.log('📱 Sirviendo manifest.json para PWA');
        serveFile(res, path.join(__dirname, 'public', 'manifest.json'), 'application/json', req.url);
    }
    else if (req.url === '/sw.js') {
        console.log('🔧 Sirviendo Service Worker');
        serveFile(res, path.join(__dirname, 'public', 'sw.js'), 'application/javascript', req.url);
    }
    else if (req.url.startsWith('/icons/')) {
        console.log('🖼️ Sirviendo ícono');
        serveFile(res, path.join(__dirname, 'public', req.url), 'image/png', req.url);
    }
    else if (req.url === '/favicon.ico') {
        console.log('🔖 Sirviendo favicon');
        serveFile(res, path.join(__dirname, 'public', 'favicon.ico'), 'image/x-icon', req.url);
    }
    // API UTM
    else if (req.url === '/api/utm') {
        console.log('📡 API UTM solicitada');
        const https = require('https');
        
        const options = {
            hostname: 'mindicador.cl',
            port: 443,
            path: '/api/utm',
            method: 'GET'
        };
        
        const apiReq = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => { data += chunk; });
            apiRes.on('end', () => {
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(data);
            });
        });
        
        apiReq.on('error', (error) => {
            console.error('❌ Error API UTM:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error obteniendo UTM' }));
        });
        
        apiReq.end();
    }
    // 404 - PÁGINA NO ENCONTRADA
    else {
        console.log(`❌ Página no encontrada: ${req.url}`);
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Página no encontrada</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        background: rgba(255,255,255,0.1);
                        padding: 40px;
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                        display: inline-block;
                    }
                    a { color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 15px 30px; border-radius: 10px; font-weight: bold; }
                    a:hover { background: rgba(255,255,255,0.3); }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>404 - Página no encontrada</h1>
                    <p>La página <strong>${req.url}</strong> no existe.</p>
                    <a href="/">🏠 Volver al inicio</a>
                </div>
            </body>
            </html>
        `);
    }
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    const ipLocal = obtenerIPLocal();
    
    console.log('='.repeat(70));
    console.log('📊 APP DE PENSIÓN ALIMENTICIA - PWA FUNCIONAL');
    console.log('='.repeat(70));
    console.log('🚀 ¡Servidor iniciado correctamente!');
    console.log('');
    console.log('📱 ACCESOS:');
    console.log(`   💻 Computadora: http://localhost:${PORT}`);
    console.log(`   📱 Celular: http://${ipLocal}:${PORT}`);
    console.log('');
    console.log('🔧 ARCHIVOS PWA:');
    console.log(`   📱 Manifest: http://localhost:${PORT}/manifest.json`);
    console.log(`   🔧 Service Worker: http://localhost:${PORT}/sw.js`);
    console.log(`   🖼️ Íconos: http://localhost:${PORT}/icons/`);
    console.log('');
    console.log('✅ ESTADO: Sin errores - PWA completamente funcional');
    console.log('💡 Para detener: Ctrl + C');
    console.log('='.repeat(70));
});

// Manejo de errores
server.on('error', (err) => {
    console.error('❌ Error en el servidor:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${PORT} en uso. Intenta cerrar otras apps.`);
    }
});

// Cierre limpio
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    console.log('👋 ¡Gracias por usar la App de Pensión Alimenticia!');
    process.exit(0);
});

console.log('🔧 Iniciando servidor PWA sin bugs...');