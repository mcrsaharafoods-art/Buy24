import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, FileWarning } from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "reupload_required";

const CONFIG: Record<
  Status,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  approved: {
    label: "Application Approved",
    className:
      "bg-[oklch(0.95_0.06_155)] text-[oklch(0.35_0.15_155)] border-[oklch(0.85_0.09_155)]",
    icon: CheckCircle2,
  },
  pending: {
    label: "Application Under Review",
    className: "bg-[oklch(0.97_0.08_85)] text-[oklch(0.38_0.13_60)] border-[oklch(0.87_0.12_85)]",
    icon: Clock,
  },
  rejected: {
    label: "Application Rejected",
    className: "bg-[oklch(0.96_0.05_25)] text-[oklch(0.42_0.19_27)] border-[oklch(0.85_0.08_25)]",
    icon: XCircle,
  },
  reupload_required: {
    label: "Re-upload Required",
    className:
      "bg-[oklch(0.96_0.05_260)] text-[oklch(0.38_0.15_260)] border-[oklch(0.85_0.08_260)]",
    icon: FileWarning,
  },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: Status;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3 py-1.5 text-sm",
        size === "lg" && "px-4 py-2 text-base",
        cfg.className,
      )}
    >
      <Icon className={cn(size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
      {cfg.label}
    </span>
  );
}
