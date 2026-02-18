import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateInvoicePdf, type InvoiceData } from "@/lib/invoice-pdf";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "SUN6BKS <onboarding@resend.dev>";

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

const buildInvoiceHtml = (data: InvoiceData): string => {
  const ticketRows = data.tickets
    .map(
      (t, i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-family:monospace;font-size:14px;font-weight:bold;color:#1a1a1a;">
          Tiket #${i + 1}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-family:monospace;font-size:14px;font-weight:bold;color:#D4A843;">
          ${t.ticket_code}
        </td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#D4A843;font-size:24px;font-weight:bold;">SUN 6 BKS</h1>
              <p style="margin:8px 0 0;color:#999;font-size:13px;">Standupindo Bekasi</p>
            </td>
          </tr>

          <!-- Success Badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:50px;padding:8px 24px;">
                <span style="color:#059669;font-size:14px;font-weight:600;">&#10003; Pembayaran Berhasil</span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0;color:#1a1a1a;font-size:16px;">
                Halo <strong>${data.customerName}</strong>,
              </p>
              <p style="margin:12px 0 0;color:#666;font-size:14px;line-height:1.6;">
                Terima kasih telah membeli tiket. Pembayaran Anda telah kami terima dan tiket sudah aktif. 
                Berikut detail pesanan Anda:
              </p>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:8px;border:1px solid #f0f0f0;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
                    <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br>
                    <span style="color:#1a1a1a;font-size:14px;font-family:monospace;">${data.orderId}</span>
                  </td>
                </tr>
                ${
                  data.event
                    ? `
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
                    <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Event</span><br>
                    <span style="color:#1a1a1a;font-size:14px;font-weight:600;">${data.event.title}</span><br>
                    <span style="color:#666;font-size:13px;">
                      ${formatDate(data.event.date)} &bull; ${data.event.timeLabel} &bull; ${data.event.venue}
                    </span>
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
                    <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Tiket</span><br>
                    <span style="color:#1a1a1a;font-size:14px;">
                      ${data.category?.name ?? "-"} &times; ${data.quantity}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Total Pembayaran</span><br>
                    <span style="color:#D4A843;font-size:20px;font-weight:bold;">${formatCurrency(data.amount)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ticket Codes -->
          ${
            data.tickets.length > 0
              ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <h3 style="margin:0 0 12px;color:#1a1a1a;font-size:15px;font-weight:600;">Kode Tiket Anda</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border-radius:8px;border:1px solid #f0f0f0;">
                ${ticketRows}
              </table>
              <p style="margin:12px 0 0;color:#999;font-size:12px;">
                Tunjukkan kode tiket ini saat masuk venue.
              </p>
            </td>
          </tr>`
              : ""
          }

          <!-- PDF Attachment Note -->
          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  <strong>&#128206; Invoice PDF terlampir.</strong> Simpan file terlampir sebagai bukti pembayaran yang sah.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
                Terima kasih telah membeli tiket di SUN 6 BKS!<br>
                Jika ada pertanyaan, hubungi kami melalui media sosial kami.
              </p>
              <p style="margin:16px 0 0;color:#ccc;font-size:11px;">
                &copy; ${new Date().getFullYear()} SUN 6 BKS &mdash; Standupindo Bekasi
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

type SendInvoiceEmailParams = {
  orderId: string;
  transactionId: number;
};

/**
 * Fetches full order data, generates PDF, and sends invoice email via Resend.
 * Designed to be fire-and-forget — logs errors but never throws.
 */
export const sendInvoiceEmail = async ({
  orderId,
  transactionId,
}: SendInvoiceEmailParams): Promise<void> => {
  try {
    const { data: order, error } = await supabaseAdmin
      .from("transactions")
      .select(
        `*,
        events:event_id ( title, date, time_label, venue ),
        ticket_categories:category_id ( name, price ),
        tickets ( ticket_code, status )`,
      )
      .eq("id", transactionId)
      .single();

    if (error || !order) {
      console.error(
        `[sendInvoiceEmail] Order not found for txId=${transactionId}:`,
        error,
      );
      return;
    }

    const invoiceData: InvoiceData = {
      orderId,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      paidAt: order.paid_at,
      amount: order.amount,
      quantity: order.quantity,
      event: order.events
        ? {
            title: order.events.title,
            date: order.events.date,
            timeLabel: order.events.time_label,
            venue: order.events.venue,
          }
        : null,
      category: order.ticket_categories
        ? {
            name: order.ticket_categories.name,
            price: order.ticket_categories.price,
          }
        : null,
      tickets: order.tickets ?? [],
    };

    const pdfBuffer = generateInvoicePdf(invoiceData);

    const { error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `Invoice Tiket — ${order.events?.title ?? "SUN 6 BKS"} (#${orderId})`,
      html: buildInvoiceHtml(invoiceData),
      attachments: [
        {
          filename: `invoice-${orderId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    if (emailError) {
      console.error(
        `[sendInvoiceEmail] Resend error for order ${orderId}:`,
        emailError,
      );
      return;
    }

    console.info(
      `[sendInvoiceEmail] Invoice sent to ${order.customer_email} for order ${orderId}`,
    );
  } catch (err) {
    console.error(
      `[sendInvoiceEmail] Unexpected error for order ${orderId}:`,
      err,
    );
  }
};
