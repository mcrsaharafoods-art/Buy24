import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import {
  approveApplication,
  getAdminDocumentUrl,
  getApplicationDetail,
  rejectApplication,
  requestReupload,
} from "@/lib/admin.functions";
import { getVendorProductsAdmin } from "@/lib/product.functions";
import { ALL_DOCUMENTS, DOCUMENT_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/admin/applications/$id")({
  ssr: false,
  component: AdminApplicationDetailPage,
});

type DocType = "aadhaar" | "pan" | "shop_photo" | "shop_license" | "cancelled_cheque";

function AdminApplicationDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Fetch data using server functions
      setReady(true);
    })();
  }, [navigate]);

  const getDetail = useServerFn(getApplicationDetail);
  const approve = useServerFn(approveApplication);
  const reject = useServerFn(rejectApplication);
  const reupload = useServerFn(requestReupload);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-app", id],
    queryFn: () => getDetail({ data: { id } }),
    enabled: ready,
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reuploadOpen, setReuploadOpen] = useState(false);
  const [reuploadDocs, setReuploadDocs] = useState<DocType[]>([]);
  const [reuploadMsg, setReuploadMsg] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | "reupload" | null>(null);

  if (!ready || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  const { application: app, profile, documents, history } = data;
  const status = app.status as "pending" | "approved" | "rejected" | "reupload_required";

  async function doApprove() {
    setBusy("approve");
    try {
      await approve({ data: { id } });
      toast.success("Application approved");
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setBusy(null);
    }
  }

  async function doReject() {
    if (rejectReason.trim().length < 5) {
      toast.error("Please enter a reason");
      return;
    }
    setBusy("reject");
    try {
      await reject({ data: { id, reason: rejectReason.trim() } });
      toast.success("Application rejected");
      setRejectOpen(false);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setBusy(null);
    }
  }

  async function doReupload() {
    if (reuploadDocs.length === 0) {
      toast.error("Select at least one document");
      return;
    }
    if (reuploadMsg.trim().length < 5) {
      toast.error("Please enter a message");
      return;
    }
    setBusy("reupload");
    try {
      await reupload({ data: { id, doc_types: reuploadDocs, message: reuploadMsg.trim() } });
      toast.success("Re-upload requested");
      setReuploadOpen(false);
      setReuploadDocs([]);
      setReuploadMsg("");
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/admin/applications"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {app.application_code}
                </div>
                <h1 className="mt-1 text-2xl font-semibold">{app.shop_name}</h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {profile?.full_name} · +91 {profile?.mobile}
                </div>
              </div>
              <StatusBadge status={status} />
            </div>
          </section>

          <DetailBlock title="Applicant">
            <Row k="Full Name" v={profile?.full_name} />
            <Row k="Mobile" v={`+91 ${profile?.mobile}`} />
            <Row k="Email" v={profile?.email || "—"} />
          </DetailBlock>

          <DetailBlock title="Business">
            <Row k="Shop Name" v={app.shop_name} />
            <Row k="Seller Type" v={app.seller_type} />
            <Row k="GST Number" v={app.gst_number || "—"} />
            <Row k="FSSAI Number" v={app.fssai_number || "—"} />
          </DetailBlock>

          <DetailBlock title="Address">
            <Row k="State" v={app.state} />
            <Row k="District" v={app.district} />
            <Row k="City" v={app.city} />
            <Row k="Pincode" v={app.pincode} />
            {app.address_line && <Row k="Address" v={app.address_line} full />}
            {app.latitude && app.longitude && (
              <Row
                k="Map"
                v={
                  <a
                    href={`https://www.google.com/maps?q=${app.latitude},${app.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {app.latitude}, {app.longitude}
                  </a>
                }
              />
            )}
          </DetailBlock>

          <DetailBlock title="Bank">
            <Row k="Account Holder" v={app.account_holder_name} />
            <Row k="Bank Name" v={app.bank_name} />
            <Row k="Account Number" v={app.account_number} />
            <Row k="IFSC" v={app.ifsc} />
            <Row k="UPI ID" v={app.upi_id || "—"} />
          </DetailBlock>

          <DetailBlock title="Operations">
            <Row k="Delivery Radius" v={`${app.delivery_radius_km} km`} />
            <Row k="Opening Time" v={app.opening_time} />
            <Row k="Closing Time" v={app.closing_time} />
            <Row k="Home Delivery" v={app.home_delivery ? "Yes" : "No"} />
            <Row k="Pickup Available" v={app.pickup_available ? "Yes" : "No"} />
          </DetailBlock>

          <DetailBlock title="Documents">
            <div className="col-span-2 grid gap-3 sm:grid-cols-2">
              {documents.map((d: any) => (
                <AdminDocRow
                  key={d.id}
                  docType={d.doc_type as DocType}
                  storagePath={d.storage_path}
                  fileName={d.file_name}
                  mimeType={d.mime_type}
                />
              ))}
              {documents.length === 0 && (
                <div className="text-sm text-muted-foreground">No documents uploaded.</div>
              )}
            </div>
          </DetailBlock>

          {app.rejection_reason && (
            <div className="rounded-[14px] border border-destructive/30 bg-[oklch(0.97_0.03_25)] p-4 text-sm">
              <div className="font-medium text-destructive">Rejection reason</div>
              <div className="mt-1">{app.rejection_reason}</div>
            </div>
          )}
          {app.admin_message && status === "reupload_required" && (
            <div className="rounded-[14px] border bg-primary/5 p-4 text-sm">
              <div className="font-medium text-primary">Re-upload message</div>
              <div className="mt-1">{app.admin_message}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Pending:{" "}
                {(app.requested_reupload_docs ?? [])
                  .map((d: string) => DOCUMENT_LABELS[d])
                  .join(", ")}
              </div>
            </div>
          )}

          {status === "approved" && <ProductsSummary vendorId={app.user_id} />}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[22px] border bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm font-medium">Actions</div>
            <div className="mt-3 space-y-2">
              <Button
                className="w-full"
                onClick={doApprove}
                disabled={busy !== null || status === "approved"}
              >
                {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={busy !== null || status === "rejected"}
              >
                Reject
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setReuploadOpen(true)}
                disabled={busy !== null}
              >
                Request Re-upload
              </Button>
            </div>
          </div>

          <div className="rounded-[22px] border bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm font-medium">History</div>
            <ol className="mt-3 space-y-3">
              {history.map((h: any) => (
                <li key={h.id} className="text-sm">
                  <div className="font-medium capitalize">{h.to_status.replace("_", " ")}</div>
                  {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
              {history.length === 0 && (
                <li className="text-sm text-muted-foreground">No history yet.</li>
              )}
            </ol>
          </div>
        </aside>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection reason</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Explain why the application is being rejected. The vendor will see this."
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doReject} disabled={busy === "reject"}>
              {busy === "reject" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reupload dialog */}
      <Dialog open={reuploadOpen} onOpenChange={setReuploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request document re-upload</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Select documents</label>
              <div className="space-y-2">
                {ALL_DOCUMENTS.map((doc) => (
                  <label key={doc} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={reuploadDocs.includes(doc)}
                      onCheckedChange={(v) =>
                        setReuploadDocs((prev) =>
                          v === true ? [...prev, doc] : prev.filter((d) => d !== doc),
                        )
                      }
                    />
                    {DOCUMENT_LABELS[doc]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Admin Message</label>
              <Textarea
                value={reuploadMsg}
                onChange={(e) => setReuploadMsg(e.target.value)}
                rows={3}
                placeholder="Tell the vendor what needs to be corrected."
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReuploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doReupload} disabled={busy === "reupload"}>
              {busy === "reupload" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4 text-sm font-medium">{title}</div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ k, v, full }: { k: string; v: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize">{v ?? "—"}</dd>
    </div>
  );
}

function AdminDocRow({
  docType,
  storagePath,
  fileName,
  mimeType,
}: {
  docType: DocType;
  storagePath: string;
  fileName: string;
  mimeType: string;
}) {
  const getUrl = useServerFn(getAdminDocumentUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getUrl({ data: { path: storagePath } })
      .then((res) => {
        if (alive) setUrl(res.url);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [storagePath, getUrl]);

  const isImage = mimeType.startsWith("image/");

  return (
    <div className="rounded-[14px] border bg-white p-3">
      <div className="mb-2 text-sm font-medium">{DOCUMENT_LABELS[docType]}</div>
      {loading || !url ? (
        <div className="flex h-32 items-center justify-center rounded-md bg-muted/40">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : isImage ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={docType} className="h-32 w-full rounded-md border object-cover" />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-32 items-center justify-center rounded-md border bg-muted/40 text-sm text-primary hover:underline"
        >
          Open PDF ({fileName})
        </a>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{fileName}</span>
        {url && (
          <a href={url} download={fileName} className="text-primary hover:underline">
            Download
          </a>
        )}
      </div>
    </div>
  );
}

function ProductsSummary({ vendorId }: { vendorId: string }) {
  const getProds = useServerFn(getVendorProductsAdmin);
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-vendor-products", vendorId],
    queryFn: () => getProds({ data: { vendorId } }),
  });

  if (isLoading) {
    return (
      <DetailBlock title="Products Summary">
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </DetailBlock>
    );
  }

  if (!products || products.length === 0) {
    return (
      <DetailBlock title="Products Summary">
        <div className="col-span-2 py-4 text-center text-sm text-muted-foreground">
          This vendor has not uploaded any products yet.
        </div>
      </DetailBlock>
    );
  }

  return (
    <DetailBlock title={`Products Summary (${products.length})`}>
      <div className="col-span-2 space-y-4">
        {}
        {products.map((p: any) => (
          <div key={p.id} className="flex items-center gap-4 rounded-md border p-3">
            {p.images?.[0] ? (
              <img
                src={p.images[0]}
                className="h-12 w-12 rounded-md object-cover border"
                alt={p.name}
              />
            ) : (
              <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                No Img
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {p.category} · Stock: {p.stock}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">₹{p.selling_price}</div>
              <div className="text-xs text-muted-foreground">
                {p.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-gray-500">Inactive</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DetailBlock>
  );
}
