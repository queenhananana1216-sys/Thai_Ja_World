-- taeja-auto ops store (Postgres / Neon / Vercel Postgres)

CREATE TABLE IF NOT EXISTS auto_domain_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'standby' CHECK (status IN ('standby', 'active')),
  priority int NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_ops_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_mode text NOT NULL DEFAULT 'normal' CHECK (site_mode IN ('normal', 'standby')),
  lock_auto boolean NOT NULL DEFAULT false,
  last_standby_at timestamptz,
  last_domain_switch_at timestamptz,
  daily_domain_switches int NOT NULL DEFAULT 0,
  daily_domain_switches_date date,
  cooldown_until timestamptz,
  anomaly_score int NOT NULL DEFAULT 0,
  consecutive_health_failures int NOT NULL DEFAULT 0
);

INSERT INTO auto_ops_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS auto_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS auto_audit_log_at_idx ON auto_audit_log (at DESC);

-- 관리 콘솔에서 등록한 EVM 지갑(표시·감사용). 온체인 자동결제는 운영 핫 지갑 AUTO_PAY_* 로 별도 처리.
CREATE TABLE IF NOT EXISTS auto_connected_wallet (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  evm_address text,
  chain_id int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO auto_connected_wallet (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
