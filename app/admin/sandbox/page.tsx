import { createServiceRoleClient } from '@/lib/supabase/admin';
import SandboxDashboardClient, {
  type ActiveScriptLite,
  type SandboxProposalRow,
} from './SandboxDashboardClient';
import ShopItemProposalsClient, { type ShopItemProposalRow } from './ShopItemProposalsClient';

export default async function AdminSandboxPage() {
  const admin = createServiceRoleClient();

  const [propRes, actRes, shopRes] = await Promise.all([
    admin.from('sandbox_script_proposals').select('*').order('created_at', { ascending: false }).limit(100),
    admin
      .from('active_scripts')
      .select('slug,title,enabled,last_run_at,last_run_ok,proposal_id')
      .order('updated_at', { ascending: false }),
    admin
      .from('salja_shop_item_proposals')
      .select(
        'id,created_at,status,source,item_key,category,label_ko,label_th,price_points,rental_days,rental_price,svg_markup,css_snippet',
      )
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  const proposals = (propRes.data ?? []) as SandboxProposalRow[];
  const activeScripts = (actRes.data ?? []) as ActiveScriptLite[];
  const shopProposals = (shopRes.error ? [] : (shopRes.data ?? [])) as ShopItemProposalRow[];

  return (
    <div className="admin-page admin-page--sandbox space-y-12">
      <SandboxDashboardClient proposals={proposals} activeScripts={activeScripts} />
      <ShopItemProposalsClient proposals={shopProposals} />
    </div>
  );
}
