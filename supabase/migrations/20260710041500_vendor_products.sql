-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  selling_price numeric NOT NULL,
  mrp numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  unit text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to products" ON public.products
  FOR ALL
  TO public
  USING (has_role('admin', auth.uid()));

-- Vendors can read their own products
CREATE POLICY "Vendors can read own products" ON public.products
  FOR SELECT
  TO public
  USING (has_role('vendor', auth.uid()) AND vendor_id = auth.uid());

-- Vendors can insert their own products
CREATE POLICY "Vendors can insert own products" ON public.products
  FOR INSERT
  TO public
  WITH CHECK (has_role('vendor', auth.uid()) AND vendor_id = auth.uid());

-- Vendors can update their own products
CREATE POLICY "Vendors can update own products" ON public.products
  FOR UPDATE
  TO public
  USING (has_role('vendor', auth.uid()) AND vendor_id = auth.uid())
  WITH CHECK (has_role('vendor', auth.uid()) AND vendor_id = auth.uid());

-- Vendors can delete their own products
CREATE POLICY "Vendors can delete own products" ON public.products
  FOR DELETE
  TO public
  USING (has_role('vendor', auth.uid()) AND vendor_id = auth.uid());

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-products', 'vendor-products', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public read access for vendor products" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'vendor-products');

CREATE POLICY "Vendors can insert their own product images" ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'vendor-products' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Vendors can update their own product images" ON storage.objects
  FOR UPDATE
  TO public
  USING (
    bucket_id = 'vendor-products' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Vendors can delete their own product images" ON storage.objects
  FOR DELETE
  TO public
  USING (
    bucket_id = 'vendor-products' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
