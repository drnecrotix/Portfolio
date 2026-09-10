import type { HealthCheck } from './types';

export function scoreHealthChecks(checks: HealthCheck[]) {
    const graded = checks.filter((check) => check.status !== 'info');
    if (!graded.length) return 0;
    const points = graded.reduce((total, check) => total + (check.status === 'pass' ? 2 : check.status === 'warning' ? 1 : 0), 0);
    return Math.round((points / (graded.length * 2)) * 100);
}
