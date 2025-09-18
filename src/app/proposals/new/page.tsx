import { CreateProposalForm } from "@/components/create-proposal-form";

export default function NewProposalPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Новое коммерческое предложение</h1>
        <p className="text-sm text-slate-600">
          Заполните данные клиента, добавьте позиции и отправьте ссылку на результат.
        </p>
      </div>
      <CreateProposalForm />
    </div>
  );
}
