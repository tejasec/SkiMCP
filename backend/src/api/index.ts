import type { Express } from 'express';
import { healthHandler } from './health';
import { scanHandler } from './scan';

export function registerRoutes(app: Express) {
  app.get('/api/health', healthHandler);
  app.post('/api/scan', scanHandler);
}
