import { getProposalById } from "@/lib/proposal-service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const proposalId = params?.id;

  if (!proposalId) {
    return Response.json({ error: "Не указан идентификатор предложения" }, { status: 400 });
  }

  const proposal = await getProposalById(proposalId);
  if (!proposal) {
    return Response.json({ error: "Предложение не найдено" }, { status: 404 });
  }
  return Response.json({ proposal });
}
