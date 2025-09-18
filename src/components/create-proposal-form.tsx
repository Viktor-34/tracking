"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatCurrency } from "@/lib/format";

type ProposalItemDraft = {
  name: string;
  description: string;
  quantity: number;
  unitPrice: string;
};

function createEmptyItem(): ProposalItemDraft {
  return {
    name: "",
    description: "",
    quantity: 1,
    unitPrice: "0",
  };
}

export function CreateProposalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<ProposalItemDraft[]>([createEmptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(() => {
    const cents = items.reduce((acc, item) => {
      const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
      const unitPrice = Number.parseFloat(item.unitPrice || "0");
      return acc + quantity * Math.round(unitPrice * 100);
    }, 0);
    return cents;
  }, [items]);

  const handleItemChange = <Key extends keyof ProposalItemDraft>(
    index: number,
    key: Key,
    value: ProposalItemDraft[Key],
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [key]: value };
      if (key === "quantity") {
        item.quantity = Math.max(0, Number(value) || 0);
      }
      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Пожалуйста, укажите название предложения");
      return;
    }

    const preparedItems = items
      .map((item, index) => ({
        ...item,
        name: item.name.trim(),
        description: item.description.trim(),
        quantity: item.quantity || 0,
        unitPrice: Number.parseFloat(item.unitPrice || "0"),
        position: index,
      }))
      .filter((item) => item.name.length > 0);

    if (preparedItems.length === 0) {
      setError("Добавьте хотя бы одну позицию в КП");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          clientName,
          clientEmail,
          companyName,
          summary,
          notes,
          validUntil: validUntil || null,
          items: preparedItems,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось сохранить предложение");
      }

      router.push(`/proposals/${payload.proposal.id}`);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Ошибка при сохранении";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Название предложения *</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="Например, КП для компании Х"
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Имя контакта</span>
          <input
            type="text"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Email клиента</span>
          <input
            type="email"
            value={clientEmail}
            onChange={(event) => setClientEmail(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Компания клиента</span>
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Действительно до</span>
          <input
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Краткое описание</span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Основная ценность и контекст предложения"
          />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Дополнительные условия</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Сроки, гарантии, что включено и что нет"
          />
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Позиции</h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400"
          >
            Добавить строку
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700">Название позиции *</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(event) => handleItemChange(index, "name", event.target.value)}
                      className="h-10 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700">Описание</span>
                    <textarea
                      value={item.description}
                      onChange={(event) => handleItemChange(index, "description", event.target.value)}
                      rows={2}
                      className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      placeholder="Краткие детали позиции"
                    />
                  </label>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="rounded-md border border-transparent p-2 text-xs font-medium text-slate-400 transition hover:text-red-500"
                  >
                    Удалить
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">Количество</span>
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(event) => handleItemChange(index, "quantity", Number(event.target.value))}
                    className="h-10 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">Цена за единицу</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => handleItemChange(index, "unitPrice", event.target.value)}
                    className="h-10 rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <div className="flex flex-col justify-end text-sm font-medium text-slate-700">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Сумма</span>
                  {formatCurrency(Math.round(item.quantity * Number.parseFloat(item.unitPrice || "0") * 100))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between text-base">
          <span className="text-slate-600">Итого</span>
          <span className="text-lg font-semibold text-slate-900">{formatCurrency(total)}</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Сохранение..." : "Сохранить предложение"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Отменить
          </button>
        </div>
      </section>
    </form>
  );
}
