import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, Package, Plus, Settings2, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [newCategory, setNewCategory] = useState("");

  const { data: categories = [], refetch: refetchCategories } = trpc.categories.list.useQuery();

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => { toast.success("Category created"); setNewCategory(""); refetchCategories(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration and preferences</p>
      </div>

      {/* User Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={user?.name ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={user?.role ?? ""} readOnly className="bg-muted capitalize" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Part Categories */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" /> Part Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.role === "admin" && (
            <div className="flex gap-2">
              <Input
                placeholder="New category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newCategory.trim()) createCategory.mutate({ name: newCategory.trim() }); }}
              />
              <Button
                onClick={() => { if (newCategory.trim()) createCategory.mutate({ name: newCategory.trim() }); }}
                disabled={createCategory.isPending || !newCategory.trim()}
                className="gap-1 shrink-0"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{cat.name}</span>
                    {cat.description && <span className="text-xs text-muted-foreground">— {cat.description}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Application", "Fleet Inventory & Maintenance System"],
              ["Version", "1.0.0"],
              ["Stack", "React + tRPC + Drizzle ORM + MySQL"],
              ["Auth", "Manus OAuth"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
