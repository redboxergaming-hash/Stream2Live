import { APP_CONFIG } from '../config.js';

export function computeMeterLevel(channels, previousLevel = 0) {
  const samples = channels[0];
  if (!samples?.length) return previousLevel * APP_CONFIG.meterSmoothing;
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  return previousLevel * APP_CONFIG.meterSmoothing + peak * (1 - APP_CONFIG.meterSmoothing);
}
