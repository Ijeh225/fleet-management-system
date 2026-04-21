import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "truck", label: "Trucks" },
  { value: "driver", label: "Drivers" },
  { value: "part", label: "Parts" },
  { value: "stock_receipt", label: "Stock Receipts" },
  { value: "stock_issue", label: "Stock Issues" },
  { value: "maintenance", label: "Maintenance" },
  { value: "schedule", label: "Service Schedules" },
  { value: "supplier", label: "Suppliers" },
  { value: "user", label: "Users" },
  { value: "purchase_order", label: "Purchase Orders" },
];

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700 border-green-200",
  updated: "bg-blue-100 text-blue-700 border-blue-200",
  deleted: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-orange-100 text-orange-700 border-orange-200",
  login: "bg-purple-100 text-purple-700 border-purple-200",
  logout: "bg-gray-100 text-gray-600 border-gray-200",
  imported: "bg-teal-100 text-teal-700 border-teal-200",
  status_changed: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function getActionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : "bg-gray-100 text-gray-600 border-gray-200";
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntityType(entityType: string): string {
  return entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try { return JSON.parse(details); } catch { return {}; }
}

const PAGE_SIZE = 50;

export default function AuditTrail() {
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: logs = [], isLoading, refetch } = trpc.audit.list.useQuery({
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: usersList = [] } = trpc.users.list.useQuery();

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(s) ||
      log.entityType.toLowerCase().includes(s) ||
      (log.userName ?? "").toLowerCase().includes(s) ||
      String(log.entityId ?? "").includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Complete record of all system actions
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: logs.length >= PAGE_SIZE ? `${PAGE_SIZE}+` : logs.length, icon: Activity, color: "text-primary" },
          { label: "Unique Users", value: new Set(logs.map((l) => l.userId)).size, icon: ShieldCheck, color: "text-green-600" },
          { label: "Entity Types", value: new Set(logs.map((l) => l.entityType)).size, icon: Filter, color: "text-blue-600" },
          { label: "Page", value: `${page + 1}`, icon: ChevronRight, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, entity, user..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" /> Loading audit logs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No audit events found</p>
              <p className="text-sm mt-1">Actions performed in the system will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((log) => {
                    const details = parseDetails(log.details);
                    const performedBy = details.performedBy as string | undefined;
                    const displayName = log.userName ?? performedBy ?? "System";
                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {log.createdAt instanceof Date
                            ? log.createdAt.toLocaleString()
                            : new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{displayName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${getActionColor(log.action)}`}
                          >
                            {formatAction(log.action)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {formatEntityType(log.entityType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                          {log.entityId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[300px] truncate">
                          {Object.entries(details)
                            .filter(([k]) => k !== "performedBy")
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {logs.length} events on this page
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={logs.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
