import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Archive, Box, Edit, Package, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Parts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editPart, setEditPart] = useState<any>(null);

  const [form, setForm] = useState({
    name: "", partNumber: "", categoryId: "", compatibleModel: "",
    unitType: "piece", unitCost: "", minimumStockLevel: "5", reorderLevel: "10",
    storageLocation: "", description: "", notes: "",
  });

  const utils = trpc.useUtils();
  // Use plain list — no stock balance needed on the catalogue page
  const { data: parts = [], isLoading } = trpc.parts.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();

  const createPart = trpc.parts.create.useMutation({
    onSuccess: () => {
      utils.parts.list.invalidate();
      toast.success("Part added to catalogue");
      setShowDialog(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePart = trpc.parts.update.useMutation({
    onSuccess: () => {
      utils.parts.list.invalidate();
      toast.success("Part updated");
      setShowDialog(false);
      setEditPart(null);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const archivePart = trpc.parts.archive.useMutation({
    onSuccess: () => { utils.parts.list.invalidate(); toast.success("Part archived"); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({
    name: "", partNumber: "", categoryId: "", compatibleModel: "",
    unitType: "piece", unitCost: "", minimumStockLevel: "5", reorderLevel: "10",
    storageLocation: "", description: "", notes: "",
  });

  const openCreate = () => { setEditPart(null); resetForm(); setShowDialog(true); };
  const openEdit = (part: any) => {
    setEditPart(part);
    setForm({
      name: part.name ?? "", partNumber: part.partNumber ?? "",
      categoryId: part.categoryId ? String(part.categoryId) : "",
      compatibleModel: part.compatibleModel ?? "",
      unitType: part.unitType ?? "piece",
      unitCost: part.unitCost ?? "",
      minimumStockLevel: String(part.minimumStockLevel ?? 5),
      reorderLevel: String(part.reorderLevel ?? 10),
      storageLocation: part.storageLocation ?? "",
      description: part.description ?? "",
      notes: part.notes ?? "",
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Part name is required"); return; }
    const payload = {
      name: form.name,
      partNumber: form.partNumber || undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      compatibleModel: form.compatibleModel || undefined,
      unitType: form.unitType || "piece",
      unitCost: form.unitCost || undefined,
      minimumStockLevel: parseInt(form.minimumStockLevel) || 5,
      reorderLevel: parseInt(form.reorderLevel) || 10,
      storageLocation: form.storageLocation || undefined,
      description: form.description || undefined,
      notes: form.notes || undefined,
    };
    if (editPart) updatePart.mutate({ id: editPart.id, ...payload });
    else createPart.mutate(payload);
  };

  const getCategoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "—";

  // Group parts by category for the summary count
  const categoryCounts: Record<string, number> = {};
  parts.forEach((p) => {
    const cat = getCategoryName(p.categoryId);
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  });

  const filtered = parts.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.partNumber ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || String(p.categoryId) === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Parts Catalogue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage your master list of truck parts. To record stock received, go to <strong>Receive Stock</strong>.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add Part
          </Button>
        )}
      </div>

      {/* Summary — catalogue counts only, no stock */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Parts in Catalogue", count: parts.length, icon: Package, color: "bg-blue-100 text-blue-600" },
          { label: "Categories", count: categories.length, icon: Box, color: "bg-purple-100 text-purple-600" },
          { label: "Showing", count: filtered.length, icon: Search, color: "bg-slate-100 text-slate-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Note:</strong> This page is for creating and managing the parts list only. Stock quantities are <strong>not shown here</strong>. To receive stock, go to <strong>Receive Stock</strong> in the sidebar.
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by part name or part number..."
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
              <p className="text-sm">Loading parts catalogue...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Box className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No parts found</p>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={openCreate} className="mt-2 gap-1">
                  <Plus className="h-3 w-3" /> Add Part
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Part Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Part #</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Compatible Model</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{part.name}</div>
                        {part.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{part.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{part.partNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{getCategoryName(part.categoryId)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{part.compatibleModel ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{part.unitType ?? "piece"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {part.unitCost ? `₦${parseFloat(part.unitCost).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{part.storageLocation ?? "—"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => openEdit(part)}
                              className="h-7 w-7 p-0"
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { if (confirm(`Archive "${part.name}"? It will be hidden from the catalogue.`)) archivePart.mutate({ id: part.id }); }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Archive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Add / Edit Part Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) { setEditPart(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editPart ? "Edit Part" : "Add New Part to Catalogue"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Part Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Engine Oil Filter"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Part Number / SKU</Label>
                <Input
                  value={form.partNumber}
                  onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                  placeholder="e.g. MK-EF-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Compatible Model</Label>
                <Input
                  value={form.compatibleModel}
                  onChange={(e) => setForm({ ...form, compatibleModel: e.target.value })}
                  placeholder="e.g. Mack Granite"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Type</Label>
                <Select value={form.unitType} onValueChange={(v) => setForm({ ...form, unitType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["piece", "set", "litre", "kg", "metre", "box", "pair"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Unit Cost (₦)</Label>
                <Input
                  type="number" step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Min Stock Level</Label>
                <Input
                  type="number"
                  value={form.minimumStockLevel}
                  onChange={(e) => setForm({ ...form, minimumStockLevel: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Storage Location</Label>
              <Input
                value={form.storageLocation}
                onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                placeholder="e.g. Shelf A3, Bin 12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Brief description of the part..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditPart(null); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPart.isPending || updatePart.isPending}>
                {createPart.isPending || updatePart.isPending ? "Saving..." : editPart ? "Update Part" : "Add to Catalogue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
