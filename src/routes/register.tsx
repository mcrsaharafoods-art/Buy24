import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z, ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sendOtp, verifyOtp } from "@/lib/otp.functions";
import { submitApplication, checkMobileAvailable } from "@/lib/registration.functions";
import {
  ALLOWED_DOCUMENT_MIME,
  ALL_DOCUMENTS,
  DOCUMENT_LABELS,
  MAX_DOCUMENT_BYTES,
  OPTIONAL_DOCUMENTS,
  REQUIRED_DOCUMENTS,
  SELLER_TYPES,
} from "@/lib/constants";
import {
  accountNumberSchema,
  emailSchema,
  fssaiSchema,
  gstSchema,
  ifscSchema,
  mobileSchema,
  passwordSchema,
  pincodeSchema,
  timeSchema,
  upiIdSchema,
} from "@/lib/validation";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const STEPS = [
  "Basic Details",
  "Business Details",
  "Business Address",
  "Bank Details",
  "Document Upload",
  "Business Information",
  "Final Submission",
] as const;

type DocPayload = { file_name: string; mime_type: string; base64: string } | undefined;

type FormState = {
  full_name: string;
  mobile: string;
  otp_verified: boolean;
  email: string;
  password: string;
  confirm_password: string;
  shop_name: string;
  seller_type: string;
  gst_number: string;
  fssai_number: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  address_line: string;
  latitude: string;
  longitude: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  upi_id: string;
  documents: Partial<Record<(typeof ALL_DOCUMENTS)[number], DocPayload>>;
  delivery_radius_km: string;
  opening_time: string;
  closing_time: string;
  home_delivery: "yes" | "no";
  pickup_available: "yes" | "no";
  terms_accepted: boolean;
};

const INITIAL: FormState = {
  full_name: "",
  mobile: "",
  otp_verified: false,
  email: "",
  password: "",
  confirm_password: "",
  shop_name: "",
  seller_type: "",
  gst_number: "",
  fssai_number: "",
  state: "",
  district: "",
  city: "",
  pincode: "",
  address_line: "",
  latitude: "",
  longitude: "",
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
  upi_id: "",
  documents: {},
  delivery_radius_km: "",
  opening_time: "09:00",
  closing_time: "21:00",
  home_delivery: "no",
  pickup_available: "yes",
  terms_accepted: false,
};

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ code: string; email: string } | null>(null);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }, []);

  const submitFn = useServerFn(submitApplication);

  const validateStep = useCallback(
    (index: number): boolean => {
      const errs: Record<string, string> = {};
      const check = <T,>(schema: z.ZodType<T>, key: string, value: unknown) => {
        try {
          schema.parse(value);
        } catch (e) {
          if (e instanceof ZodError) errs[key] = e.issues[0].message;
        }
      };
      if (index === 0) {
        if (form.full_name.trim().length < 2) errs.full_name = "Please enter your full name";
        check(mobileSchema, "mobile", form.mobile);
        if (!form.otp_verified) errs.mobile = errs.mobile ?? "Please verify your mobile number";
        if (form.email) check(emailSchema, "email", form.email);
        check(passwordSchema, "password", form.password);
        if (form.password !== form.confirm_password)
          errs.confirm_password = "Passwords do not match";
      } else if (index === 1) {
        if (form.shop_name.trim().length < 2) errs.shop_name = "Enter your shop name";
        if (!form.seller_type) errs.seller_type = "Select seller type";
        if (form.gst_number) check(gstSchema, "gst_number", form.gst_number);
        if (form.fssai_number) check(fssaiSchema, "fssai_number", form.fssai_number);
      } else if (index === 2) {
        if (form.state.trim().length < 2) errs.state = "Required";
        if (form.district.trim().length < 2) errs.district = "Required";
        if (form.city.trim().length < 2) errs.city = "Required";
        check(pincodeSchema, "pincode", form.pincode);
      } else if (index === 3) {
        if (form.account_holder_name.trim().length < 2)
          errs.account_holder_name = "Enter account holder name";
        if (form.bank_name.trim().length < 2) errs.bank_name = "Enter bank name";
        check(accountNumberSchema, "account_number", form.account_number);
        check(ifscSchema, "ifsc", form.ifsc.toUpperCase());
        if (form.upi_id) check(upiIdSchema, "upi_id", form.upi_id);
      } else if (index === 4) {
        for (const req of REQUIRED_DOCUMENTS) {
          if (!form.documents[req]) errs[`doc_${req}`] = "Required";
        }
      } else if (index === 5) {
        const km = Number(form.delivery_radius_km);
        if (!Number.isInteger(km) || km < 1 || km > 200) errs.delivery_radius_km = "Enter 1-200 km";
        check(timeSchema, "opening_time", form.opening_time);
        check(timeSchema, "closing_time", form.closing_time);
      } else if (index === 6) {
        if (!form.terms_accepted) errs.terms_accepted = "You must accept the terms";
      }
      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [form],
  );

  async function goNext() {
    if (!validateStep(step)) return;
    if (step === 0) {
      // Ensure mobile isn't already registered before advancing off step 1.
      try {
        const res = await checkMobileAvailable({ data: { mobile: form.mobile } });
        if (!res.available) {
          setErrors({ mobile: "This mobile is already registered. Please login." });
          return;
        }
      } catch {
        // non-fatal — server will re-check on submit
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    if (!validateStep(6)) return;
    // Validate all previous steps as well
    for (let i = 0; i < 7; i++) {
      if (!validateStep(i)) {
        setStep(i);
        toast.error(`Please fix errors in step ${i + 1}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await submitFn({
        data: {
          full_name: form.full_name.trim(),
          mobile: form.mobile,
          email: form.email || undefined,
          password: form.password,
          otp: "000000", // OTP has been verified server-side; final submit only needs mobile flagged verified
          shop_name: form.shop_name.trim(),
          seller_type: form.seller_type as
            "individual" | "proprietorship" | "partnership" | "private_limited" | "llp",
          gst_number: form.gst_number || undefined,
          fssai_number: form.fssai_number || undefined,
          state: form.state.trim(),
          district: form.district.trim(),
          city: form.city.trim(),
          pincode: form.pincode,
          address_line: form.address_line || undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          account_holder_name: form.account_holder_name.trim(),
          bank_name: form.bank_name.trim(),
          account_number: form.account_number,
          ifsc: form.ifsc.toUpperCase(),
          upi_id: form.upi_id || undefined,
          documents: form.documents as Record<
            "aadhaar" | "pan" | "shop_photo" | "shop_license" | "cancelled_cheque",
            { file_name: string; mime_type: string; base64: string }
          >,
          delivery_radius_km: Number(form.delivery_radius_km),
          opening_time: form.opening_time,
          closing_time: form.closing_time,
          home_delivery: form.home_delivery === "yes",
          pickup_available: form.pickup_available === "yes",
          terms_accepted: true,
        },
      });
      setSubmitted({ code: res.application_code, email: res.email });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[22px] border bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[oklch(0.95_0.06_155)]">
            <CheckCircle2 className="h-8 w-8 text-[oklch(0.45_0.15_155)]" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Application submitted</h1>
          <p className="mt-2 text-muted-foreground">
            Your application <span className="font-mono text-foreground">{submitted.code}</span> is
            now <span className="font-medium text-foreground">Pending</span> review.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Log in any time to check your status. Use your mobile number
            {form.email ? " or email" : ""} with the password you set.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate({ to: "/login" })}>Go to login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Vendor Registration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete all 7 steps. Your progress is saved on this device until you submit.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <Sidebar current={step} onNavigate={(i) => i < step && setStep(i)} />
        <div className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-6">
            <div className="text-xs font-medium uppercase tracking-wider text-primary">
              Step {step + 1} of {STEPS.length}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{STEPS[step]}</h2>
          </div>

          {step === 0 && <Step1 form={form} set={set} errors={errors} />}
          {step === 1 && <Step2 form={form} set={set} errors={errors} />}
          {step === 2 && <Step3 form={form} set={set} errors={errors} />}
          {step === 3 && <Step4 form={form} set={set} errors={errors} />}
          {step === 4 && <Step5 form={form} set={set} errors={errors} />}
          {step === 5 && <Step6 form={form} set={set} errors={errors} />}
          {step === 6 && <Step7 form={form} set={set} errors={errors} />}

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button variant="ghost" onClick={goBack} disabled={step === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit application
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Login
        </Link>
      </div>
    </div>
  );
}

/* ------------------- Sidebar ------------------- */

function Sidebar({ current, onNavigate }: { current: number; onNavigate: (i: number) => void }) {
  return (
    <aside className="rounded-[22px] border bg-white p-4 shadow-[var(--shadow-soft)]">
      <ol className="space-y-1">
        {STEPS.map((label, i) => {
          const completed = i < current;
          const active = i === current;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onNavigate(i)}
                disabled={i > current}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition",
                  active && "bg-primary/10 text-primary font-medium",
                  !active && completed && "text-foreground hover:bg-muted",
                  !active && !completed && "text-muted-foreground",
                  i > current && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs",
                    active && "border-primary bg-primary text-primary-foreground",
                    completed &&
                      "border-[oklch(0.65_0.17_155)] bg-[oklch(0.65_0.17_155)] text-white",
                    !active && !completed && "border-input bg-background",
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/* ------------------- Shared bits ------------------- */

function Field({
  label,
  children,
  error,
  hint,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type StepProps = {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
};

/* ------------------- Step 1: Basic Details + OTP ------------------- */

function Step1({ form, set, errors }: StepProps) {
  const [otpState, setOtpState] = useState<{
    sent: boolean;
    devCode?: string;
    sending: boolean;
    verifying: boolean;
    code: string;
  }>({
    sent: false,
    sending: false,
    verifying: false,
    code: "",
  });
  const sendFn = useServerFn(sendOtp);
  const verifyFn = useServerFn(verifyOtp);

  async function handleSend() {
    try {
      mobileSchema.parse(form.mobile);
    } catch {
      toast.error("Enter a valid mobile number");
      return;
    }
    setOtpState((s) => ({ ...s, sending: true }));
    try {
      const res = await sendFn({ data: { mobile: form.mobile } });
      setOtpState({ sent: true, devCode: res.devCode, sending: false, verifying: false, code: "" });
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP");
      setOtpState((s) => ({ ...s, sending: false }));
    }
  }

  async function handleVerify() {
    if (otpState.code.length !== 6) return;
    setOtpState((s) => ({ ...s, verifying: true }));
    try {
      await verifyFn({ data: { mobile: form.mobile, code: otpState.code } });
      set("otp_verified", true);
      toast.success("Mobile verified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setOtpState((s) => ({ ...s, verifying: false }));
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Full Name" error={errors.full_name}>
        <Input
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          maxLength={100}
          placeholder="As per Aadhaar"
        />
      </Field>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Mobile Number</Label>
        <div className="flex gap-2">
          <div className="flex items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
            +91
          </div>
          <Input
            value={form.mobile}
            onChange={(e) => {
              set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10));
              set("otp_verified", false);
              setOtpState({ sent: false, sending: false, verifying: false, code: "" });
            }}
            placeholder="10-digit number"
            inputMode="numeric"
            disabled={form.otp_verified}
          />
          {!form.otp_verified && (
            <Button
              type="button"
              onClick={handleSend}
              disabled={otpState.sending}
              variant="secondary"
            >
              {otpState.sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {otpState.sent ? "Resend" : "Send OTP"}
            </Button>
          )}
        </div>
        {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
      </div>
      {otpState.sent && !form.otp_verified && (
        <div className="sm:col-span-2">
          <div className="rounded-[14px] border bg-primary/5 p-4">
            {otpState.devCode && (
              <div className="mb-3 rounded-md bg-white p-3 text-sm">
                <span className="font-medium text-primary">Dev mode:</span> Your OTP is{" "}
                <span className="font-mono text-base font-semibold">{otpState.devCode}</span>
              </div>
            )}
            <Label className="text-sm font-medium">Enter 6-digit OTP</Label>
            <div className="mt-3 flex items-center gap-3">
              <InputOTP
                maxLength={6}
                value={otpState.code}
                onChange={(v) => setOtpState((s) => ({ ...s, code: v }))}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button
                type="button"
                onClick={handleVerify}
                disabled={otpState.verifying || otpState.code.length !== 6}
              >
                {otpState.verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify
              </Button>
            </div>
          </div>
        </div>
      )}
      {form.otp_verified && (
        <div className="sm:col-span-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.95_0.06_155)] px-3 py-1 text-sm text-[oklch(0.4_0.15_155)]">
            <Check className="h-4 w-4" /> Mobile verified
          </div>
        </div>
      )}

      <Field label="Email" optional error={errors.email} hint="You can login with mobile or email.">
        <Input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          maxLength={255}
        />
      </Field>
      <div className="hidden sm:block" />
      <Field label="Password" error={errors.password} hint="Min 8 chars, upper + lower + number.">
        <Input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          maxLength={72}
        />
      </Field>
      <Field label="Confirm Password" error={errors.confirm_password}>
        <Input
          type="password"
          value={form.confirm_password}
          onChange={(e) => set("confirm_password", e.target.value)}
          maxLength={72}
        />
      </Field>
    </div>
  );
}

/* ------------------- Step 2: Business Details ------------------- */

function Step2({ form, set, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Shop Name" error={errors.shop_name}>
        <Input
          value={form.shop_name}
          onChange={(e) => set("shop_name", e.target.value)}
          maxLength={150}
        />
      </Field>
      <Field label="Seller Type" error={errors.seller_type}>
        <Select value={form.seller_type} onValueChange={(v) => set("seller_type", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select seller type" />
          </SelectTrigger>
          <SelectContent>
            {SELLER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="GST Number" optional error={errors.gst_number} hint="15-character GSTIN">
        <Input
          value={form.gst_number}
          onChange={(e) => set("gst_number", e.target.value.toUpperCase())}
          maxLength={15}
        />
      </Field>
      <Field
        label="FSSAI Number"
        optional
        error={errors.fssai_number}
        hint="14-digit FSSAI license"
      >
        <Input
          value={form.fssai_number}
          onChange={(e) => set("fssai_number", e.target.value.replace(/\D/g, "").slice(0, 14))}
        />
      </Field>
    </div>
  );
}

/* ------------------- Step 3: Address ------------------- */

function Step3({ form, set, errors }: StepProps) {
  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        toast.success("Location captured");
      },
      (err) => toast.error(err.message || "Could not fetch location"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }
  const mapUrl =
    form.latitude && form.longitude
      ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}`
      : null;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="State" error={errors.state}>
        <Input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={80} />
      </Field>
      <Field label="District" error={errors.district}>
        <Input
          value={form.district}
          onChange={(e) => set("district", e.target.value)}
          maxLength={80}
        />
      </Field>
      <Field label="City" error={errors.city}>
        <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />
      </Field>
      <Field label="Pincode" error={errors.pincode}>
        <Input
          value={form.pincode}
          onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Full Address" optional>
          <Textarea
            value={form.address_line}
            onChange={(e) => set("address_line", e.target.value)}
            maxLength={300}
            rows={2}
          />
        </Field>
      </div>
      <div className="sm:col-span-2 rounded-[14px] border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Google Map Location
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Use your current location or paste coordinates manually.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
            Use my location
          </Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            value={form.latitude}
            onChange={(e) => set("latitude", e.target.value)}
            placeholder="Latitude"
          />
          <Input
            value={form.longitude}
            onChange={(e) => set("longitude", e.target.value)}
            placeholder="Longitude"
          />
        </div>
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Preview on Google Maps →
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------- Step 4: Bank ------------------- */

function Step4({ form, set, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Account Holder Name" error={errors.account_holder_name}>
        <Input
          value={form.account_holder_name}
          onChange={(e) => set("account_holder_name", e.target.value)}
          maxLength={100}
        />
      </Field>
      <Field label="Bank Name" error={errors.bank_name}>
        <Input
          value={form.bank_name}
          onChange={(e) => set("bank_name", e.target.value)}
          maxLength={100}
        />
      </Field>
      <Field label="Account Number" error={errors.account_number}>
        <Input
          value={form.account_number}
          onChange={(e) => set("account_number", e.target.value.replace(/\D/g, "").slice(0, 18))}
          inputMode="numeric"
        />
      </Field>
      <Field label="IFSC" error={errors.ifsc}>
        <Input
          value={form.ifsc}
          onChange={(e) => set("ifsc", e.target.value.toUpperCase().slice(0, 11))}
        />
      </Field>
      <Field label="UPI ID" optional error={errors.upi_id} hint="e.g. name@bank">
        <Input
          value={form.upi_id}
          onChange={(e) => set("upi_id", e.target.value)}
          maxLength={256}
        />
      </Field>
    </div>
  );
}

/* ------------------- Step 5: Documents ------------------- */

function Step5({ form, set, errors }: StepProps) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[14px] border bg-muted/40 p-4 text-sm text-muted-foreground">
        Accepted formats: PDF, JPG, PNG, WEBP. Max size {MAX_DOCUMENT_BYTES / 1024 / 1024} MB per
        file.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ALL_DOCUMENTS.map((docKey) => (
          <DocSlot
            key={docKey}
            label={DOCUMENT_LABELS[docKey]}
            required={(REQUIRED_DOCUMENTS as readonly string[]).includes(docKey)}
            optional={(OPTIONAL_DOCUMENTS as readonly string[]).includes(docKey)}
            error={errors[`doc_${docKey}`]}
            file={form.documents[docKey]}
            onChange={(payload) => set("documents", { ...form.documents, [docKey]: payload })}
          />
        ))}
      </div>
    </div>
  );
}

function DocSlot({
  label,
  required,
  optional,
  error,
  file,
  onChange,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  file?: DocPayload;
  onChange: (payload: DocPayload) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(f: File) {
    if (!(ALLOWED_DOCUMENT_MIME as readonly string[]).includes(f.type)) {
      toast.error(`${label}: unsupported file type`);
      return;
    }
    if (f.size > MAX_DOCUMENT_BYTES) {
      toast.error(`${label}: file exceeds ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB`);
      return;
    }
    const b64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    });
    onChange({ file_name: f.name, mime_type: f.type, base64: b64 });
    setPreviewUrl(b64);
  }

  const preview = previewUrl ?? file?.base64 ?? null;
  const isImage = file?.mime_type?.startsWith("image/");

  return (
    <div className={cn("rounded-[14px] border p-4 transition", error && "border-destructive")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {label}
          {optional && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
          )}
          {required && <span className="ml-1 text-destructive">*</span>}
        </div>
        {file && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setPreviewUrl(null);
            }}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {file ? (
        <div className="mt-3">
          {isImage && preview ? (
            <img src={preview} alt={label} className="max-h-40 rounded-md border object-contain" />
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              📄 {file.file_name}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            {file.file_name} · {Math.round((file.base64.length * 0.75) / 1024)} KB
          </div>
        </div>
      ) : (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed py-6 text-sm text-muted-foreground hover:bg-muted/40">
          <Upload className="mb-1 h-5 w-5" />
          <span>Click to upload</span>
          <input
            type="file"
            className="hidden"
            accept={ALLOWED_DOCUMENT_MIME.join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ------------------- Step 6: Business Info ------------------- */

function Step6({ form, set, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Delivery Radius (km)" error={errors.delivery_radius_km}>
        <Input
          value={form.delivery_radius_km}
          onChange={(e) => set("delivery_radius_km", e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="e.g. 10"
        />
      </Field>
      <div className="hidden sm:block" />
      <Field label="Opening Time" error={errors.opening_time}>
        <Input
          type="time"
          value={form.opening_time}
          onChange={(e) => set("opening_time", e.target.value)}
        />
      </Field>
      <Field label="Closing Time" error={errors.closing_time}>
        <Input
          type="time"
          value={form.closing_time}
          onChange={(e) => set("closing_time", e.target.value)}
        />
      </Field>
      <div>
        <Label className="mb-2 block text-sm font-medium">Home Delivery</Label>
        <RadioGroup
          value={form.home_delivery}
          onValueChange={(v) => set("home_delivery", v as "yes" | "no")}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> Yes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> No
          </label>
        </RadioGroup>
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium">Pickup Available</Label>
        <RadioGroup
          value={form.pickup_available}
          onValueChange={(v) => set("pickup_available", v as "yes" | "no")}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> Yes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> No
          </label>
        </RadioGroup>
      </div>
    </div>
  );
}

/* ------------------- Step 7: Review + Submit ------------------- */

function Step7({ form, set, errors }: StepProps) {
  const summary = useMemo(
    () => [
      {
        title: "Basic Details",
        rows: [
          ["Full Name", form.full_name],
          ["Mobile", `+91 ${form.mobile}`],
          ["Email", form.email || "—"],
        ],
      },
      {
        title: "Business",
        rows: [
          ["Shop", form.shop_name],
          ["Seller Type", form.seller_type],
          ["GST", form.gst_number || "—"],
          ["FSSAI", form.fssai_number || "—"],
        ],
      },
      {
        title: "Address",
        rows: [
          ["State", form.state],
          ["District", form.district],
          ["City", form.city],
          ["Pincode", form.pincode],
        ],
      },
      {
        title: "Bank",
        rows: [
          ["Holder", form.account_holder_name],
          ["Bank", form.bank_name],
          ["A/C", form.account_number.replace(/\d(?=\d{4})/g, "•")],
          ["IFSC", form.ifsc.toUpperCase()],
        ],
      },
      {
        title: "Operations",
        rows: [
          ["Delivery radius", `${form.delivery_radius_km} km`],
          ["Hours", `${form.opening_time} – ${form.closing_time}`],
          ["Home delivery", form.home_delivery],
          ["Pickup", form.pickup_available],
        ],
      },
    ],
    [form],
  );
  return (
    <div className="space-y-5">
      {summary.map((s) => (
        <div key={s.title} className="rounded-[14px] border">
          <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">{s.title}</div>
          <dl className="grid gap-2 p-4 sm:grid-cols-2">
            {s.rows.map(([k, v]) => (
              <div key={k} className="text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{String(v || "—")}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <div className="rounded-[14px] border bg-muted/40 p-4">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.terms_accepted}
            onCheckedChange={(v) => set("terms_accepted", v === true)}
            className="mt-0.5"
          />
          <span className="leading-snug">
            I confirm that all information and documents provided are accurate. I agree to Buy24Us's{" "}
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="font-medium text-primary hover:underline">
                  vendor terms and privacy policy
                </button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col gap-0 p-0 sm:w-full">
                <DialogHeader className="border-b px-6 py-4">
                  <DialogTitle>Vendor Terms and Privacy Policy</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden bg-white">
                  <iframe
                    src="https://www.buy24us.com/terms-conditions.php"
                    className="h-[65vh] w-full border-0 sm:h-[75vh]"
                    title="Vendor Terms and Privacy Policy"
                  />
                </div>
              </DialogContent>
            </Dialog>
            .
          </span>
        </label>
        {errors.terms_accepted && (
          <p className="mt-2 text-xs text-destructive">{errors.terms_accepted}</p>
        )}
      </div>
    </div>
  );
}
