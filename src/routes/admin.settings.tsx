import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPublicSettings } from "@/lib/settings.functions";
import { updateSystemSettings } from "@/lib/admin.functions";
import { ALLOWED_FAVICON_MIME, MAX_FAVICON_BYTES } from "@/lib/constants";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [favicon, setFavicon] = useState<{ file: File; base64: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // Fetch data using server functions
      setReady(true);
    })();
  }, [navigate]);

  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    enabled: ready,
  });

  useEffect(() => {
    if (data?.support_email) setSupportEmail(data.support_email);
  }, [data]);

  const update = useServerFn(updateSystemSettings);

  async function pickFavicon(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!(ALLOWED_FAVICON_MIME as readonly string[]).includes(f.type)) {
      toast.error("Use PNG, ICO, SVG or WEBP");
      return;
    }
    if (f.size > 1024 * 1024) {
      toast.error("File size must be less than or equal to 1 MB.");
      return;
    }

    // TEMPORARY: Save local preview/reference to bypass missing Firebase Storage
    const localRef = URL.createObjectURL(f);
    setFavicon({ file: f, base64: localRef });
  }

  async function save() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())) {
      toast.error("Enter a valid support email");
      return;
    }
    setSaving(true);
    try {
      await update({
        data: {
          support_email: supportEmail.trim(),
          favicon: favicon ? { mime: favicon.file.type, base64: favicon.base64 } : undefined,
        },
      });
      toast.success("Settings saved");
      setFavicon(null);
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeFavicon() {
    setSaving(true);
    try {
      await update({ data: { favicon: null } });
      toast.success("Favicon removed");
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewUrl = favicon?.base64 ?? data?.favicon_data_url ?? null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/admin/applications"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage global site configuration.</p>

      <div className="mt-8 space-y-6">
        <section className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-medium">Website Favicon</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PNG, ICO, SVG or WEBP. Max {MAX_FAVICON_BYTES / 1024} KB. Applies immediately.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-[12px] border bg-muted/40">
              {previewUrl ? (
                <img src={previewUrl} alt="Favicon preview" className="max-h-12 max-w-12" />
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-muted/40">
                <Upload className="h-4 w-4" /> Choose file
                <input
                  type="file"
                  className="hidden"
                  accept={ALLOWED_FAVICON_MIME.join(",")}
                  onChange={pickFavicon}
                />
              </label>
              <span className="mt-1 text-[11px] text-muted-foreground text-center">
                Upload image (Maximum size: 1 MB)
              </span>
            </div>
            {data?.favicon_data_url && (
              <Button variant="ghost" size="sm" onClick={removeFavicon} disabled={saving}>
                Remove
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-medium">Support Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Displayed in the footer across the site.
          </p>
          <div className="mt-4">
            <Label className="text-sm font-medium">Email address</Label>
            <Input
              className="mt-1.5 max-w-sm"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              maxLength={255}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
