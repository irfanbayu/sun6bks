import { jsPDF } from "jspdf";

export type InvoiceData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paidAt: string | null;
  amount: number;
  quantity: number;
  event: {
    title: string;
    date: string;
    timeLabel: string;
    venue: string;
  } | null;
  category: {
    name: string;
    price: number;
  } | null;
  tickets: { ticket_code: string; status: string }[];
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const generateInvoicePdf = (data: InvoiceData): Buffer => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- Header ---
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin, y);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SUN 6 BKS", pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`#${data.orderId}`, margin, y);
  doc.text("Standupindo Bekasi", pageWidth - margin, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // --- Divider ---
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);

  // --- Customer & Date ---
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("DITAGIHKAN KEPADA", margin, y);
  doc.text("TANGGAL PEMBAYARAN", pageWidth / 2 + 10, y);
  doc.setTextColor(0, 0, 0);

  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    data.paidAt ? formatDateTime(data.paidAt) : "-",
    pageWidth / 2 + 10,
    y
  );

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(data.customerEmail, margin, y);

  y += 5;
  doc.text(data.customerPhone, margin, y);

  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("STATUS: LUNAS", pageWidth / 2 + 10, y);
  doc.setTextColor(0, 0, 0);

  // --- Event Details ---
  y += 12;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");

  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("EVENT", margin + 4, y);
  doc.setTextColor(0, 0, 0);

  y += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const eventTitle = data.event?.title ?? "Event";
  doc.text(eventTitle, margin + 4, y);
  doc.setFont("helvetica", "normal");

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const eventInfo = [
    data.event?.date ? formatDate(data.event.date) : "",
    data.event?.timeLabel ?? "",
    data.event?.venue ?? "",
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.text(eventInfo, margin + 4, y);
  doc.setTextColor(0, 0, 0);

  // --- Items Table ---
  y += 16;

  doc.setFillColor(40, 40, 40);
  doc.roundedRect(margin, y, contentWidth, 8, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ITEM", margin + 4, y + 5.5);
  doc.text("QTY", pageWidth / 2, y + 5.5, { align: "center" });
  doc.text("HARGA", pageWidth - margin - 40, y + 5.5, { align: "right" });
  doc.text("SUBTOTAL", pageWidth - margin - 4, y + 5.5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Tiket ${data.category?.name ?? "-"}`, margin + 4, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(eventTitle, margin + 4, y + 9);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.text(String(data.quantity), pageWidth / 2, y + 6, { align: "center" });

  const pricePerTicket = data.category?.price ?? 0;
  doc.text(formatCurrency(pricePerTicket), pageWidth - margin - 40, y + 6, {
    align: "right",
  });
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.amount), pageWidth - margin - 4, y + 6, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");

  // --- Divider ---
  y += 18;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);

  // --- Total ---
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal", pageWidth - margin - 60, y);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(data.amount), pageWidth - margin - 4, y, {
    align: "right",
  });

  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);

  y += 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", pageWidth - margin - 60, y);
  doc.text(formatCurrency(data.amount), pageWidth - margin - 4, y, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");

  // --- Ticket Codes ---
  if (data.tickets.length > 0) {
    y += 14;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);

    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("KODE TIKET", margin, y);
    doc.setTextColor(0, 0, 0);

    y += 6;
    doc.setFontSize(10);
    doc.setFont("courier", "bold");

    for (const ticket of data.tickets) {
      doc.text(`${ticket.ticket_code}  (${ticket.status})`, margin + 4, y);
      y += 6;
    }

    doc.setFont("helvetica", "normal");
  }

  // --- Footer ---
  y += 12;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Terima kasih telah membeli tiket di SUN 6 BKS!",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 4;
  doc.text(
    "Dokumen ini merupakan bukti pembayaran yang sah.",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
};
