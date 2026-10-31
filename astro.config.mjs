import { defineConfig } from 'astro/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]'
]);

const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB max payload
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function isLocalhostRequest(req) {
  const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
  if (!ALLOWED_LOCAL_HOSTS.has(hostHeader)) return false;

  const origin = req.headers.origin;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (!ALLOWED_LOCAL_HOSTS.has(originUrl.hostname.toLowerCase())) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

function readBoundedBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let totalBytes = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy();
        reject(new Error('Payload melampaui batas maksimum keamanan (8 MB).'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function localCmsStoragePlugin() {
  return {
    name: 'local-cms-storage-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__admin_api/')) {
          return next();
        }

        // 1. Blokir akses dari luar localhost
        if (!isLocalhostRequest(req)) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Forbidden: Localhost access only' }));
          return;
        }

        if (req.url === '/__admin_api/ping' && req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, mode: 'local-dev' }));
          return;
        }

        // 2. Wajibkan custom anti-CSRF header pada operasi tulis (POST)
        if (req.method === 'POST' && req.headers['x-cms-request'] !== 'nurul-admin-v1') {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Forbidden: Missing anti-CSRF header' }));
          return;
        }

        if (req.url === '/__admin_api/save' && req.method === 'POST') {
          try {
            const body = await readBoundedBody(req);
            const parsed = JSON.parse(body);
            if (!parsed || typeof parsed !== 'object' || !parsed.personal) {
              throw new Error('Struktur JSON konten tidak valid');
            }
            const formatted = JSON.stringify(parsed, null, 2) + '\n';

            const srcJsonPath = path.resolve(process.cwd(), 'src/data/portfolioContent.json');
            const pubJsonPath = path.resolve(process.cwd(), 'public/data/portfolioContent.json');

            await fs.mkdir(path.dirname(srcJsonPath), { recursive: true });
            await fs.mkdir(path.dirname(pubJsonPath), { recursive: true });
            await fs.writeFile(srcJsonPath, formatted, 'utf-8');
            await fs.writeFile(pubJsonPath, formatted, 'utf-8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
          }
          return;
        }

        if (req.url === '/__admin_api/upload' && req.method === 'POST') {
          try {
            const body = await readBoundedBody(req);
            const { filename, base64Data, folder = 'landing_page_assets/gallery' } = JSON.parse(body);
            if (!filename || !base64Data) {
              throw new Error('Filename dan base64Data wajib diisi');
            }

            // 3. Sanitasi nama file & batasi ekstensi
            const safeName = path
              .basename(String(filename))
              .replace(/[^a-zA-Z0-9._-]/g, '-')
              .toLowerCase();
            const ext = path.extname(safeName);
            if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
              throw new Error('Ekstensi file tidak diizinkan. Gunakan .jpg, .jpeg, .png, atau .webp');
            }

            // 4. Sanitasi folder tujuan terhadap Path Traversal
            const safeFolder = String(folder)
              .replace(/\.\./g, '')
              .replace(/^\/+/, '')
              .replace(/[^a-zA-Z0-9/_-]/g, '');

            const publicRoot = path.resolve(process.cwd(), 'public');
            const targetDir = path.resolve(publicRoot, safeFolder);
            if (!targetDir.startsWith(publicRoot)) {
              throw new Error('Lokasi direktori upload tidak diizinkan');
            }

            await fs.mkdir(targetDir, { recursive: true });
            const base64Clean = String(base64Data).replace(/^data:image\/(png|jpeg|jpg|webp);base64,/i, '');
            const fileBuffer = Buffer.from(base64Clean, 'base64');

            const targetFile = path.join(targetDir, safeName);
            await fs.writeFile(targetFile, fileBuffer);

            const relativePath = `${safeFolder}/${safeName}`.replace(/\/+/g, '/');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: relativePath }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
          }
          return;
        }

        next();
      });
    }
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://ngaeninurul74-cell.github.io',
  base: '/portofolio-nurul-ngaeni',
  vite: {
    plugins: [localCmsStoragePlugin()]
  }
});

