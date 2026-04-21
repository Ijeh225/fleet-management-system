import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAuth } from "@/_core/hooks/useAuth";
import { PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);

  // Form state — category selection drives the part dropdown
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [form, setForm] = useState({
    partId: "",
    quantity: "1",
    unitCost: "",
    supplierId: "",
    receiptDate: new Date().toISOString().split("T")[0],
    purchaseReference: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: receipts = [], isLoading } = trpc.inventory.list.useQuery();
  const { data: allParts = [] } = trpc.parts.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  // Filter parts by selected category in the form
  const partsInCategory = useMemo(() => {
    if (!selectedCategoryId) return allParts;
    return allParts.filter((p) => String(p.categoryId) === selectedCategoryId);
  }, [allParts, selectedCategoryId]);

  const createReceipt = trpc.inventory.create.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      utils.parts.listWithBalance.invalidate();
      utils.dashboard.summary.invalidate();
      toast.success("Stock receipt recorded successfully");
      setShowDialog(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteReceipt = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      utils.parts.listWithBalance.invalidate();
      utils.dashboard.summary.invalidate();
      toast.success("Receipt deleted and stock balance updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setSelectedCategoryId("");
    setForm({
      partId: "", quantity: "1", unitCost: "", supplierId: "",
      receiptDate: new Date().toISOString().split("T")[0],
      purchaseReference: "", notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partId) { toast.error("Please select a part"); return; }
    if (!form.quantity || parseInt(form.quantity) < 1) { toast.error("Quantity must be at least 1"); return; }
    createReceipt.mutate({
      partId: parseInt(form.partId),
      quantity: parseInt(form.quantity),
      unitCost: form.unitCost || undefined,
      supplierId: form.supplierId ? parseInt(form.supplierId) : undefined,
      receiptDate: form.receiptDate,
      purchaseReference: form.purchaseReference || undefined,
      notes: form.notes || undefined,
    });
  };

  const getPartName = (id: number) => allParts.find((p) => p.id === id)?.name ?? `Part #${id}`;
  const getCategoryName = (partId: number) => {
    const part = allParts.find((p) => p.id === partId);
    if (!part?.categoryId) return "—";
    return categories.find((c) => c.id === part.categoryId)?.name ?? "—";
  };
  const getSupplierName = (id: number | null) => id ? (suppliers.find((s) => s.id === id)?.name ?? "—") : "—";

  const filtered = (receipts as any[]).filter((r) => {
    const partName = getPartName(r.partId).toLowerCase();
    const catName = getCategoryName(r.partId).toLowerCase();
    const matchSearch = !search || partName.includes(search.toLowerCase()) || (r.purchaseReference ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || catName === categories.find((c) => c.id === parseInt(categoryFilter))?.name?.toLowerCase();
    return matchSearch && matchCat;
  });

  const totalReceived = (receipts as any[]).reduce((sum, r) => sum + r.quantity, 0);
  const totalValue = (receipts as any[]).reduce((sum, r) => sum + (r.quantity * parseFloat(r.unitCost ?? "0")), 0);
  const uniqueParts = new Set((receipts as any[]).map((r) => r.partId)).size;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Receive Stock</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record parts received from suppliers. Select a category, then the part, then enter the quantity. Each entry increases the stock balance and updates the dashboard.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Receive Stock
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Receipts", value: (receipts as any[]).length, color: "bg-blue-100 text-blue-600" },
          { label: "Total Units Received", value: totalReceived, color: "bg-emerald-100 text-emerald-600" },
          { label: "Distinct Parts Received", value: uniqueParts, color: "bg-purple-100 text-purple-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}><PackagePlus className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
        <strong>Stock received here is what drives the dashboard.</strong> Only parts with recorded receipts will show as available in the system.
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by part name or reference..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Loading receipts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <PackagePlus className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No stock receipts found</p>
              <p className="text-xs">Click "Receive Stock" to record your first stock entry</p>
              <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} className="mt-2 gap-1">
                <Plus className="h-3 w-3" /> Receive Stock
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Part</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Qty Received</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total Value</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.receiptDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{getCategoryName(r.partId)}</td>
                      <td className="px-4 py-3 font-medium">{getPartName(r.partId)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-emerald-700">+{r.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.unitCost ? `₦${parseFloat(r.unitCost).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {r.unitCost ? `₦${(r.quantity * parseFloat(r.unitCost)).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{getSupplierName(r.supplierId)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{r.purchaseReference ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              if (confirm("Delete this receipt? This will reduce the stock balance for this part."))
                                deleteReceipt.mutate({ id: r.id });
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive Stock Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-emerald-600" /> Receive Stock
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Category */}
            <div className="space-y-1.5">
              <Label>Step 1 — Select Category *</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(v) => {
                  setSelectedCategoryId(v);
                  setForm({ ...form, partId: "" }); // reset part when category changes
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choose a category first" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Part (filtered by category) */}
            <div className="space-y-1.5">
              <Label>Step 2 — Select Part *</Label>
              <Select
                value={form.partId}
                onValueChange={(v) => {
                  const part = allParts.find((p) => p.id === parseInt(v));
                  setForm({ ...form, partId: v, unitCost: part?.unitCost ?? "" });
                }}
                disabled={!selectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCategoryId ? "Select a part" : "Select a category first"} />
                </SelectTrigger>
                <SelectContent>
                  {partsInCategory.length === 0 ? (
                    <SelectItem value="none" disabled>No parts in this category</SelectItem>
                  ) : (
                    partsInCategory.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}{p.partNumber ? ` (${p.partNumber})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Quantity */}
            <div className="space-y-1.5">
              <Label>Step 3 — Quantity Received *</Label>
              <Input
                type="number" min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="Enter quantity"
                required
              />
            </div>

            {/* Optional fields */}
            <div className="space-y-1.5">
              <Label>Unit Cost (₦) <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="number" step="0.01"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Receipt Date *</Label>
                <Input
                  type="date"
                  value={form.receiptDate}
                  onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Reference</Label>
                <Input
                  value={form.purchaseReference}
                  onChange={(e) => setForm({ ...form, purchaseReference: e.target.value })}
                  placeholder="PO-001"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>

            {/* Total value preview */}
            {form.partId && form.quantity && form.unitCost && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                <span className="text-emerald-700 font-medium">
                  Total value: ₦{(parseInt(form.quantity || "0") * parseFloat(form.unitCost || "0")).toFixed(2)}
                </span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReceipt.isPending || !form.partId}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {createReceipt.isPending ? "Saving..." : "Record Receipt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
