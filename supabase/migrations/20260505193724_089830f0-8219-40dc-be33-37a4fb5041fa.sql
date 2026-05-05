-- Profile extras
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own customers all" ON public.customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products all" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Deals
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid,
  customer_id uuid,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'qualification',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  probability integer NOT NULL DEFAULT 50,
  expected_close_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deals all" ON public.deals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Deal-Products link
CREATE TABLE IF NOT EXISTS public.deal_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deal_products all" ON public.deal_products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Onboarding steps (per customer)
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  step_order integer NOT NULL DEFAULT 0,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own onboarding all" ON public.onboarding_steps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER onboarding_steps_updated BEFORE UPDATE ON public.onboarding_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create customer when lead becomes 'won'
CREATE OR REPLACE FUNCTION public.create_customer_from_won_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_customer_id uuid;
BEGIN
  IF NEW.stage = 'won' AND (OLD.stage IS DISTINCT FROM 'won') THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE lead_id = NEW.id) THEN
      INSERT INTO public.customers (user_id, lead_id, name, email, company, notes)
      VALUES (NEW.user_id, NEW.id, NEW.name, NEW.email, NEW.company, NEW.notes)
      RETURNING id INTO new_customer_id;

      INSERT INTO public.onboarding_steps (user_id, customer_id, title, step_order)
      VALUES
        (NEW.user_id, new_customer_id, 'Welcome call', 1),
        (NEW.user_id, new_customer_id, 'Account setup', 2),
        (NEW.user_id, new_customer_id, 'Product walkthrough', 3),
        (NEW.user_id, new_customer_id, 'First milestone check-in', 4);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS leads_won_to_customer ON public.leads;
CREATE TRIGGER leads_won_to_customer AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.create_customer_from_won_lead();

CREATE INDEX IF NOT EXISTS deals_user_idx ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS customers_user_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS products_user_idx ON public.products(user_id);
CREATE INDEX IF NOT EXISTS onboarding_customer_idx ON public.onboarding_steps(customer_id);