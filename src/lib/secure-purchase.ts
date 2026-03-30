/**
 * Secure purchase helpers.
 * All purchase logic goes through backend edge functions.
 * The frontend NEVER creates orders, sets prices, or triggers delivery directly.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SecureCheckoutParams {
  product_id: string;
  variation_index?: number;
  quantity?: number;
  coupon_code?: string;
  /** For LZT account purchases */
  lzt_item_id?: string;
  lzt_account_id?: string;
  /** For V-Bucks purchases */
  fortnite_username?: string;
}

export interface SecureCheckoutResponse {
  orderId: string;
  requiresPix: boolean;
  /** If paid with balance, delivery info comes here */
  delivered?: boolean;
  credential?: string;
  status?: string;
  error?: string;
  /** If balance was used but not enough */
  refunded?: boolean;
}

export interface EfiPaymentResponse {
  qrcode: string;
  copiaecola: string;
  txid: string;
  orderId: string;
}

/**
 * Step 1: Call secure-checkout to create order server-side.
 * The backend validates prices, stock, coupons, and decides payment method.
 */
export async function secureCheckout(params: SecureCheckoutParams): Promise<SecureCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("secure-checkout", {
    body: params,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as SecureCheckoutResponse;
}

/**
 * Step 2: If requiresPix === true, generate PIX charge server-side.
 * The backend looks up the order amount — we never send price from frontend.
 */
export async function generatePixPayment(orderId: string): Promise<EfiPaymentResponse> {
  const { data, error } = await supabase.functions.invoke("efi-payment", {
    body: { orderId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { ...data, orderId } as EfiPaymentResponse;
}

/**
 * Poll order status until delivery or timeout.
 * Used after PIX payment — the webhook handles payment confirmation and delivery.
 */
export async function pollOrderDelivery(
  orderId: string,
  maxAttempts = 24,
  intervalMs = 2500,
): Promise<{ delivered: boolean; credential?: string; status?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    
    const { data: orderCheck } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (orderCheck?.status === "delivered") {
      const { data: log } = await supabase
        .from("delivery_logs")
        .select("credential_delivered")
        .eq("order_id", orderId)
        .maybeSingle();

      return {
        delivered: true,
        credential: log?.credential_delivered || "Produto entregue — verifique sua área do cliente",
        status: "delivered",
      };
    }

    if (orderCheck?.status === "refunded") {
      return { delivered: false, status: "refunded" };
    }

    if (orderCheck?.status === "refund_needed" || orderCheck?.status === "cancelled") {
      return { delivered: false, status: orderCheck.status };
    }
  }

  return { delivered: false, status: "processing" };
}
