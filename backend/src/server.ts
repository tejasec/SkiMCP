import app from './app';
import { env } from './config/env';

const host = process.env.HOST || '0.0.0.0';

const server = app.listen(env.port, host, () => {
  console.log(`SkiMCP listening on http://${host}:${env.port}`);
});

function handleShutdown(signal: string) {
  console.log(`[SHUTDOWN] ${signal} signal received: closing HTTP server...`);
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SHUTDOWN] Forcefully terminating due to shutdown timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

