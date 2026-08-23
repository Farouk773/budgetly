import ExcelJS from "exceljs";
import { formatCents } from "@/lib/money";
import type { MonthlyReportData } from "@/lib/queries/report";

export async function buildMonthlyExcelReport(
  data: MonthlyReportData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Résumé");
  summarySheet.columns = [
    { header: "Poste", key: "label", width: 30 },
    { header: "Montant", key: "amount", width: 15 },
  ];
  summarySheet.addRows([
    { label: "Mois", amount: data.month },
    { label: "Revenus", amount: formatCents(data.budget.incomeCents) },
    { label: "Charges fixes actives", amount: formatCents(data.budget.fixedChargesCents) },
    { label: "Mensualités de prêts", amount: formatCents(data.budget.loanPaymentsCents) },
    { label: "Dépenses", amount: formatCents(data.budget.expensesCents) },
    { label: "Disponible", amount: formatCents(data.budget.availableCents) },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const incomeSheet = workbook.addWorksheet("Revenus");
  incomeSheet.columns = [
    { header: "Type", key: "type", width: 15 },
    { header: "Libellé", key: "label", width: 25 },
    { header: "Montant net", key: "amount", width: 15 },
  ];
  incomeSheet.getRow(1).font = { bold: true };
  for (const income of data.incomes) {
    incomeSheet.addRow({
      type: income.type,
      label: income.label ?? "",
      amount: formatCents(income.netAmountCents),
    });
  }

  const expenseSheet = workbook.addWorksheet("Dépenses");
  expenseSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Catégorie", key: "category", width: 20 },
    { header: "Libellé", key: "label", width: 25 },
    { header: "Montant", key: "amount", width: 15 },
  ];
  expenseSheet.getRow(1).font = { bold: true };
  for (const expense of data.expenses) {
    expenseSheet.addRow({
      date: expense.date.toISOString().slice(0, 10),
      category: expense.category.name,
      label: expense.label ?? "",
      amount: formatCents(expense.amountCents),
    });
  }

  const fixedChargeSheet = workbook.addWorksheet("Charges fixes");
  fixedChargeSheet.columns = [
    { header: "Libellé", key: "label", width: 25 },
    { header: "Catégorie", key: "category", width: 20 },
    { header: "Montant", key: "amount", width: 15 },
    { header: "Jour du mois", key: "day", width: 12 },
  ];
  fixedChargeSheet.getRow(1).font = { bold: true };
  for (const charge of data.fixedCharges) {
    fixedChargeSheet.addRow({
      label: charge.label,
      category: charge.category.name,
      amount: formatCents(charge.amountCents),
      day: charge.dayOfMonth,
    });
  }

  const loanSheet = workbook.addWorksheet("Prêts");
  loanSheet.columns = [
    { header: "Nom", key: "name", width: 25 },
    { header: "Restant dû", key: "remaining", width: 15 },
    { header: "Mensualité", key: "payment", width: 15 },
  ];
  loanSheet.getRow(1).font = { bold: true };
  for (const loan of data.loans) {
    loanSheet.addRow({
      name: loan.name,
      remaining: formatCents(loan.remainingCents),
      payment: formatCents(loan.monthlyPaymentCents),
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
