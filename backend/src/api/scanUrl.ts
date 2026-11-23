import type { Request, Response } from 'express';
import { scanManifest } from '../scanner';
import { fetchLiveMcpManifest } from '../scanner/_urlFetcher';
import { runCanaryProbes } from '../scanner/_canary';

export async function scanUrlHandler(req: Request, res: Response): Promise<void> {
  const body = req.body;

  if (!body || typeof body !== 'object' || typeof body.url !== 'string') {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be a JSON object containing a valid "url" string.',
    });
    return;
  }

  const url = body.url.trim();
  if (!url) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'The "url" field cannot be empty.',
    });
    return;
  }

  const options = body.options;

  try {
    const rawManifest = await fetchLiveMcpManifest(url);
    const report = scanManifest(rawManifest, options);

    if (options?.runCanaryProbes && report.tools.length > 0) {
      try {
        const observations = await runCanaryProbes(url, report.tools);
        report.canaryObservations = observations;
      } catch (canaryErr) {
        // Canary probe errors should not fail the overall scan report
        console.warn('Canary probes encountered error:', canaryErr);
      }
    }

    res.json(report);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Differentiate SSRF and security blocks from standard fetch failures
    if (
      errorMessage.includes('SSRF Protection') ||
      errorMessage.includes('Forbidden protocol') ||
      errorMessage.includes('private or loopback')
    ) {
      res.status(400).json({
        error: 'ssrf_blocked',
        message: errorMessage,
      });
      return;
    }

    if (errorMessage.includes('Failed to parse manifest') || errorMessage.includes('Invalid URL')) {
      res.status(400).json({
        error: 'invalid_manifest',
        message: errorMessage,
      });
      return;
    }

    res.status(400).json({
      error: 'fetch_failed',
      message: errorMessage,
    });
  }
}
