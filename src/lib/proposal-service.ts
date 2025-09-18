import crypto from "node:crypto";
import { Prisma, Proposal } from "@prisma/client";

import prisma from "@/lib/prisma";

export type ProposalItemInput = {
  name: string;
  description?: string | null;
  quantity: number;
  unitPriceCents: number;
  position: number;
};

export type CreateProposalInput = {
  title: string;
  proposalNumber?: string;
  clientName?: string | null;
  clientEmail?: string | null;
  companyName?: string | null;
  summary?: string | null;
  notes?: string | null;
  validUntil?: Date | null;
  items: ProposalItemInput[];
};

const SHARE_TOKEN_LENGTH = 12;

function generateShareToken(): string {
  const raw = crypto.randomBytes(18).toString("base64url");
  return raw.slice(0, SHARE_TOKEN_LENGTH);
}

async function generateUniqueShareToken(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateShareToken();
    const existing = await prisma.proposal.findUnique({ where: { shareToken: token } });
    if (!existing) {
      return token;
    }
  }

  return crypto.randomUUID().replace(/-/g, "").slice(0, SHARE_TOKEN_LENGTH);
}

async function generateProposalNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const candidate = `KP-${year}-${suffix}`;
    const existing = await prisma.proposal.findUnique({ where: { proposalNumber: candidate } });
    if (!existing) {
      return candidate;
    }
  }

  return `KP-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function sanitizeItems(items: ProposalItemInput[]): ProposalItemInput[] {
  return items
    .filter((item) => item.name.trim().length > 0)
    .map((item, index) => ({
      name: item.name.trim(),
      description: item.description?.trim() ?? null,
      quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? Math.round(item.quantity) : 1,
      unitPriceCents:
        Number.isFinite(item.unitPriceCents) && item.unitPriceCents >= 0
          ? Math.round(item.unitPriceCents)
          : 0,
      position: index,
    }));
}

export async function createProposal(input: CreateProposalInput) {
  const items = sanitizeItems(input.items);

  if (items.length === 0) {
    throw new Error("Необходимо добавить хотя бы одну позицию");
  }

  const shareToken = await generateUniqueShareToken();
  const proposalNumber = input.proposalNumber ?? (await generateProposalNumber());

  try {
    return await prisma.proposal.create({
      data: {
        title: input.title.trim(),
        proposalNumber,
        clientName: input.clientName?.trim() || null,
        clientEmail: input.clientEmail?.trim() || null,
        companyName: input.companyName?.trim() || null,
        summary: input.summary?.trim() || null,
        notes: input.notes?.trim() || null,
        validUntil: input.validUntil ?? null,
        shareToken,
        items: {
          create: items.map((item) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position: item.position,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta?.target.join("_")
        : (error.meta?.target as string | undefined);

      if (target?.includes("proposalNumber")) {
        return createProposal({ ...input, proposalNumber: await generateProposalNumber() });
      }
      if (target?.includes("shareToken")) {
        return createProposal({ ...input, items });
      }
    }
    throw error;
  }
}

export async function listProposals() {
  return prisma.proposal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { quantity: true, unitPriceCents: true } },
      _count: { select: { views: true } },
    },
  });
}

export async function getProposalById(id: string) {
  return prisma.proposal.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      _count: { select: { views: true } },
    },
  });
}

export async function getProposalByShareToken(token: string) {
  return prisma.proposal.findUnique({
    where: { shareToken: token },
    include: {
      items: { orderBy: { position: "asc" } },
    },
  });
}

export async function recordProposalView(options: {
  proposalId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const { proposalId, userAgent, ipAddress } = options;
  await prisma.proposalView.create({
    data: {
      proposalId,
      userAgent: userAgent?.slice(0, 255) ?? null,
      ipAddress: ipAddress?.slice(0, 64) ?? null,
    },
  });
}

export function calculateTotals(proposal: Proposal & { items: { quantity: number; unitPriceCents: number }[] }) {
  const subtotalCents = proposal.items.reduce((acc, item) => acc + item.quantity * item.unitPriceCents, 0);
  return {
    subtotalCents,
  };
}
