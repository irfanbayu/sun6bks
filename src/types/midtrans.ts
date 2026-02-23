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
  eventId: number;
  categoryId: number;
  eventTitle: string;
  quantity: number;
  pricePerTicket: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  clerkUserId?: string;
};

export type SnapTokenResponse = {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  orderId?: string;
  error?: string;
};
