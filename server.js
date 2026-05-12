/**
 * LABFLOW - Servidor local de desarrollo
 * 
 * Ejecuta este script para servir la aplicacion en http://localhost:8080
 * Los modulos ES6 requieren un servidor HTTP; no funcionan con file://
 * 
 * Uso:
 *   node server.js
 *   o
 *   npm start
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
    // Security: prevent directory traversal
    let filePath = path.join(ROOT, decodeURIComponent(req.url));
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(ROOT);
    
    if (!resolvedPath.startsWith(resolvedRoot)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Default to index.html for directory requests
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('\n=================================');
    console.log('  LABFLOW servidor iniciado');
    console.log(`  URL: http://localhost:${PORT}`);
    console.log('=================================\n');
    console.log('Presiona Ctrl+C para detener.\n');
});
