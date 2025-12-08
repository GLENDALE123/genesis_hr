const http = require('http');
const fs = require('fs');
const path = require('path');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.map') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function ensureInside(baseDir, targetPath) {
  const rel = path.relative(baseDir, targetPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function startStaticServer() {
  return new Promise((resolve) => {
    const outDir = path.join(__dirname, '../dist');
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(url.pathname);
        
        pathname = pathname.replace(/\//g, path.sep);
        if (pathname.startsWith(path.sep)) {
          pathname = pathname.substring(1);
        }
        
        if (pathname === '' || pathname === 'index.html') {
          pathname = 'index.html';
        }
        if (pathname.endsWith(path.sep)) {
          pathname = pathname + 'index.html';
        }
        
        let filePath = path.join(outDir, pathname);
        if (!ensureInside(outDir, filePath)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        
        fs.stat(filePath, (err, stat) => {
          const serveFile = (finalPath) => {
            fs.readFile(finalPath, (readErr, data) => {
              if (readErr) {
                res.statusCode = 404;
                res.end('Not Found');
                return;
              }
              res.setHeader('Content-Type', getContentType(finalPath));
              res.end(data);
            });
          };

          if (!err && stat.isFile()) {
            return serveFile(filePath);
          }

          if (!err && stat.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            return serveFile(indexPath);
          }

          const originalPathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
          const ext = path.extname(originalPathname).toLowerCase();
          const isStaticResource = ['.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'].includes(ext);
          
          if (isStaticResource) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }

          const rootIndex = path.join(outDir, 'index.html');
          fs.stat(rootIndex, (rootErr, rootStat) => {
            if (!rootErr && rootStat.isFile()) {
              return serveFile(rootIndex);
            }
            res.statusCode = 404;
            res.end('Not Found');
          });
        });
      } catch (e) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
    
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function isUrlReachable(targetUrl) {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const proto = u.protocol === 'https:' ? require('https') : require('http');
      const req = proto.request({
        method: 'HEAD',
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: '/',
        timeout: 1200,
      }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { try { req.destroy(); } catch {} resolve(false); });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

module.exports = {
  startStaticServer,
  isUrlReachable,
};














