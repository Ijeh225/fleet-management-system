import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Cog, Edit, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);

  const { data: suppliers = [], refetch } = trpc.suppliers.list.useQuery();

  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("Supplier added"); setShowAddDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateSupplier = trpc.suppliers.update.useMutation({
    onSuccess: () => { toast.success("Supplier updated"); setEditSupplier(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "", notes: "" });

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.contactPerson ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-1">{suppliers.length} registered suppliers</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Cog className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">No suppliers found</p>
          </div>
        ) : (
          filtered.map((supplier) => (
            <Card key={supplier.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cog className="h-5 w-5 text-primary" />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditSupplier(supplier)} className="h-7 w-7 p-0">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <h3 className="font-semibold text-sm">{supplier.name}</h3>
                {supplier.contactPerson && <p className="text-xs text-muted-foreground mt-1">{supplier.contactPerson}</p>}
                <div className="mt-3 space-y-1">
                  {supplier.phone && <p className="text-xs text-muted-foreground">📞 {supplier.phone}</p>}
                  {supplier.email && <p className="text-xs text-muted-foreground">✉️ {supplier.email}</p>}
                  {supplier.address && <p className="text-xs text-muted-foreground">📍 {supplier.address}</p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createSupplier.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button><Button type="submit" disabled={createSupplier.isPending}>{createSupplier.isPending ? "Adding..." : "Add Supplier"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editSupplier && (
        <Dialog open={!!editSupplier} onOpenChange={() => setEditSupplier(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); updateSupplier.mutate({ id: editSupplier.id, name: editSupplier.name, contactPerson: editSupplier.contactPerson, phone: editSupplier.phone, email: editSupplier.email, address: editSupplier.address, notes: editSupplier.notes }); }} className="space-y-4">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={editSupplier.name} onChange={(e) => setEditSupplier({ ...editSupplier, name: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Contact Person</Label><Input value={editSupplier.contactPerson ?? ""} onChange={(e) => setEditSupplier({ ...editSupplier, contactPerson: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={editSupplier.phone ?? ""} onChange={(e) => setEditSupplier({ ...editSupplier, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editSupplier.email ?? ""} onChange={(e) => setEditSupplier({ ...editSupplier, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Address</Label><Textarea rows={2} value={editSupplier.address ?? ""} onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={editSupplier.notes ?? ""} onChange={(e) => setEditSupplier({ ...editSupplier, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setEditSupplier(null)}>Cancel</Button><Button type="submit" disabled={updateSupplier.isPending}>{updateSupplier.isPending ? "Saving..." : "Save"}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
