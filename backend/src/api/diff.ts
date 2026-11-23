import type { Request, Response } from 'express';
import { diffManifests } from '../scanner';

export function diffHandler(req: Request, res: Response) {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be a JSON object containing baseline and target manifests.',
    });
    return;
  }

  const baseline = body.baseline ?? body.v1 ?? body.before;
  const target = body.target ?? body.v2 ?? body.after;

  if (!baseline) {
    res.status(400).json({
      error: 'missing_baseline',
      message: 'Baseline manifest (v1) is required for comparison.',
    });
    return;
  }

  if (!target) {
    res.status(400).json({
      error: 'missing_target',
      message: 'Target manifest (v2) is required for comparison.',
    });
    return;
  }

  try {
    const diff = diffManifests(baseline, target);
    res.json(diff);
  } catch (err) {
    if (typeof err === 'string') {
      res.status(400).json({
        error: 'diff_failed',
        message: err,
      });
      return;
    }
    console.error('Diff error:', err);
    res.status(500).json({
      error: 'diff_internal_error',
      message: 'Internal error generating permission diff.',
    });
  }
}
