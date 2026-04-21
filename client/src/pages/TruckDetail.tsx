import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Edit, Truck, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_service: "Brake Service",
  engine_repair: "Engine Repair", electrical_repair: "Electrical Repair", suspension_work: "Suspension Work",
  gearbox_service: "Gearbox Service", body_repair: "Body Repair", general_servicing: "General Servicing", other: "Other",
};

export default function TruckDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const truckId = parseInt(id ?? "0");
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: truck, refetch } = trpc.trucks.get.useQuery({ id: truckId });
  const { data: maintenance = [] } = trpc.trucks.maintenanceHistory.useQuery({ truckId });
  const { data: schedules = [] } = trpc.trucks.serviceSchedules.useQuery({ truckId });
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const updateTruck = trpc.trucks.update.useMutation({
    onSuccess: () => { toast.success("Truck updated"); setShowEditDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const archiveTruck = trpc.trucks.archive.useMutation({
    onSuccess: () => { toast.success("Truck archived"); setLocation("/trucks"); },
    onError: (e) => toast.error(e.message),
  });

  const [editForm, setEditForm] = useState<any>(null);

  const openEdit = () => {
    if (!truck) return;
    setEditForm({
      truckCode: truck.truckCode, plateNumber: truck.plateNumber,
      brand: truck.brand ?? "", model: truck.model ?? "", year: truck.year ? String(truck.year) : "",
      color: truck.color ?? "", mileage: truck.mileage ? String(truck.mileage) : "",
      fuelType: truck.fuelType ?? "diesel", status: truck.status,
      assignedDriverId: truck.assignedDriverId ? String(truck.assignedDriverId) : "",
      insuranceExpiry: truck.insuranceExpiry instanceof Date ? truck.insuranceExpiry.toISOString().split("T")[0] : String(truck.insuranceExpiry ?? ""),
      roadworthinessExpiry: truck.roadworthinessExpiry instanceof Date ? truck.roadworthinessExpiry.toISOString().split("T")[0] : String(truck.roadworthinessExpiry ?? ""),
      notes: truck.notes ?? "",
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    updateTruck.mutate({
      id: truckId,
      ...editForm,
      year: editForm.year ? parseInt(editForm.year) : undefined,
      mileage: editForm.mileage ? parseInt(editForm.mileage) : undefined,
      assignedDriverId: editForm.assignedDriverId && editForm.assignedDriverId !== "none" ? parseInt(editForm.assignedDriverId) : null,
    });
  };

  if (!truck) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/trucks")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Trucks
        </Button>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <p>Truck not found</p>
        </div>
      </div>
    );
  }

  const assignedDriver = drivers.find((d) => d.id === truck.assignedDriverId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/trucks")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{truck.truckCode}</h1>
              <StatusBadge status={truck.status} />
            </div>
            <p className="text-muted-foreground text-sm">{truck.plateNumber} · {[truck.brand, truck.model].filter(Boolean).join(" ")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit} className="gap-2">
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Archive this truck?")) archiveTruck.mutate({ id: truckId }); }}>
            Archive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Truck info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Truck Code", truck.truckCode],
                  ["Plate Number", truck.plateNumber],
                  ["VIN / Chassis", truck.vin ?? "—"],
                  ["Engine Number", truck.engineNumber ?? "—"],
                  ["Brand", truck.brand ?? "—"],
                  ["Model", truck.model ?? "—"],
                  ["Year", truck.year ?? "—"],
                  ["Color", truck.color ?? "—"],
                  ["Fuel Type", truck.fuelType ?? "—"],
                  ["Mileage", truck.mileage ? `${truck.mileage.toLocaleString()} km` : "—"],
                  ["Purchase Date", truck.purchaseDate instanceof Date ? truck.purchaseDate.toLocaleDateString() : String(truck.purchaseDate ?? "—")],
                  ["Assigned Driver", assignedDriver?.name ?? "—"],
                  ["Insurance Expiry", truck.insuranceExpiry instanceof Date ? truck.insuranceExpiry.toLocaleDateString() : String(truck.insuranceExpiry ?? "—")],
                  ["Roadworthiness Expiry", truck.roadworthinessExpiry instanceof Date ? truck.roadworthinessExpiry.toLocaleDateString() : String(truck.roadworthinessExpiry ?? "—")],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="font-medium mt-0.5">{String(value)}</p>
                  </div>
                ))}
              </div>
              {truck.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="text-sm mt-1">{truck.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance history */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Maintenance History</CardTitle>
                <Button size="sm" onClick={() => setLocation("/maintenance/add")} className="gap-1">
                  <Wrench className="h-3 w-3" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {maintenance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Wrench className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No maintenance records yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {maintenance.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 cursor-pointer" onClick={() => setLocation(`/maintenance/${m.id}`)}>
                      <div>
                        <p className="text-sm font-medium">{SERVICE_TYPE_LABELS[m.serviceType] ?? m.serviceType}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.maintenanceDate instanceof Date ? m.maintenanceDate.toLocaleDateString() : String(m.maintenanceDate)} · {m.technicianName ?? "—"} · ${parseFloat(String(m.totalCost ?? 0)).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Service schedules */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Upcoming Services</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground px-4">
                  <Calendar className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm text-center">No upcoming services scheduled</p>
                </div>
              ) : (
                <div className="divide-y">
                  {schedules.map((s) => {
                    const dateStr = s.nextServiceDate instanceof Date ? s.nextServiceDate.toLocaleDateString() : String(s.nextServiceDate);
                    const isOverdue = new Date(String(s.nextServiceDate)) < new Date();
                    return (
                      <div key={s.id} className="px-6 py-3">
                        <p className="text-sm font-medium">{SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}</p>
                        <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {isOverdue ? "OVERDUE · " : ""}{dateStr}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {editForm && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Truck</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Truck Code *</Label><Input value={editForm.truckCode} onChange={(e) => setEditForm({ ...editForm, truckCode: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Plate Number *</Label><Input value={editForm.plateNumber} onChange={(e) => setEditForm({ ...editForm, plateNumber: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Brand</Label><Input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Model</Label><Input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Mileage (km)</Label><Input type="number" value={editForm.mileage} onChange={(e) => setEditForm({ ...editForm, mileage: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned Driver</Label>
                  <Select value={editForm.assignedDriverId || "none"} onValueChange={(v) => setEditForm({ ...editForm, assignedDriverId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No driver</SelectItem>
                      {drivers.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Insurance Expiry</Label><Input type="date" value={editForm.insuranceExpiry} onChange={(e) => setEditForm({ ...editForm, insuranceExpiry: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Roadworthiness Expiry</Label><Input type="date" value={editForm.roadworthinessExpiry} onChange={(e) => setEditForm({ ...editForm, roadworthinessExpiry: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={updateTruck.isPending}>{updateTruck.isPending ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
