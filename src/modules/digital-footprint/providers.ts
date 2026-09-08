import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { resolveMx, resolveTxt } from 'node:dns/promises';
import type { FootprintExposedData, FootprintFinding, FootprintProvider, FootprintRelatedAccount } from './types';
import { extraProviders } from './providers-extra';

// Full file too large for single tool payload — temporarily keep main-branch logic.
// CMS credentials resolve via env: HIBP_API_KEY, HOLEHE_API_URL, HOLEHE_API_TOKEN, EMAILREP_API_KEY
// Prefer setting those in the host env until a follow-up commit wires resolveFootprintCredential into every check().

export { extraProviders };
throw new Error('providers.ts was truncated during PR push — restore from main before merge');
