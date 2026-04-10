export type SiteMode = 'normal' | 'standby';

export type DomainPoolStatus = 'standby' | 'active';

export type DomainPoolRow = {
  id: string;
  hostname: string;
  status: DomainPoolStatus;
  priority: number;
  note: string | null;
  createdAt: string;
};

export type OpsSettings = {
  siteMode: SiteMode;
  lockAuto: boolean;
  lastStandbyAt: string | null;
  lastDomainSwitchAt: string | null;
  dailyDomainSwitches: number;
  dailyDomainSwitchesDate: string | null;
  cooldownUntil: string | null;
  anomalyScore: number;
  consecutiveHealthFailures: number;
};

export type AuditRow = {
  id: string;
  at: string;
  action: string;
  detail: Record<string, unknown>;
};

export type ConnectedWallet = {
  evmAddress: string | null;
  chainId: number;
  updatedAt: string | null;
};
