/**
 * Load `.env` from the backend package root (folder above `src/`), regardless of process cwd.
 * Keep this as the first import in `server.js`.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');

const result = dotenv.config({ path: envPath });
if (result.error && result.error.code !== 'ENOENT') {
  console.warn('[env] Could not read .env file:', result.error.message);
}
