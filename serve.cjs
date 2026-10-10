const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const port = Number(process.env.PORT || 3210);
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/fixed/': ['fixed/index.html', 'text/html; charset=utf-8'],
  '/fixed/index.html': ['fixed/index.html', 'text/html; charset=utf-8'],
  '/bundle.js': ['bundle.js', 'text/javascript; charset=utf-8'],
  '/fixed/bundle.js': ['fixed/bundle.js', 'text/javascript; charset=utf-8'],
};

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/fixed') {
    response.writeHead(302, { Location: '/fixed/' }).end();
    return;
  }
  const file = files[pathname];
  if (!file) {
    response.writeHead(404).end('Not found');
    return;
  }
  fs.readFile(path.join(__dirname, 'dist', file[0]), (error, contents) => {
    if (error) {
      response.writeHead(500).end('Run npm run build first.');
      return;
    }
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(contents);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Original: http://127.0.0.1:${port}/`);
  console.log(`Proposed fix: http://127.0.0.1:${port}/fixed/`);
  console.log('Run the same two-button sequence on each page.');
});
