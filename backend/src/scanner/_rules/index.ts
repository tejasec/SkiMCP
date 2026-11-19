import type { ScanRule } from '../types';
import { checkShellExecution } from './shellExecution';
import { checkFileSystemAccess } from './fileSystemAccess';
import { checkNetworkEgress } from './networkEgress';
import { checkCredentialExposure } from './credentialExposure';
import { checkPromptInjection } from './promptInjection';
import { checkVagueDescription } from './vagueDescription';
import { checkOverPermission } from './overPermission';

/** All scanning rules, in priority order. */
export const allRules: ScanRule[] = [
  checkPromptInjection,
  checkShellExecution,
  checkCredentialExposure,
  checkFileSystemAccess,
  checkNetworkEgress,
  checkOverPermission,
  checkVagueDescription,
];
