import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatCents } from "@/backend/money";
import type { MonthlyReportData } from "@/backend/queries/report";
import type { Currency } from "@/backend/types";

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

// formatCents() uses U+00A0/U+202F (non-breaking spaces) which the standard
// PDF fonts' WinAnsi encoding can't represent — pdf-lib throws on encode.
function sanitizeForPdf(text: string): string {
  return text.replace(/[  ]/g, " ");
}

class PdfWriter {
  private doc: PDFDocument;
  private page!: PDFPage;
  private font!: PDFFont;
  private boldFont!: PDFFont;
  private y = PAGE_HEIGHT - MARGIN;

  private constructor(doc: PDFDocument) {
    this.doc = doc;
  }

  static async create(): Promise<PdfWriter> {
    const doc = await PDFDocument.create();
    const writer = new PdfWriter(doc);
    writer.font = await doc.embedFont(StandardFonts.Helvetica);
    writer.boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    writer.addPage();
    return writer;
  }

  private addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensureSpace(lineHeight: number) {
    if (this.y - lineHeight < MARGIN) {
      this.addPage();
    }
  }

  title(text: string) {
    this.ensureSpace(28);
    this.page.drawText(sanitizeForPdf(text), {
      x: MARGIN,
      y: this.y,
      size: 18,
      font: this.boldFont,
    });
    this.y -= 28;
  }

  heading(text: string) {
    this.ensureSpace(22);
    this.y -= 6;
    this.page.drawText(sanitizeForPdf(text), {
      x: MARGIN,
      y: this.y,
      size: 13,
      font: this.boldFont,
    });
    this.y -= 20;
  }

  line(text: string) {
    this.ensureSpace(16);
    this.page.drawText(sanitizeForPdf(text), {
      x: MARGIN,
      y: this.y,
      size: 10,
      font: this.font,
      color: rgb(0.2, 0.2, 0.2),
    });
    this.y -= 16;
  }

  async save(): Promise<Buffer> {
    const bytes = await this.doc.save();
    return Buffer.from(bytes);
  }
}

export async function buildMonthlyPdfReport(
  data: MonthlyReportData,
  currency: Currency
): Promise<Buffer> {
  const writer = await PdfWriter.create();

  writer.title(`Bilan mensuel — ${data.month}`);

  writer.heading("Résumé");
  writer.line(`Revenus : ${formatCents(data.budget.incomeCents, currency)}`);
  writer.line(`Charges fixes actives : -${formatCents(data.budget.fixedChargesCents, currency)}`);
  writer.line(`Paiements de prêts enregistrés : -${formatCents(data.budget.loanPaymentsCents, currency)}`);
  writer.line(`Dépenses : -${formatCents(data.budget.expensesCents, currency)}`);
  writer.line(`Disponible : ${formatCents(data.budget.availableCents, currency)}`);

  writer.heading("Revenus");
  if (data.incomes.length === 0) {
    writer.line("Aucun revenu enregistré ce mois-ci.");
  }
  for (const income of data.incomes) {
    writer.line(`${income.label ?? income.type} — ${formatCents(income.netAmountCents, currency)}`);
  }

  writer.heading("Dépenses");
  if (data.expenses.length === 0) {
    writer.line("Aucune dépense enregistrée ce mois-ci.");
  }
  for (const expense of data.expenses) {
    const date = expense.date.toISOString().slice(0, 10);
    writer.line(
      `${date} — ${expense.category.name} — ${expense.label ?? ""} — ${formatCents(expense.amountCents, currency)}`
    );
  }

  writer.heading("Charges fixes actives");
  if (data.fixedCharges.length === 0) {
    writer.line("Aucune charge fixe active.");
  }
  for (const charge of data.fixedCharges) {
    writer.line(
      `${charge.label} (${charge.category.name}) — ${formatCents(charge.amountCents, currency)} le ${charge.dayOfMonth} du mois`
    );
  }

  writer.heading("Prêts actifs");
  if (data.loans.length === 0) {
    writer.line("Aucun prêt actif.");
  }
  for (const loan of data.loans) {
    writer.line(
      `${loan.name} — restant dû ${formatCents(loan.remainingCents, currency)}, mensualité ${formatCents(loan.monthlyPaymentCents, currency)}`
    );
  }

  return writer.save();
}
