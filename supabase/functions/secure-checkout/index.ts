import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── Input ─────────────────────────────────────────────
    const body = await req.json();
    const {
      product_id,
      variation_index,
      quantity = 1,
      coupon_code,
      lzt_account_id,
      lzt_item_id,
      fortnite_username,
    } = body;

    if (!product_id) {
      return json({ error: "product_id é obrigatório" }, 400);
    }
    if (quantity < 1 || quantity > 100) {
      return json({ error: "Quantidade inválida" }, 400);
    }

    // ── Decide flow: LZT or standard product ─────────────
    let unitPrice: number;
    let variationId: string | null = null;
    let lztAccountId: string | null = null;

    if (lzt_account_id || lzt_item_id) {
      // ── LZT account purchase ───────────────────────────
      const lztQuery = lzt_account_id
        ? supabase.from("lzt_accounts").select("*").eq("id", lzt_account_id).eq("status", "available").single()
        : supabase.from("lzt_accounts").select("*").eq("lzt_item_id", lzt_item_id).eq("status", "available").single();

      const { data: lztAccount, error: lztError } = await lztQuery;

      if (lztError || !lztAccount) {
        return json({ error: "Conta LZT não encontrada ou indisponível" }, 404);
      }

      unitPrice = Number(lztAccount.price_brl);
      lztAccountId = lztAccount.id;

      // Reserve the account
      const { error: reserveError } = await supabase
        .from("lzt_accounts")
        .update({ status: "reserved", buyer_id: user.id })
        .eq("id", lztAccount.id)
        .eq("status", "available");

      if (reserveError) {
        return json({ error: "Não foi possível reservar a conta" }, 409);
      }
    } else {
      // ── Standard product purchase ──────────────────────
      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, active, name")
        .eq("id", product_id)
        .eq("active", true)
        .single();

      if (prodError || !product) {
        return json({ error: "Produto não encontrado" }, 404);
      }

      // Fetch variations
      const { data: variations, error: varError } = await supabase
        .from("product_variations")
        .select("id, price, active, name")
        .eq("product_id", product_id)
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (varError || !variations?.length) {
        return json({ error: "Nenhuma variação disponível" }, 404);
      }

      const idx = typeof variation_index === "number" ? variation_index : 0;
      if (idx < 0 || idx >= variations.length) {
        return json({ error: "Variação inválida" }, 400);
      }

      const variation = variations[idx];
      unitPrice = Number(variation.price);
      variationId = variation.id;

      // Check stock
      const { count: stockCount } = await supabase
        .from("product_stock")
        .select("id", { count: "exact", head: true })
        .eq("variation_id", variation.id)
        .eq("status", "available");

      if ((stockCount ?? 0) < quantity) {
        return json({ error: "Estoque insuficiente" }, 409);
      }
    }

    // ── Coupon ────────────────────────────────────────────
    let discountPercent = 0;
    let couponId: string | null = null;

    if (coupon_code) {
      const { data: couponRows } = await supabase.rpc("validate_coupon", {
        coupon_code: coupon_code.trim(),
      });
      const coupon = Array.isArray(couponRows) ? couponRows[0] : couponRows;
      if (coupon) {
        discountPercent = coupon.discount_percent;
        couponId = coupon.id;
      }
    }

    // ── Calculate price ──────────────────────────────────
    const subtotal = unitPrice * quantity;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalPrice = Math.max(subtotal - discountAmount, 0);

    if (totalPrice <= 0) {
      return json({ error: "Valor total inválido" }, 400);
    }

    // ── Check balance ────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const userBalance = Number(profile?.balance ?? 0);
    let paidWithBalance = false;

    if (userBalance >= totalPrice) {
      // ── Pay with balance ─────────────────────────────
      const { data: debited } = await supabase.rpc("debit_balance", {
        _user_id: user.id,
        _amount: totalPrice,
        _order_id: null as unknown as string,
        _description: `Compra do produto ${product_id}`,
      });

      if (debited === true) {
        paidWithBalance = true;
      }
    }

    // ── Create order ─────────────────────────────────────
    const orderData: Record<string, unknown> = {
      user_id: user.id,
      product_id,
      variation_id: variationId,
      quantity,
      total_price: totalPrice,
      coupon_id: couponId,
      status: paidWithBalance ? "paid" : "pending",
      payment_method: paidWithBalance ? "balance" : "pix",
      lzt_account_id: lztAccountId,
      lzt_item_id: lzt_item_id || null,
      fortnite_username: fortnite_username || null,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("id")
      .single();

    if (orderError || !order) {
      // Rollback LZT reservation if needed
      if (lztAccountId) {
        await supabase
          .from("lzt_accounts")
          .update({ status: "available", buyer_id: null })
          .eq("id", lztAccountId);
      }
      console.error("Order creation error:", orderError);
      return json({ error: "Erro ao criar pedido" }, 500);
    }

    // ── If paid with balance, trigger delivery ───────────
    if (paidWithBalance) {
      // Update debit record with order_id
      // Invoke deliver-product in background
      const deliverPromise = supabase.functions.invoke("deliver-product", {
        body: { orderId: order.id },
      });

      // Don't block response
      deliverPromise.catch((err: Error) =>
        console.error("Background delivery error:", err.message),
      );

      return json({
        orderId: order.id,
        requiresPix: false,
        delivered: false, // delivery is async
        status: "paid",
      });
    }

    // ── Requires PIX ─────────────────────────────────────
    return json({
      orderId: order.id,
      requiresPix: true,
      status: "pending",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("secure-checkout error:", message);
    return json({ error: "Erro ao processar checkout" }, 500);
  }
});
