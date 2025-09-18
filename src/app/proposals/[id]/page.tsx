import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/copy-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { calculateTotals, getProposalById } from "@/lib/proposal-service";

export default async function ProposalDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const proposalId = resolvedParams?.id;

  if (!proposalId) {
    notFound();
  }

  const proposal = await getProposalById(proposalId);

  if (!proposal) {
    notFound();
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const shareUrl = host
    ? `${protocol}://${host}/p/${proposal.shareToken}`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/p/${proposal.shareToken}`;

  const totals = calculateTotals(proposal);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">{proposal.title}</h1>
          <p className="text-sm text-slate-600">КП № {proposal.proposalNumber}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Создано: {formatDate(proposal.createdAt)}</span>
            {proposal.validUntil && <span>Действительно до: {formatDate(proposal.validUntil)}</span>}
            <span>Просмотры: {proposal._count.views}</span>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:w-56">
          <a
            href={`/api/proposals/${proposal.id}/pdf`}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            Скачать PDF
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Назад к списку
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ссылка для клиента</h2>
        <p className="mt-2 text-sm text-slate-600">Отправьте её клиенту для ознакомления и скачивания PDF.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {shareUrl}
          </div>
          <CopyButton value={shareUrl} label="Скопировать ссылку" />
        </div>
      </section>

      <section className="space-y-6">
        {proposal.coverImageUrl && (
          <div className="overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proposal.coverImageUrl} alt="Обложка" className="h-auto w-full object-cover" />
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Информация о клиенте</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Имя контакта</dt>
              <dd className="text-sm text-slate-700">{proposal.clientName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="text-sm text-slate-700">{proposal.clientEmail || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Компания</dt>
              <dd className="text-sm text-slate-700">{proposal.companyName || "—"}</dd>
            </div>
          </dl>
        </div>

        {proposal.summary && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Краткое описание</h2>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{proposal.summary}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Позиция</th>
                <th className="px-6 py-4">Кол-во</th>
                <th className="px-6 py-4">Цена</th>
                <th className="px-6 py-4 text-right">Сумма</th>
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
                    <td className="px-6 py-4">{item.quantity}</td>
                    <td className="px-6 py-4">{formatCurrency(item.unitPriceCents)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-right">
            <div className="text-sm text-slate-500">Итого</div>
            <div className="text-2xl font-semibold text-slate-900">
              {formatCurrency(totals.subtotalCents)}
            </div>
          </div>
        </div>

        {proposal.preNotesImageUrl && (
          <div className="overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proposal.preNotesImageUrl} alt="Изображение перед условиями" className="h-auto w-full object-cover" />
          </div>
        )}

        {proposal.notes && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Дополнительные условия</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{proposal.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}
