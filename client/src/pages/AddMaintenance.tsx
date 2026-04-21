import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, Wrench } from "lucide-react";
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

type PartUsed = { partId: string; quantity: string; unitCost: string };

export default function AddMaintenance() {
  const [, setLocation] = useLocation();
  const { data: trucks = [] } = trpc.trucks.list.useQuery();
  const { data: parts = [] } = trpc.parts.listWithBalance.useQuery();

  const createMaintenance = trpc.maintenance.create.useMutation({
    onSuccess: (id) => {
      toast.success("Maintenance record created");
      setLocation(`/maintenance/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    truckId: "",
    maintenanceDate: new Date().toISOString().split("T")[0],
    serviceType: "general_servicing" as const,
    issueReported: "",
    diagnosis: "",
    workPerformed: "",
    technicianName: "",
    laborCost: "0",
    mileageAtService: "",
    downtimeDuration: "",
    nextServiceDate: "",
    status: "pending" as const,
    notes: "",
  });

  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);

  const addPartRow = () => setPartsUsed([...partsUsed, { partId: "", quantity: "1", unitCost: "" }]);
  const removePartRow = (i: number) => setPartsUsed(partsUsed.filter((_, idx) => idx !== i));
  const updatePartRow = (i: number, field: keyof PartUsed, value: string) => {
    const updated = [...partsUsed];
    updated[i] = { ...updated[i], [field]: value };
    if (field === "partId" && value) {
      const part = parts.find((p) => p.id === parseInt(value));
      if (part) updated[i].unitCost = String(part.unitCost ?? "0");
    }
    setPartsUsed(updated);
  };

  const totalPartsCost = partsUsed.reduce((sum, p) => {
    return sum + (parseFloat(p.quantity || "0") * parseFloat(p.unitCost || "0"));
  }, 0);
  const totalCost = parseFloat(form.laborCost || "0") + totalPartsCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truckId) { toast.error("Please select a truck"); return; }
    createMaintenance.mutate({
      truckId: parseInt(form.truckId),
      maintenanceDate: form.maintenanceDate,
      serviceType: form.serviceType,
      issueReported: form.issueReported || undefined,
      diagnosis: form.diagnosis || undefined,
      workPerformed: form.workPerformed || undefined,
      technicianName: form.technicianName || undefined,
      laborCost: form.laborCost,
      mileageAtService: form.mileageAtService ? parseInt(form.mileageAtService) : undefined,
      downtimeDuration: form.downtimeDuration ? parseInt(form.downtimeDuration) : undefined,
      nextServiceDate: form.nextServiceDate || undefined,
      status: form.status,
      notes: form.notes || undefined,
      partsUsed: partsUsed
        .filter((p) => p.partId && p.quantity)
        .map((p) => ({ partId: parseInt(p.partId), quantity: parseInt(p.quantity), unitCost: parseFloat(p.unitCost || "0") })),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/maintenance")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Maintenance Record</h1>
          <p className="text-muted-foreground text-sm mt-1">Log a service or repair event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Date *</Label>
                <Input type="date" value={form.maintenanceDate} onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })} required />
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Technician Name</Label>
                <Input value={form.technicianName} onChange={(e) => setForm({ ...form, technicianName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mileage at Service (km)</Label>
                <Input type="number" value={form.mileageAtService} onChange={(e) => setForm({ ...form, mileageAtService: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Downtime Duration (hours)</Label>
                <Input type="number" value={form.downtimeDuration} onChange={(e) => setForm({ ...form, downtimeDuration: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Service Date</Label>
                <Input type="date" value={form.nextServiceDate} onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Issue Reported</Label>
              <Textarea rows={2} value={form.issueReported} onChange={(e) => setForm({ ...form, issueReported: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Work Performed</Label>
              <Textarea rows={3} value={form.workPerformed} onChange={(e) => setForm({ ...form, workPerformed: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        {/* Parts Used */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Parts Used</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addPartRow} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Part
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {partsUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No parts added yet</p>
            ) : (
              <div className="space-y-3">
                {partsUsed.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      {i === 0 && <Label className="text-xs">Part</Label>}
                      <Select value={row.partId} onValueChange={(v) => updatePartRow(i, "partId", v)}>
                        <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
                        <SelectContent>
                          {parts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} (Stock: {p.quantityInStock ?? 0})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      {i === 0 && <Label className="text-xs">Qty</Label>}
                      <Input type="number" min="1" value={row.quantity} onChange={(e) => updatePartRow(i, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      {i === 0 && <Label className="text-xs">Unit Cost (₦)</Label>}
                      <Input type="number" step="0.01" value={row.unitCost} onChange={(e) => updatePartRow(i, "unitCost", e.target.value)} />
                    </div>
                    <div className="col-span-1 space-y-1">
                      {i === 0 && <Label className="text-xs">Total</Label>}
                      <p className="text-sm font-medium py-2">₦{(parseFloat(row.quantity || "0") * parseFloat(row.unitCost || "0")).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive" onClick={() => removePartRow(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Labor Cost (₦)</Label>
                <Input type="number" step="0.01" value={form.laborCost} onChange={(e) => setForm({ ...form, laborCost: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Parts Cost (auto-calculated)</Label>
                <Input value={`₦${totalPartsCost.toFixed(2)}`} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-semibold">Total Cost</span>
              <span className="text-xl font-bold text-primary">₦{totalCost.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setLocation("/maintenance")}>Cancel</Button>
          <Button type="submit" disabled={createMaintenance.isPending} className="gap-2">
            <Wrench className="h-4 w-4" />
            {createMaintenance.isPending ? "Saving..." : "Save Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}
