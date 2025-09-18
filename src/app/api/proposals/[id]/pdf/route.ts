import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { formatCurrency, formatDate } from "@/lib/format";
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

  const doc = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  doc.font("Helvetica-Bold").fontSize(20).text(proposal.title, { align: "left" });
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica");
  doc.text(`Номер КП: ${proposal.proposalNumber}`);
  doc.text(`Дата: ${formatDate(proposal.createdAt) ?? ""}`);
  if (proposal.validUntil) {
    doc.text(`Действительно до: ${formatDate(proposal.validUntil)}`);
  }

  doc.moveDown();

  if (proposal.clientName || proposal.companyName) {
    doc.font("Helvetica-Bold").text("Клиент:");
    doc.font("Helvetica");
    if (proposal.clientName) {
      doc.text(proposal.clientName);
    }
    if (proposal.companyName) {
      doc.text(proposal.companyName);
    }
    if (proposal.clientEmail) {
      doc.text(proposal.clientEmail);
    }
    doc.moveDown();
  }

  if (proposal.summary) {
    doc.font("Helvetica-Bold").text("Краткое описание");
    doc.font("Helvetica").text(proposal.summary);
    doc.moveDown();
  }

  const tableTop = doc.y;
  const leftEdge = 48;
  const qtyX = 330;
  const priceX = 400;
  const totalX = 490;

  doc.font("Helvetica-Bold");
  doc.text("Позиция", leftEdge, tableTop, { width: qtyX - leftEdge - 8 });
  doc.text("Кол-во", qtyX, tableTop);
  doc.text("Цена", priceX, tableTop);
  doc.text("Сумма", totalX, tableTop);
  doc.moveDown();

  doc.font("Helvetica");
  let subtotalCents = 0;

  proposal.items.forEach((item, index) => {
    const rowTop = doc.y;
    const itemTotal = item.quantity * item.unitPriceCents;
    subtotalCents += itemTotal;

    doc.text(`${index + 1}. ${item.name}`, leftEdge, rowTop, {
      width: qtyX - leftEdge - 8,
    });

    if (item.description) {
      doc.fontSize(10).fillColor("#444444").text(item.description, leftEdge + 12, doc.y, {
        width: qtyX - leftEdge - 12,
      });
      doc.fontSize(12).fillColor("#000000");
    }

    doc.text(String(item.quantity), qtyX, rowTop);
    doc.text(formatCurrency(item.unitPriceCents), priceX, rowTop);
    doc.text(formatCurrency(itemTotal), totalX, rowTop);
    doc.moveDown();
  });

  doc.moveDown();
  doc.font("Helvetica-Bold").text(`Итого: ${formatCurrency(subtotalCents)}`, totalX - 40, doc.y);

  if (proposal.notes) {
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Дополнительные условия");
    doc.font("Helvetica").text(proposal.notes);
  }

  doc.end();

  return new Promise<NextResponse>((resolve) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${proposal.proposalNumber}.pdf"`,
            "Content-Length": buffer.length.toString(),
          },
        }),
      );
    });
  });
}
