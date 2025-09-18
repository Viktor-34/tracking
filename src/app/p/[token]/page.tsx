import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { formatCurrency, formatDate } from "@/lib/format";
import { calculateTotals, getProposalByShareToken, recordProposalView } from "@/lib/proposal-service";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;

  if (!token) {
    notFound();
  }

  const proposal = await getProposalByShareToken(token);

  if (!proposal) {
    notFound();
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for") ?? "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;
  const userAgent = headerList.get("user-agent") ?? null;

  await recordProposalView({ proposalId: proposal.id, ipAddress, userAgent });

  const totals = calculateTotals(proposal);

  return (
    <div className="mx-auto max-w-[1140px] space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">Коммерческое предложение</p>
        <h1 className="text-3xl font-semibold text-slate-900">{proposal.title}</h1>
        <p className="text-sm text-slate-500">№ {proposal.proposalNumber}</p>
        <p className="text-xs text-slate-500">Дата: {formatDate(proposal.createdAt)}</p>
        {proposal.validUntil && (
          <p className="text-xs text-slate-500">Действительно до: {formatDate(proposal.validUntil)}</p>
        )}
      </header>

      {proposal.coverImageUrl && (
        <section className="overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proposal.coverImageUrl} alt="Обложка" className="block h-auto w-full object-cover" />
        </section>
      )}

      {(proposal.clientName || proposal.companyName) && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Для</h2>
          <div className="mt-2 text-sm text-slate-600">
            {proposal.clientName && <p>{proposal.clientName}</p>}
            {proposal.companyName && <p>{proposal.companyName}</p>}
            {proposal.clientEmail && <p className="text-xs text-slate-500">{proposal.clientEmail}</p>}
          </div>
        </section>
      )}

      {proposal.summary && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Описание</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{proposal.summary}</p>
        </section>
      )}

      {/* Единая таблица с горизонтальным скроллом на мобильных */}
      <section className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[720px] divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Позиция</th>
              <th className="px-6 py-4 whitespace-nowrap">Кол-во</th>
              <th className="px-6 py-4 whitespace-nowrap">Цена</th>
              <th className="px-6 py-4 text-right whitespace-nowrap">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {proposal.items.map((item, index) => {
              const total = item.quantity * item.unitPriceCents;
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {index + 1}. {item.name}
                    </div>
                    {item.description && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{item.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.unitPriceCents)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900 whitespace-nowrap">
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {proposal.preNotesImageUrl && (
        <section className="overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proposal.preNotesImageUrl} alt="Изображение перед условиями" className="block h-auto w-full object-cover" />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-200">Итого</p>
            <p className="text-3xl font-semibold">{formatCurrency(totals.subtotalCents)}</p>
          </div>
          <a
            href={`/api/proposals/${proposal.id}/pdf`}
            className="w-full rounded-md bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:w-auto"
          >
            Скачать PDF
          </a>
        </div>
      </section>

      {proposal.notes && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Дополнительные условия</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{proposal.notes}</p>
        </section>
      )}

      <footer className="text-center text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-600">
          Создано в сервисе КП Трекер
        </Link>
      </footer>
    </div>
  );
}
