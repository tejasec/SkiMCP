import type { ScanRule } from '../types';
import { checkShellExecution } from './shellExecution';
import { checkFileSystemAccess } from './fileSystemAccess';
import { checkNetworkEgress } from './networkEgress';
import { checkCredentialExposure } from './credentialExposure';
import { checkPromptInjection } from './promptInjection';
import { checkVagueDescription } from './vagueDescription';
import { checkOverPermission } from './overPermission';
import { checkToolShadowing } from './toolShadowing';
import { checkObfuscation } from './obfuscation';
import { checkAdvisoryMatch } from './advisoryMatch';

export { checkToolShadowing } from './toolShadowing';
export { checkObfuscation } from './obfuscation';
export { checkResourcePromptInjection } from './resourcePromptInjection';
export { checkAdvisoryMatch } from './advisoryMatch';

/** All scanning rules evaluated against individual tools, in priority order. */
export const allRules: ScanRule[] = [
  checkAdvisoryMatch,
  checkPromptInjection,
  checkObfuscation,
  checkToolShadowing,
  checkShellExecution,
  checkCredentialExposure,
  checkFileSystemAccess,
  checkNetworkEgress,
  checkOverPermission,
  checkVagueDescription,
];
