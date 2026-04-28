import { redirect } from 'next/navigation';

export default async function CommunityWriteAliasPage() {
  redirect('/community/boards/new');
}
