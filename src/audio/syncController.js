import { APP_CONFIG } from '../config.js';

export function computeSyncPlan(currentTargetDelay, nextTargetDelay) {
  const delta = nextTargetDelay - currentTargetDelay;
  const strategy = Math.abs(delta) >= APP_CONFIG.largeAdjustmentThresholdSeconds ? 'resync' : 'nudge';
  return {
    delta,
    strategy,
    syncModeLabel:
      strategy === 'resync'
        ? 'Controlled resync'
        : delta > 0
          ? 'Nudging later'
          : delta < 0
            ? 'Catching up'
            : 'Steady',
  };
}
