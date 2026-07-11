import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { listApplications } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/applications/")({
  ssr: false,
  component: AdminApplicationsPage,
});

function AdminApplicationsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        navigate({ to: "/admin/login" });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  const list = useServerFn(listApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => list({}),
    enabled: ready,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.application_code.toLowerCase().includes(q) ||
        r.shop_name.toLowerCase().includes(q) ||
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.mobile ?? "").includes(q)
      );
    });
  }, [data, search, statusFilter]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage all vendor applications.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>

      <div className="rounded-[22px] border bg-white shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, shop, mobile or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="reupload_required">Re-upload</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            No applications match your filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.application_code}</TableCell>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell>{r.shop_name}</TableCell>
                  <TableCell>+91 {r.mobile}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.submitted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status as never} size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/applications/$id" params={{ id: r.id }}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
