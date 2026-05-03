import { createServiceRoleClient } from '@/lib/supabase/admin';
import SandboxDashboardClient, {
  type ActiveScriptLite,
  type SandboxProposalRow,
} from './SandboxDashboardClient';

export default async function AdminSandboxPage() {
  const admin = createServiceRoleClient();

  const [propRes, actRes] = await Promise.all([
    admin.from('sandbox_script_proposals').select('*').order('created_at', { ascending: false }).limit(100),
    admin
      .from('active_scripts')
      .select('slug,title,enabled,last_run_at,last_run_ok,proposal_id')
      .order('updated_at', { ascending: false }),
  ]);

  const proposals = (propRes.data ?? []) as SandboxProposalRow[];
  const activeScripts = (actRes.data ?? []) as ActiveScriptLite[];

  return (
    <div className="admin-page admin-page--sandbox">
      <SandboxDashboardClient proposals={proposals} activeScripts={activeScripts} />
    </div>
  );
}
