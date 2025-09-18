import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import * as fontkit from "fontkit";
import fs from "node:fs";
import path from "node:path";

import { formatCurrency, formatDate } from "@/lib/format";
import { getProposalById } from "@/lib/proposal-service";

export const runtime = "nodejs";

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
  try {
    // В некоторых окружениях pdfkit не подхватывает fontkit автоматически
    // используем явную регистрацию, если метод доступен
    if (typeof (doc as any).registerFontKit === "function") {
      (doc as any).registerFontKit(fontkit);
    } else {
      (doc as any)._fontkit = fontkit;
    }
  } catch {}
  const chunks: Buffer[] = [];

	doc.on("data", (chunk) => chunks.push(chunk));
	const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Готовим AFM‑шрифты PDFKit (на случай, если TTF не подключатся)
  function ensurePdfkitAfmFiles() {
    try {
      const vendorDir = path.join(process.cwd(), ".next/server/vendor-chunks");
      const dataDir = path.join(vendorDir, "data");
      const srcDir = path.join(process.cwd(), "node_modules/pdfkit/js/data");
      if (!fs.existsSync(srcDir)) return;
      if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      ["Helvetica.afm", "Helvetica-Bold.afm", "Times-Roman.afm", "Times-Bold.afm"].forEach((name) => {
        const from = path.join(srcDir, name);
        const to = path.join(dataDir, name);
        if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
      });
    } catch {}
  }

  // Выбираем TTF‑шрифты с поддержкой кириллицы (DejaVu или Inter)
  const candidates = [
    { normal: "public/fonts/DejaVuSans.ttf", bold: "public/fonts/DejaVuSans-Bold.ttf", family: "DejaVu" },
    { normal: "public/fonts/Inter-Regular.ttf", bold: "public/fonts/Inter-Bold.ttf", family: "Inter" },
  ];
  let FONT_NORMAL = "";
  let FONT_BOLD = "";
  let FONT_NORMAL_PATH: string | null = null;
  let FONT_BOLD_PATH: string | null = null;
  for (const c of candidates) {
    const normalAbs = path.join(process.cwd(), c.normal);
    const boldAbs = path.join(process.cwd(), c.bold);
    try {
      if (fs.existsSync(normalAbs)) FONT_NORMAL_PATH = normalAbs;
      if (fs.existsSync(boldAbs)) FONT_BOLD_PATH = boldAbs;
      if (FONT_NORMAL_PATH && !FONT_NORMAL) FONT_NORMAL = c.family;
      if (FONT_BOLD_PATH && !FONT_BOLD) FONT_BOLD = `${c.family}-Bold`;
      if (FONT_NORMAL) break; // уже выбрали семейство
    } catch {
      // пробуем следующего кандидата
    }
  }

  // если TTF не нашлись, используем встроенные AFM (скопируем их для Next.js)
  if (!FONT_NORMAL) {
    ensurePdfkitAfmFiles();
    FONT_NORMAL = "Helvetica";
    FONT_BOLD = "Helvetica-Bold";
  }

  function setFontNormal() {
    try {
      if (FONT_NORMAL_PATH) return void doc.font(FONT_NORMAL_PATH);
      if (FONT_NORMAL) return void doc.font(FONT_NORMAL);
    } catch {}
    doc.font("Helvetica");
  }

  function setFontBold() {
    try {
      if (FONT_BOLD_PATH) return void doc.font(FONT_BOLD_PATH);
      if (FONT_BOLD) return void doc.font(FONT_BOLD);
    } catch {}
    doc.font("Helvetica-Bold");
  }

  async function tryDrawImage(url?: string | null) {
		if (!url) return;
		try {
      let buffer: Buffer | null = null;

      // Локальные файлы из /public читаем напрямую с диска
      if (url.startsWith("/")) {
        const localPath = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
        if (fs.existsSync(localPath)) {
          buffer = await fs.promises.readFile(localPath);
        }
      } else if (url.startsWith("http://") || url.startsWith("https://")) {
        const res = await fetch(url);
        if (!res.ok) return;
        buffer = Buffer.from(await res.arrayBuffer());
      }

      if (!buffer) return;
			doc.image(buffer, doc.page.margins.left, doc.y, { width: pageWidth });
			doc.moveDown();
		} catch {
			// игнорируем ошибки загрузки изображения
		}
	}

	// Обложка во всю ширину (если указана)
	// Рисуем прямо в начале документа
	await tryDrawImage(proposal.coverImageUrl ?? undefined);

  setFontBold();
  doc.fontSize(20).text(proposal.title, { align: "left" });
	doc.moveDown(0.5);

  doc.fontSize(12);
  setFontNormal();
	doc.text(`Номер КП: ${proposal.proposalNumber}`);
	doc.text(`Дата: ${formatDate(proposal.createdAt) ?? ""}`);
	if (proposal.validUntil) {
		doc.text(`Действительно до: ${formatDate(proposal.validUntil)}`);
	}

	doc.moveDown();

	if (proposal.clientName || proposal.companyName) {
    setFontBold();
    doc.text("Клиент:");
    setFontNormal();
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
    setFontBold();
    doc.text("Краткое описание");
    setFontNormal();
    doc.text(proposal.summary);
		doc.moveDown();
	}

	const tableTop = doc.y;
	const leftEdge = 48;
	const qtyX = 330;
	const priceX = 400;
	const totalX = 490;

  setFontBold();
	doc.text("Позиция", leftEdge, tableTop, { width: qtyX - leftEdge - 8 });
	doc.text("Кол-во", qtyX, tableTop);
	doc.text("Цена", priceX, tableTop);
	doc.text("Сумма", totalX, tableTop);
	doc.moveDown();

  setFontNormal();
	let subtotalCents = 0;

  proposal.items.forEach((item, index) => {
    const startY = doc.y;
    const nameColWidth = qtyX - leftEdge - 8;

    const itemTotal = item.quantity * item.unitPriceCents;
    subtotalCents += itemTotal;

    // рассчёт высот
    setFontBold();
    doc.fontSize(12);
    const nameHeight = doc.heightOfString(`${index + 1}. ${item.name}`, {
      width: nameColWidth,
    });
    let descHeight = 0;
    if (item.description) {
      doc.fontSize(10);
      descHeight = doc.heightOfString(item.description, { width: nameColWidth - 12 });
    }
    const rowHeight = nameHeight + (descHeight ? descHeight + 2 : 0);

    // числовые колонки
    setFontNormal();
    doc.fontSize(12).fillColor("#000000");
    doc.text(String(item.quantity), qtyX, startY);
    doc.text(formatCurrency(item.unitPriceCents), priceX, startY);
    doc.text(formatCurrency(itemTotal), totalX, startY);

    // левая колонка
    setFontBold();
    doc.fontSize(12).fillColor("#000000").text(`${index + 1}. ${item.name}`, leftEdge, startY, {
      width: nameColWidth,
    });
    if (item.description) {
      doc.fontSize(10).fillColor("#444444").text(item.description, leftEdge + 12, startY + nameHeight + 2, {
        width: nameColWidth - 12,
      });
    }

    doc.y = startY + rowHeight + 6;
  });

	doc.moveDown();
  setFontBold();
  doc.text(`Итого: ${formatCurrency(subtotalCents)}`, totalX - 40, doc.y);

	// Изображение перед блоком "Дополнительные условия"
	await tryDrawImage(proposal.preNotesImageUrl ?? undefined);

	if (proposal.notes) {
		doc.moveDown();
    setFontBold();
    doc.text("Дополнительные условия");
    setFontNormal();
    doc.text(proposal.notes);
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
