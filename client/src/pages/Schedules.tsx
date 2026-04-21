import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Calendar, CheckCircle2, Clock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const SERVICE_TYPES = [
  { value: "oil_change", label: "Oil Change" },
  { value: "tire_replacement", label: "Tire Replacement" },
  { value: "brake_service", label: "Brake Service" },
  { value: "engine_repair", label: "Engine Repair" },
  { value: "electrical_repair", label: "Electrical Repair" },
  { value: "suspension_work", label: "Suspension Work" },
  { value: "gearbox_service", label: "Gearbox Service" },
  { value: "body_repair", label: "Body Repair" },
  { value: "general_servicing", label: "General Servicing" },
  { value: "other", label: "Other" },
];

const SERVICE_TYPE_LABELS: Record<string, string> = Object.fromEntries(SERVICE_TYPES.map((t) => [t.value, t.label]));

export default function Schedules() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: schedules = [], refetch } = trpc.schedules.list.useQuery();
  const { data: trucks = [] } = trpc.trucks.list.useQuery();

  const createSchedule = trpc.schedules.create.useMutation({
    onSuccess: () => { toast.success("Schedule created"); setShowAddDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const completeSchedule = trpc.schedules.update.useMutation({
    onSuccess: () => { toast.success("Schedule marked complete"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    truckId: "", serviceType: "general_servicing" as const,
    nextServiceDate: "", notes: "",
  });

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const getStatus = (schedule: { nextServiceDate: Date | string }) => {
    const date = new Date(String(schedule.nextServiceDate));
    if (date < now) return "overdue";
    if (date <= sevenDaysLater) return "upcoming";
    return "scheduled";
  };

  const filtered = schedules.filter((s) => {
    if (filter === "all") return true;
    return getStatus(s) === filter;
  });

  const overdue = schedules.filter((s) => getStatus(s) === "overdue").length;
  const upcoming = schedules.filter((s) => getStatus(s) === "upcoming").length;
  const scheduled = schedules.filter((s) => getStatus(s) === "scheduled").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Schedules</h1>
          <p className="text-muted-foreground text-sm mt-1">{schedules.length} scheduled services</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Schedule Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("overdue")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("upcoming")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{upcoming}</p>
              <p className="text-xs text-muted-foreground">Due This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("scheduled")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{scheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "All" },
          { value: "overdue", label: "Overdue" },
          { value: "upcoming", label: "This Week" },
          { value: "scheduled", label: "Scheduled" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === tab.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No schedules found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Truck</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Service Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((schedule) => {
                    const truck = trucks.find((t) => t.id === schedule.truckId);
                    const status = getStatus(schedule);
                    const dateStr = schedule.nextServiceDate instanceof Date ? schedule.nextServiceDate.toLocaleDateString() : String(schedule.nextServiceDate);
                    return (
                      <tr key={schedule.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-primary cursor-pointer hover:underline" onClick={() => setLocation(`/trucks/${schedule.truckId}`)}>
                            {truck?.truckCode ?? `#${schedule.truckId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{truck?.plateNumber}</p>
                        </td>
                        <td className="px-4 py-3">{SERVICE_TYPE_LABELS[schedule.serviceType] ?? schedule.serviceType}</td>
                        <td className="px-4 py-3">
                          <span className={status === "overdue" ? "text-red-600 font-semibold" : status === "upcoming" ? "text-yellow-700 font-medium" : ""}>
                            {dateStr}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {status === "overdue" && <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"><AlertTriangle className="h-3 w-3" /> Overdue</span>}
                          {status === "upcoming" && <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5"><Clock className="h-3 w-3" /> Due Soon</span>}
                          {status === "scheduled" && <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle2 className="h-3 w-3" /> Scheduled</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => completeSchedule.mutate({ id: schedule.id, isCompleted: true })}
                            disabled={completeSchedule.isPending}
                          >
                            Mark Done
                          </Button>
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

      {/* Add Schedule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Service</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createSchedule.mutate({ truckId: parseInt(form.truckId), serviceType: form.serviceType, nextServiceDate: form.nextServiceDate, notes: form.notes || undefined }); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Truck *</Label>
              <Select value={form.truckId} onValueChange={(v) => setForm({ ...form, truckId: v })}>
                <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
                <SelectContent>
                  {trucks.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.truckCode} — {t.plateNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service Type *</Label>
              <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Next Service Date *</Label>
              <Input type="date" value={form.nextServiceDate} onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })} required />
            </div>

            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createSchedule.isPending}>{createSchedule.isPending ? "Scheduling..." : "Schedule"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
