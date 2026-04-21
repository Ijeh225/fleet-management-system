import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit, Truck, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_service: "Brake Service",
  engine_repair: "Engine Repair", electrical_repair: "Electrical Repair", suspension_work: "Suspension Work",
  gearbox_service: "Gearbox Service", body_repair: "Body Repair", general_servicing: "General Servicing", other: "Other",
};

export default function MaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const recordId = parseInt(id ?? "0");
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: record, refetch } = trpc.maintenance.get.useQuery({ id: recordId });
  const { data: partsUsed = [] } = trpc.maintenance.getParts.useQuery({ maintenanceId: recordId });
  const { data: trucks = [] } = trpc.trucks.list.useQuery();

  const updateMaintenance = trpc.maintenance.update.useMutation({
    onSuccess: () => { toast.success("Record updated"); setShowEditDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [editForm, setEditForm] = useState<any>(null);

  const openEdit = () => {
    if (!record) return;
    setEditForm({
      status: record.status,
      technicianName: record.technicianName ?? "",
      diagnosis: record.diagnosis ?? "",
      workPerformed: record.workPerformed ?? "",
      laborCost: String(record.laborCost ?? "0"),
      nextServiceDate: record.nextServiceDate instanceof Date ? record.nextServiceDate.toISOString().split("T")[0] : String(record.nextServiceDate ?? ""),
      notes: record.notes ?? "",
    });
    setShowEditDialog(true);
  };

  if (!record) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/maintenance")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center justify-center py-20 text-muted-foreground"><p>Record not found</p></div>
      </div>
    );
  }

  const truck = trucks.find((t) => t.id === record.truckId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/maintenance")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Maintenance #{record.id}</h1>
              <StatusBadge status={record.status} />
            </div>
            <p className="text-muted-foreground text-sm">{SERVICE_TYPE_LABELS[record.serviceType] ?? record.serviceType} · {record.maintenanceDate instanceof Date ? record.maintenanceDate.toLocaleDateString() : String(record.maintenanceDate)}</p>
          </div>
        </div>
        <Button variant="outline" onClick={openEdit} className="gap-2">
          <Edit className="h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Service Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Service Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Service Type", SERVICE_TYPE_LABELS[record.serviceType] ?? record.serviceType],
                  ["Status", <StatusBadge key="s" status={record.status} />],
                  ["Date", record.maintenanceDate instanceof Date ? record.maintenanceDate.toLocaleDateString() : String(record.maintenanceDate)],
                  ["Technician", record.technicianName ?? "—"],
                  ["Mileage at Service", record.mileageAtService ? `${record.mileageAtService.toLocaleString()} km` : "—"],
                  ["Downtime", record.downtimeDuration ? `${record.downtimeDuration} hours` : "—"],
                  ["Next Service Date", record.nextServiceDate instanceof Date ? record.nextServiceDate.toLocaleDateString() : String(record.nextServiceDate ?? "—")],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <div className="font-medium mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
              {record.issueReported && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-muted-foreground text-xs">Issue Reported</p>
                  <p className="text-sm mt-1">{record.issueReported}</p>
                </div>
              )}
              {record.diagnosis && (
                <div className="mt-3">
                  <p className="text-muted-foreground text-xs">Diagnosis</p>
                  <p className="text-sm mt-1">{record.diagnosis}</p>
                </div>
              )}
              {record.workPerformed && (
                <div className="mt-3">
                  <p className="text-muted-foreground text-xs">Work Performed</p>
                  <p className="text-sm mt-1">{record.workPerformed}</p>
                </div>
              )}
              {record.notes && (
                <div className="mt-3">
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="text-sm mt-1">{record.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parts Used */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parts Used</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {partsUsed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No parts used in this record</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-6 py-3 font-medium text-muted-foreground">Part</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Qty</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit Cost</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {partsUsed.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-medium">Part #{p.partId}</td>
                          <td className="px-4 py-3">{p.quantity}</td>
                          <td className="px-4 py-3">₦{parseFloat(String(p.unitCost)).toFixed(2)}</td>
                          <td className="px-4 py-3 font-semibold">₦{parseFloat(String(p.totalCost)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cost summary + truck */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor Cost</span>
                <span className="font-medium">₦{parseFloat(String(record.laborCost ?? 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts Cost</span>
                <span className="font-medium">₦{parseFloat(String(record.totalPartsCost ?? 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Total Cost</span>
                <span className="text-xl font-bold text-primary">₦{parseFloat(String(record.totalCost ?? 0)).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {truck && (
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/trucks/${truck.id}`)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Vehicle</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <p className="text-muted-foreground text-xs">Truck Code</p>
                  <p className="font-semibold text-primary">{truck.truckCode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Plate Number</p>
                  <p className="font-medium font-mono text-xs">{truck.plateNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Brand / Model</p>
                  <p className="font-medium">{[truck.brand, truck.model].filter(Boolean).join(" ") || "—"}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {editForm && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Update Maintenance Record</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); updateMaintenance.mutate({ id: recordId, ...editForm }); }} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Technician</Label><Input value={editForm.technicianName} onChange={(e) => setEditForm({ ...editForm, technicianName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Labor Cost ($)</Label><Input type="number" step="0.01" value={editForm.laborCost} onChange={(e) => setEditForm({ ...editForm, laborCost: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Diagnosis</Label><Textarea rows={2} value={editForm.diagnosis} onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Work Performed</Label><Textarea rows={3} value={editForm.workPerformed} onChange={(e) => setEditForm({ ...editForm, workPerformed: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Next Service Date</Label><Input type="date" value={editForm.nextServiceDate} onChange={(e) => setEditForm({ ...editForm, nextServiceDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMaintenance.isPending}>{updateMaintenance.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
