import type { Express } from 'express';
import { healthHandler } from './health';
import { scanHandler } from './scan';
import { scanUrlHandler } from './scanUrl';
import { diffHandler } from './diff';
import { hardenHandler } from './harden';

export function registerRoutes(app: Express) {
  app.get('/api/health', healthHandler);
  app.post('/api/scan', scanHandler);
  app.post('/api/scan-url', scanUrlHandler);
  app.post('/api/diff', diffHandler);
  app.post('/api/harden', hardenHandler);
}
