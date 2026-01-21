// Midtrans Snap Type Definitions

export type MidtransSnapResult = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  finish_redirect_url?: string;
};

export type MidtransSnapCallbacks = {
  onSuccess?: (result: MidtransSnapResult) => void;
  onPending?: (result: MidtransSnapResult) => void;
  onError?: (result: MidtransSnapResult) => void;
  onClose?: () => void;
};

export type SnapWindow = {
  pay: (token: string, callbacks?: MidtransSnapCallbacks) => void;
};

declare global {
  interface Window {
    snap?: SnapWindow;
  }
}

export type CreateTransactionParams = {
  eventId: number | string;
  eventTitle: string;
  quantity: number;
  pricePerTicket: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export type SnapTokenResponse = {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  orderId?: string;
  error?: string;
};

// Midtrans Webhook Notification Types
export type MidtransNotificationStatus =
  | "pending"
  | "capture"
  | "settlement"
  | "deny"
  | "cancel"
  | "expire"
  | "refund"
  | "partial_refund"
  | "failure";

export type MidtransPaymentType =
  | "credit_card"
  | "bank_transfer"
  | "echannel"
  | "bca_klikpay"
  | "bca_klikbca"
  | "bri_epay"
  | "cimb_clicks"
  | "danamon_online"
  | "qris"
  | "gopay"
  | "shopeepay"
  | "cstore"
  | "akulaku"
  | "kredivo";

export type MidtransFraudStatus = "accept" | "challenge" | "deny";

export type MidtransNotification = {
  transaction_time: string;
  transaction_status: MidtransNotificationStatus;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  settlement_time?: string;
  payment_type: MidtransPaymentType;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: MidtransFraudStatus;
  currency: string;
  // Bank transfer
  va_numbers?: Array<{ va_number: string; bank: string }>;
  permata_va_number?: string;
  biller_code?: string;
  bill_key?: string;
  // Convenience store
  payment_code?: string;
  store?: string;
  // Credit card
  masked_card?: string;
  card_type?: string;
  bank?: string;
  approval_code?: string;
  // E-wallet
  issuer?: string;
  acquirer?: string;
};

// Transaction Status Response
export type TransactionStatusResponse = {
  success: boolean;
  data?: {
    orderId: string;
    status: string;
    paymentType: string | null;
    grossAmount: number;
    quantity: number;
    transactionTime: string | null;
    settlementTime: string | null;
    event: {
      id: string;
      title: string;
      date: string;
      time: string;
      venue: string;
    };
    customer: {
      name: string;
      email: string;
    };
  };
  error?: string;
};
