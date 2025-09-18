import Link from "next/link";

import { formatCurrency, formatDate } from "@/lib/format";
import { calculateTotals, listProposals } from "@/lib/proposal-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const proposals = await listProposals();

  if (proposals.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Создайте своё первое коммерческое предложение
        </h1>
        <p className="mt-4 text-sm text-slate-600">
          Отправляйте клиентам красивые ссылки, отслеживайте просмотры и выгружайте PDF.
        </p>
        <Link
          href="/proposals/new"
          className="mt-6 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Новое КП
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Коммерческие предложения</h1>
          <p className="text-sm text-slate-600">
            Всего {proposals.length} · Обновлено {formatDate(new Date())}
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + Новое КП
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">Название</th>
              <th className="px-6 py-4">Создано</th>
              <th className="px-6 py-4">Просмотры</th>
              <th className="px-6 py-4 text-right">Сумма</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {proposals.map((proposal) => {
              const totals = calculateTotals(proposal);
              return (
                <tr key={proposal.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{proposal.title}</div>
                    <div className="text-xs text-slate-500">{proposal.proposalNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{formatDate(proposal.createdAt)}</td>
                  <td className="px-6 py-4 text-sm">{proposal._count.views}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(totals.subtotalCents)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
