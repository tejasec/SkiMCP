import type { Request, Response } from 'express';

export function healthHandler(_req: Request, res: Response) {
  res.json({
    ok: true,
    service: 'scourmcp',
    timestamp: new Date().toISOString(),
  });
}
