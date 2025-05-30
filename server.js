// server.js - Mi primer servidor para la app de pensión alimenticia

// Importamos las librerías que necesitamos
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración básica
const PORT = 3000;

// Función para servir archivos HTML
function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Página no encontrada</h1>');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// Creamos nuestro servidor
const server = http.createServer((req, res) => {
    console.log(`Petición recibida: ${req.method} ${req.url}`);
    
    // Configurar CORS para permitir peticiones desde cualquier origen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Routing básico - decidir qué página mostrar
    if (req.url === '/' || req.url === '/index.html') {
        // Página principal
        serveFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
    } 
    else if (req.url === '/calculadora.html') {
        // Página de la calculadora
        serveFile(res, path.join(__dirname, 'public', 'calculadora.html'), 'text/html');
    }
    else if (req.url === '/pagos.html') {
        // Página de registro de pagos
        serveFile(res, path.join(__dirname, 'public', 'pagos.html'), 'text/html');
    }
    else if (req.url === '/historial.html') {
        // Página de historial
        serveFile(res, path.join(__dirname, 'public', 'historial.html'), 'text/html');
    }
    else if (req.url.startsWith('/css/')) {
        // Servir archivos CSS
        serveFile(res, path.join(__dirname, 'public', req.url), 'text/css');
    }
    else if (req.url.startsWith('/js/')) {
        // Servir archivos JavaScript
        serveFile(res, path.join(__dirname, 'public', req.url), 'application/javascript');
    }
    else {
        // Página no encontrada
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>Página no encontrada</h1>
            <p>La página ${req.url} no existe.</p>
            <a href="/">Volver al inicio</a>
        `);
    }
});

// Iniciamos el servidor
server.listen(PORT, () => {
    console.log('🚀 ¡Servidor iniciado correctamente!');
    console.log(`📱 Tu app está corriendo en: http://localhost:${PORT}`);
    console.log('💡 Para detener el servidor, presiona Ctrl + C');
});

// Manejo de errores
server.on('error', (err) => {
    console.error('❌ Error en el servidor:', err);
});

// Mensaje de bienvenida
console.log('='.repeat(50));
console.log('📊 APP DE PENSIÓN ALIMENTICIA');
console.log('='.repeat(50));
console.log('Iniciando servidor...');