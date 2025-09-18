import { NextRequest } from "next/server";

import {
  CreateProposalInput,
  createProposal,
  listProposals,
} from "@/lib/proposal-service";

type RawProposalItem = {
  name?: unknown;
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
};

type RawProposalPayload = {
  title?: unknown;
  proposalNumber?: unknown;
  clientName?: unknown;
  clientEmail?: unknown;
  companyName?: unknown;
  summary?: unknown;
  notes?: unknown;
  validUntil?: unknown;
  items?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseItems(value: unknown): CreateProposalInput["items"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((rawItem: unknown, index) => {
    const item = (rawItem ?? {}) as RawProposalItem;
    const quantity = Number(item.quantity ?? 1);
    const price = Number(item.unitPrice ?? 0);

    return {
      name: String(item.name ?? ""),
      description: item.description ? String(item.description) : null,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      unitPriceCents: Math.round((Number.isFinite(price) ? price : 0) * 100),
      position: index,
    };
  });
}

function parseBody(body: unknown): CreateProposalInput {
  if (!isRecord(body)) {
    throw new Error("Некорректные данные запроса");
  }

  const data = body as RawProposalPayload;
  const title = typeof data.title === "string" ? data.title.trim() : "";

  if (!title) {
    throw new Error("Укажите название коммерческого предложения");
  }

  const validUntil =
    typeof data.validUntil === "string" || data.validUntil instanceof Date
      ? new Date(data.validUntil)
      : null;

  return {
    title,
    proposalNumber:
      typeof data.proposalNumber === "string" ? data.proposalNumber.trim() || undefined : undefined,
    clientName: typeof data.clientName === "string" ? data.clientName : undefined,
    clientEmail: typeof data.clientEmail === "string" ? data.clientEmail : undefined,
    companyName: typeof data.companyName === "string" ? data.companyName : undefined,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    validUntil: validUntil && !Number.isNaN(validUntil.getTime()) ? validUntil : undefined,
    items: parseItems(data.items),
  };
}

export async function GET() {
  const proposals = await listProposals();
  return Response.json({ proposals });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = parseBody(body);
    const proposal = await createProposal(input);
    return Response.json({ proposal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать предложение";
    return Response.json({ error: message }, { status: 400 });
  }
}
