import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchJobById } from '../../portal/queries';
import { jobListMeta } from '../../portal/display';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { row } = await fetchJobById(id);
  if (!row) return { title: '구인 상세' };
  return { title: `${row.title} — 구인구직` };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, error } = await fetchJobById(id);
  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-700">{error}</p>
        <Link href="/portal" className="mt-4 inline-block text-blue-800 underline">
          포털로
        </Link>
      </main>
    );
  }
  if (!row) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-slate-500">
        <Link href="/portal" className="text-blue-800 underline">
          포털
        </Link>{' '}
        / 구인구직
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{row.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{jobListMeta(row, 240)}</p>
      <article className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap">{row.content}</article>
    </main>
  );
}
