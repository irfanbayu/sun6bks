import { NextRequest, NextResponse } from "next/server";
import { getTransactionWithDetails } from "@/db/queries";

type Params = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const transaction = await getTransactionWithDetails(orderId);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Return transaction details (excluding sensitive data)
    return NextResponse.json({
      success: true,
      data: {
        orderId: transaction.order_id,
        status: transaction.transaction_status,
        paymentType: transaction.payment_type,
        grossAmount: transaction.gross_amount,
        quantity: transaction.quantity,
        transactionTime: transaction.transaction_time,
        settlementTime: transaction.settlement_time,
        event: {
          id: transaction.event?.id,
          title: transaction.event?.title,
          date: transaction.event?.event_date,
          time: transaction.event?.event_time,
          venue: transaction.event?.venue?.name,
        },
        customer: {
          name: transaction.customer?.name,
          email: transaction.customer?.email,
        },
      },
    });
  } catch (error) {
    console.error("[Transaction Status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

