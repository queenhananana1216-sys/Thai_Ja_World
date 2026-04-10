import 'server-only';
import { vercelFetch } from './client';

export type VercelDomainInfo = {
  name: string;
  verified?: boolean;
};

export async function listProjectDomains(projectId: string): Promise<VercelDomainInfo[]> {
  type Resp = { domains?: Array<{ name: string; verified?: boolean }> };
  const data = await vercelFetch<Resp>(`/v9/projects/${encodeURIComponent(projectId)}/domains`);
  return (data.domains ?? []).map((d) => ({ name: d.name, verified: d.verified }));
}

/** 프로젝트에 커스텀 도메인 연결 (이미 계정/팀에 추가·검증된 도메인이어야 함) */
export async function addProjectDomain(projectId: string, hostname: string): Promise<{ name: string }> {
  const host = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] ?? '';
  if (!host) throw new Error('invalid hostname');
  type Resp = { name?: string };
  const data = await vercelFetch<Resp>(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
    method: 'POST',
    body: { name: host },
  });
  return { name: data.name ?? host };
}

export async function removeProjectDomain(projectId: string, hostname: string): Promise<void> {
  const host = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] ?? '';
  await vercelFetch<unknown>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(host)}`,
    { method: 'DELETE' },
  );
}
