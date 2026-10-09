-- Seller-side order records: what shipped, where, and what the carrier says happened.
-- This is the evidence the agent and the dashboard use to judge "item not received" claims.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers (id) on delete set null,
  -- The seller-side PayPal transaction id (disputes.raw -> disputed_transactions[0].seller_transaction_id).
  paypal_transaction_id text not null unique,
  order_number text,
  item_description text,
  ship_to_name text,
  ship_to_address text,
  -- Shipped to the address on the PayPal transaction (required for Seller Protection).
  ship_to_matches_paypal boolean,
  carrier text,
  tracking_number text,
  shipping_status text check (shipping_status in ('NOT_SHIPPED', 'LABEL_CREATED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED_TO_SENDER')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  signature_confirmed boolean,
  -- Carrier scans, oldest first: [{ "at": "...", "location": "...", "description": "..." }]
  tracking_events jsonb not null default '[]',
  notes text,
  -- True for made-up demo evidence (scripts/seed-orders.ts), so it's never mistaken for real data.
  simulated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only the server (secret key) reads this; no public access.
alter table orders enable row level security;
