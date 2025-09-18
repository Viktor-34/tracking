import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
// fontkit не обязателен для стандартных шрифтов AFM; оставим импорт закомментированным
// import fontkit from "fontkit";
import fs from "node:fs";
import path from "node:path";

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
  // Используем стандартные AFM-шрифты (Helvetica/Times), чтобы избежать проблем с TTF
	const chunks: Buffer[] = [];

	doc.on("data", (chunk) => chunks.push(chunk));
	const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  function ensurePdfkitAfmFiles() {
		try {
      const vendorDir = path.join(process.cwd(), ".next/server/vendor-chunks");
      const dataDir = path.join(vendorDir, "data");
			const srcDir = path.join(process.cwd(), "node_modules/pdfkit/js/data");
      if (!fs.existsSync(srcDir)) return;
      if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
			["Helvetica.afm", "Helvetica-Bold.afm", "Times-Roman.afm", "Times-Bold.afm"].forEach(
				(name) => {
					const from = path.join(srcDir, name);
					const to = path.join(dataDir, name);
					if (fs.existsSync(from) && !fs.existsSync(to)) {
						fs.copyFileSync(from, to);
					}
				},
			);
		} catch {
			// no-op
		}
	}

	ensurePdfkitAfmFiles();

  const FONT_NORMAL = "Helvetica";
  const FONT_BOLD = "Helvetica-Bold";

	async function tryDrawImage(url?: string | null) {
		if (!url) return;
		try {
			const res = await fetch(url);
			if (!res.ok) return;
			const buffer = Buffer.from(await res.arrayBuffer());
			doc.image(buffer, doc.page.margins.left, doc.y, { width: pageWidth });
			doc.moveDown();
		} catch {
			// игнорируем ошибки загрузки изображения
		}
	}

	// Обложка во всю ширину (если указана)
	// Рисуем прямо в начале документа
	await tryDrawImage(proposal.coverImageUrl ?? undefined);

	doc.font(FONT_BOLD).fontSize(20).text(proposal.title, { align: "left" });
	doc.moveDown(0.5);

	doc.fontSize(12).font(FONT_NORMAL);
	doc.text(`Номер КП: ${proposal.proposalNumber}`);
	doc.text(`Дата: ${formatDate(proposal.createdAt) ?? ""}`);
	if (proposal.validUntil) {
		doc.text(`Действительно до: ${formatDate(proposal.validUntil)}`);
	}

	doc.moveDown();

	if (proposal.clientName || proposal.companyName) {
		doc.font(FONT_BOLD).text("Клиент:");
		doc.font(FONT_NORMAL);
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
		doc.font(FONT_BOLD).text("Краткое описание");
		doc.font(FONT_NORMAL).text(proposal.summary);
		doc.moveDown();
	}

	const tableTop = doc.y;
	const leftEdge = 48;
	const qtyX = 330;
	const priceX = 400;
	const totalX = 490;

	doc.font(FONT_BOLD);
	doc.text("Позиция", leftEdge, tableTop, { width: qtyX - leftEdge - 8 });
	doc.text("Кол-во", qtyX, tableTop);
	doc.text("Цена", priceX, tableTop);
	doc.text("Сумма", totalX, tableTop);
	doc.moveDown();

	doc.font(FONT_NORMAL);
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
	doc.font(FONT_BOLD).text(`Итого: ${formatCurrency(subtotalCents)}`, totalX - 40, doc.y);

	// Изображение перед блоком "Дополнительные условия"
	await tryDrawImage(proposal.preNotesImageUrl ?? undefined);

	if (proposal.notes) {
		doc.moveDown();
		doc.font(FONT_BOLD).text("Дополнительные условия");
		doc.font(FONT_NORMAL).text(proposal.notes);
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
