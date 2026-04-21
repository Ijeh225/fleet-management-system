import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_service: "Brake Service",
  engine_repair: "Engine Repair", electrical_repair: "Electrical Repair", suspension_work: "Suspension Work",
  gearbox_service: "Gearbox Service", body_repair: "Body Repair", general_servicing: "General Servicing", other: "Other",
};

export default function Maintenance() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  const { data: records = [] } = trpc.maintenance.list.useQuery();
  const { data: trucks = [] } = trpc.trucks.list.useQuery();

  const getTruck = (truckId: number) => trucks.find((t) => t.id === truckId);

  const filtered = records.filter((r) => {
    const truck = getTruck(r.truckId);
    const matchSearch = !search ||
      (truck?.truckCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (truck?.plateNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.technicianName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchType = serviceTypeFilter === "all" || r.serviceType === serviceTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totalCost = filtered.reduce((sum, r) => sum + parseFloat(String(r.totalCost ?? 0)), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Records</h1>
          <p className="text-muted-foreground text-sm mt-1">{records.length} total records</p>
        </div>
        <Button onClick={() => setLocation("/maintenance/add")} className="gap-2">
          <Plus className="h-4 w-4" /> New Record
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Records", count: records.length, color: "text-blue-600" },
          { label: "Pending", count: records.filter((r) => r.status === "pending").length, color: "text-blue-600" },
          { label: "In Progress", count: records.filter((r) => r.status === "in_progress").length, color: "text-orange-600" },
          { label: "Completed", count: records.filter((r) => r.status === "completed").length, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by truck, technician..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filtered.length} records · Total cost: <strong className="text-foreground">₦{totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Wrench className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No maintenance records found</p>
              <Button className="mt-4 gap-2" onClick={() => setLocation("/maintenance/add")}>
                <Plus className="h-4 w-4" /> Add First Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Truck</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Technician</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Labor Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parts Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((record) => {
                    const truck = getTruck(record.truckId);
                    return (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setLocation(`/maintenance/${record.id}`)}>
                        <td className="px-6 py-3 text-xs text-muted-foreground">
                          {record.maintenanceDate instanceof Date ? record.maintenanceDate.toLocaleDateString() : String(record.maintenanceDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-primary">{truck?.truckCode ?? `#${record.truckId}`}</p>
                            <p className="text-xs text-muted-foreground">{truck?.plateNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{SERVICE_TYPE_LABELS[record.serviceType] ?? record.serviceType}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.technicianName ?? "—"}</td>
                        <td className="px-4 py-3">₦{parseFloat(String(record.laborCost ?? 0)).toFixed(2)}</td>
                        <td className="px-4 py-3">₦{parseFloat(String(record.totalPartsCost ?? 0)).toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold">₦{parseFloat(String(record.totalCost ?? 0)).toFixed(2)}</td>
                        <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
