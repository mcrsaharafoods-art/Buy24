
-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected', 'reupload_required');
CREATE TYPE public.document_type AS ENUM ('aadhaar', 'pan', 'shop_photo', 'shop_license', 'cancelled_cheque');
CREATE TYPE public.seller_type AS ENUM ('individual', 'proprietorship', 'partnership', 'private_limited', 'llp');

-- =====================================================================
-- PROFILES
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =====================================================================
-- USER ROLES
-- =====================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =====================================================================
-- VENDOR APPLICATIONS
-- =====================================================================
CREATE TABLE public.vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_code TEXT NOT NULL UNIQUE,

  -- Step 2: Business details
  shop_name TEXT NOT NULL,
  seller_type public.seller_type NOT NULL,
  gst_number TEXT,
  fssai_number TEXT,

  -- Step 3: Business address
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  address_line TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- Step 4: Bank details
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc TEXT NOT NULL,
  upi_id TEXT,

  -- Step 6: Business info
  delivery_radius_km INTEGER NOT NULL,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  home_delivery BOOLEAN NOT NULL DEFAULT false,
  pickup_available BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status public.application_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  admin_message TEXT,
  requested_reupload_docs public.document_type[],
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vendor_applications TO authenticated;
GRANT ALL ON public.vendor_applications TO service_role;
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own application" ON public.vendor_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors update own application" ON public.vendor_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- DOCUMENTS
-- =====================================================================
CREATE TABLE public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.vendor_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.document_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view documents" ON public.application_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- OTP VERIFICATIONS
-- =====================================================================
CREATE TABLE public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_mobile ON public.otp_verifications (mobile, created_at DESC);
GRANT ALL ON public.otp_verifications TO service_role;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (server functions) can read/write

-- =====================================================================
-- SYSTEM SETTINGS
-- =====================================================================
CREATE TABLE public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  support_email TEXT NOT NULL DEFAULT 'support@buy24us.com',
  favicon_data_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.system_settings
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.system_settings (id, support_email) VALUES (1, 'support@buy24us.com');

-- =====================================================================
-- APPLICATION STATUS HISTORY
-- =====================================================================
CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.vendor_applications(id) ON DELETE CASCADE,
  from_status public.application_status,
  to_status public.application_status NOT NULL,
  note TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view history" ON public.application_status_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.vendor_applications va
      WHERE va.id = application_id AND va.user_id = auth.uid()
    )
  );

-- =====================================================================
-- TIMESTAMP TRIGGER
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER applications_updated BEFORE UPDATE ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- STORAGE POLICIES (vendor-documents bucket)
-- =====================================================================
-- Path convention: {user_id}/{doc_type}-{timestamp}.{ext}
CREATE POLICY "Vendors upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Vendors read own docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Vendors update own docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
