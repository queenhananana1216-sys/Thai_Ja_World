export type EffectTier = 'lite' | 'core' | 'immersive';

export type SurfaceId = 'home' | 'shop' | 'minihome' | 'community' | 'news';

export type RolloutWave = 'waveA' | 'waveB' | 'waveC';

export type GateStatus = 'pass' | 'warn' | 'fail';

export type GovernanceMetric = {
  key: string;
  label: string;
  gate: {
    pass: string;
    fail: string;
  };
};
