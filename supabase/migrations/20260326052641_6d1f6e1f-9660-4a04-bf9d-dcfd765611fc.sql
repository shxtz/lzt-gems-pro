UPDATE lzt_accounts 
SET price_brl = ROUND((price_usd * (1 + c.margin_percent::numeric / 100))::numeric, 2)
FROM lzt_categories c 
WHERE lzt_accounts.category_id = c.id 
  AND lzt_accounts.status = 'available'
  AND lzt_accounts.data->>'price_currency' = 'brl';