import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { PackageMinus, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StockRemoval() {
  const [search, setSearch] = useState("");
  const [partFilter, setPartFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    partId: "",
    quantity: "1",
    truckId: "",
    driverId: "",
    issueDate: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: issues = [], isLoading } = trpc.stockIssues.list.useQuery();
  const { data: parts = [] } = trpc.parts.listWithBalance.useQuery();
  const { data: trucks = [] } = trpc.trucks.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const createIssue = trpc.stockIssues.create.useMutation({
    onSuccess: () => {
      utils.stockIssues.list.invalidate();
      utils.parts.listWithBalance.invalidate();
      utils.parts.balance.invalidate();
      toast.success("Stock issued successfully");
      setShowDialog(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteIssue = trpc.stockIssues.delete.useMutation({
    onSuccess: () => {
      utils.stockIssues.list.invalidate();
      utils.parts.listWithBalance.invalidate();
      toast.success("Issue record deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({
    partId: "", quantity: "1", truckId: "", driverId: "",
    issueDate: new Date().toISOString().split("T")[0],
    reason: "", notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partId) { toast.error("Please select a part"); return; }
    if (!form.truckId) { toast.error("Please select a truck"); return; }
    const selectedPart = parts.find((p) => p.id === parseInt(form.partId));
    const available = selectedPart?.quantityInStock ?? 0;
    const requested = parseInt(form.quantity);
    if (requested > available) {
      toast.error(`Insufficient stock. Available: ${available}, Requested: ${requested}`);
      return;
    }
    createIssue.mutate({
      partId: parseInt(form.partId),
      quantity: requested,
      truckId: parseInt(form.truckId),
      driverId: form.driverId ? parseInt(form.driverId) : undefined,
      issueDate: form.issueDate,
      reason: form.reason || undefined,
      notes: form.notes || undefined,
    });
  };

  const getPartName = (id: number) => parts.find((p) => p.id === id)?.name ?? `Part #${id}`;
  const getTruckLabel = (id: number) => {
    const t = trucks.find((t) => t.id === id);
    return t ? `${t.truckCode} — ${t.plateNumber}` : `Truck #${id}`;
  };
  const getDriverName = (id: number | null) => id ? (drivers.find((d) => d.id === id)?.name ?? "—") : "—";

  const filtered = (issues as any[]).filter((r) => {
    const partName = getPartName(r.partId).toLowerCase();
    const matchSearch = !search || partName.includes(search.toLowerCase()) || (r.reason ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPart = partFilter === "all" || String(r.partId) === partFilter;
    return matchSearch && matchPart;
  });

  const totalIssued = (issues as any[]).reduce((sum, r) => sum + r.quantity, 0);

  const selectedPart = form.partId ? parts.find((p) => p.id === parseInt(form.partId)) : null;
  const availableStock = selectedPart?.quantityInStock ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Removal (Issue Parts)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Issue parts from stock to a specific truck and driver. Each entry reduces the stock balance.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2 shrink-0 bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" /> Issue Parts
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Issues", value: (issues as any[]).length, color: "bg-red-100 text-red-600" },
          { label: "Total Units Issued", value: totalIssued, color: "bg-orange-100 text-orange-600" },
          { label: "Parts Available", value: parts.filter((p) => (p.quantityInStock ?? 0) > 0).length, color: "bg-emerald-100 text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}><PackageMinus className="h-4 w-4" /></div>
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by part name or reason..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={partFilter} onValueChange={setPartFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="All Parts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parts</SelectItem>
            {parts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground"><p className="text-sm">Loading issues...</p></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <PackageMinus className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No stock issues found</p>
              <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} className="mt-2 gap-1"><Plus className="h-3 w-3" />Issue Parts</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Part</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Qty Issued</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Truck</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.issueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{getPartName(r.partId)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-red-700">-{r.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">{getTruckLabel(r.truckId)}</td>
                      <td className="px-4 py-3 text-xs">{getDriverName(r.driverId)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.reason ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { if (confirm("Delete this issue record? This will restore the stock balance.")) deleteIssue.mutate({ id: r.id }); }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Parts Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5 text-red-600" /> Issue Parts from Stock
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Part *</Label>
              <Select value={form.partId} onValueChange={(v) => setForm({ ...form, partId: v, quantity: "1" })}>
                <SelectTrigger><SelectValue placeholder="Select part to issue" /></SelectTrigger>
                <SelectContent>
                  {parts.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} disabled={(p.quantityInStock ?? 0) === 0}>
                      {p.name} — Stock: {p.quantityInStock ?? 0} {(p.quantityInStock ?? 0) === 0 ? "(Out of stock)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPart && (
                <p className={`text-xs mt-1 ${availableStock === 0 ? "text-red-600" : availableStock <= (selectedPart.minimumStockLevel ?? 5) ? "text-amber-600" : "text-emerald-600"}`}>
                  Available stock: <strong>{availableStock}</strong> {selectedPart.unitType ?? "units"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Quantity to Issue *</Label>
              <Input
                type="number" min="1" max={availableStock || undefined}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
              {form.partId && parseInt(form.quantity) > availableStock && (
                <p className="text-xs text-red-600">Cannot exceed available stock of {availableStock}</p>
              )}
            </div>
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
              <Label>Driver</Label>
              <Select value={form.driverId} onValueChange={(v) => setForm({ ...form, driverId: v })}>
                <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issue Date *</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Scheduled maintenance, breakdown repair" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button
                type="submit"
                disabled={createIssue.isPending || (!!form.partId && parseInt(form.quantity) > availableStock)}
                className="bg-red-600 hover:bg-red-700"
              >
                {createIssue.isPending ? "Saving..." : "Issue Parts"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
