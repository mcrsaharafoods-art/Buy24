import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getMyApplication, getMyDocumentUrl, reuploadDocument } from "@/lib/vendor.functions";
import { StatusBadge } from "@/components/status-badge";
import { ALLOWED_DOCUMENT_MIME, DOCUMENT_LABELS, MAX_DOCUMENT_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/status")({
  ssr: false,
  component: VendorStatusPage,
});

type DocType = "aadhaar" | "pan" | "shop_photo" | "shop_license" | "cancelled_cheque";

function VendorStatusPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Fetch data using server functions
    setChecking(false);
  }, [navigate]);

  const qc = useQueryClient();
  const getApp = useServerFn(getMyApplication);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-application"],
    queryFn: () => getApp({}),
    enabled: !checking,
  });

  if (checking || isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!data?.application) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">No application found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please complete your vendor registration.
        </p>
        <Button className="mt-4" onClick={() => navigate({ to: "/register" })}>
          Start registration
        </Button>
      </div>
    );
  }

  const app = data.application;
  const status = app.status as "pending" | "approved" | "rejected" | "reupload_required";
  const requestedDocs = (app.requested_reupload_docs ?? []) as DocType[];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-[22px] border bg-white p-8 shadow-[var(--shadow-card)]">
        <div className="text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Application {app.application_code}
          </div>
          <div className="mt-4 flex justify-center">
            <StatusBadge status={status} size="lg" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Submitted {new Date(app.submitted_at).toLocaleString()}
          </div>
        </div>

        {status === "approved" && (
          <div className="mt-8 rounded-[14px] border bg-[oklch(0.97_0.04_155)] p-5 text-center text-sm">
            <div className="font-medium text-[oklch(0.35_0.15_155)]">
              Congratulations! Your application is approved.
            </div>
            <p className="mt-1 text-muted-foreground">
              Our onboarding team will reach out to you shortly.
            </p>
          </div>
        )}

        {status === "pending" && (
          <div className="mt-8 rounded-[14px] border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
            Your application is currently under review. We will notify you once a decision is made.
          </div>
        )}

        {status === "rejected" && (
          <div className="mt-8 rounded-[14px] border border-destructive/30 bg-[oklch(0.97_0.03_25)] p-5 text-sm">
            <div className="font-medium text-destructive">Reason for rejection</div>
            <p className="mt-1 text-foreground/80">{app.rejection_reason || "—"}</p>
          </div>
        )}

        {status === "reupload_required" && (
          <div className="mt-8 space-y-4">
            <div className="rounded-[14px] border bg-[oklch(0.97_0.03_260)] p-5 text-sm">
              <div className="font-medium text-primary">Documents need correction</div>
              <p className="mt-1 text-foreground/80">{app.admin_message}</p>
            </div>
            <div className="grid gap-4">
              {requestedDocs.map((docType) => (
                <ReuploadSlot
                  key={docType}
                  docType={docType}
                  onDone={() => {
                    qc.invalidateQueries({ queryKey: ["my-application"] });
                    refetch();
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Existing documents (view-only unless reupload requested) */}
        {data.documents.length > 0 && (
          <div className="mt-10 border-t pt-6">
            <div className="text-sm font-medium">Uploaded documents</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.documents.map((d: any) => (
                <DocumentRow
                  key={d.id}
                  docType={d.doc_type as DocType}
                  storagePath={d.storage_path}
                  fileName={d.file_name}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentRow({
  docType,
  storagePath,
  fileName,
}: {
  docType: DocType;
  storagePath: string;
  fileName: string;
}) {
  const getUrl = useServerFn(getMyDocumentUrl);
  const [loading, setLoading] = useState(false);
  async function open() {
    setLoading(true);
    try {
      const res = await getUrl({ data: { path: storagePath } });
      window.open(res.url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open document");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={open}
      className="flex items-center justify-between rounded-[12px] border bg-white px-3 py-2 text-left text-sm hover:bg-muted/40"
    >
      <div>
        <div className="font-medium">{DOCUMENT_LABELS[docType]}</div>
        <div className="text-xs text-muted-foreground">{fileName}</div>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="text-primary">View →</span>
      )}
    </button>
  );
}

function ReuploadSlot({ docType, onDone }: { docType: DocType; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const reupload = useServerFn(reuploadDocument);

  async function handleUpload() {
    if (!file) return;
    if (!(ALLOWED_DOCUMENT_MIME as readonly string[]).includes(file.type)) {
      toast.error("Unsupported file type");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than or equal to 1 MB.");
      return;
    }
    setUploading(true);
    try {
      // TEMPORARY: Save local preview/reference to bypass missing Firebase Storage
      const localRef = URL.createObjectURL(file);
      await reupload({
        data: {
          doc_type: docType,
          file_name: file.name,
          mime_type: file.type,
          base64: localRef,
        },
      });
      toast.success(`${DOCUMENT_LABELS[docType]} re-uploaded`);
      setFile(null);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-[14px] border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{DOCUMENT_LABELS[docType]}</div>
        {file && (
          <button
            onClick={() => setFile(null)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {file ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="truncate text-sm text-muted-foreground">{file.name}</div>
          <Button size="sm" onClick={handleUpload} disabled={uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </div>
      ) : (
        <label
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed py-6 text-sm text-muted-foreground hover:bg-muted/40",
          )}
        >
          <Upload className="mb-1 h-5 w-5" />
          <span>Click to select a new file</span>
          <span className="mt-1 text-[11px] text-muted-foreground">Upload image (Maximum size: 1 MB)</span>
          <input
            type="file"
            className="hidden"
            accept={ALLOWED_DOCUMENT_MIME.join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 1024 * 1024) {
                  toast.error("File size must be less than or equal to 1 MB.");
                  setFile(null);
                } else {
                  setFile(f);
                }
              }
            }}
          />
        </label>
      )}
    </div>
  );
}
