import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserX,
  Users2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UserRow = {
  id: number;
  name: string | null;
  username: string | null;
  email: string | null;
  role: "user" | "admin";
  isActive: boolean;
  lastSignedIn: Date;
  createdAt: Date;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["Manage trucks", "Manage inventory", "Record maintenance", "Manage users"],
  user: ["View trucks", "Record maintenance", "Use parts"],
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users = [], refetch } = trpc.users.list.useQuery();

  // ── Dialogs state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  // ── Create form ────────────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    username: "", password: "", name: "", email: "", role: "user" as "user" | "admin",
  });
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  // ── Edit form ──────────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    name: "", email: "", role: "user" as "user" | "admin", isActive: true,
  });

  // ── Reset password form ────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [showResetPwd, setShowResetPwd] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      setCreateOpen(false);
      setCreateForm({ username: "", password: "", name: "", email: "", role: "user" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated");
      setEditTarget(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted");
      setDeleteTarget(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Shield className="h-14 w-14 mb-4 opacity-20" />
        <p className="text-lg font-semibold">Admin Access Required</p>
        <p className="text-sm mt-1">You need administrator privileges to manage users.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Role Permissions Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
          <Card key={role} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                {role === "admin" ? <Shield className="h-4 w-4 text-purple-600" /> : <User className="h-4 w-4 text-blue-600" />}
                <span className="font-semibold capitalize">{role === "admin" ? "Admin" : "Staff"}</span>
                <Badge variant="outline" className={role === "admin" ? "border-purple-200 text-purple-700 bg-purple-50" : "border-blue-200 text-blue-700 bg-blue-50"}>
                  {role === "admin" ? "Full Access" : "Limited Access"}
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {perms.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users2 className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No users yet</p>
              <p className="text-sm mt-1">Create the first user to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Sign In</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(users as UserRow[]).map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {(u.name ?? u.username ?? "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium leading-none">{u.name ?? "—"}</p>
                            {u.email && <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>}
                          </div>
                          {u.id === currentUser?.id && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {u.username ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`gap-1 text-xs ${u.role === "admin" ? "bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-100" : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50"}`}>
                          {u.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {u.role === "admin" ? "Admin" : "Staff"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-700">
                            <UserCheck className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-red-600">
                            <UserX className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.lastSignedIn).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Edit user"
                            onClick={() => { setEditTarget(u); setEditForm({ name: u.name ?? "", email: u.email ?? "", role: u.role, isActive: u.isActive }); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Reset password"
                            onClick={() => { setResetTarget(u); setNewPassword(""); }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete user"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create User Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="John Doe"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="john.doe"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showCreatePwd ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCreatePwd((v) => !v)}
                >
                  {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as "user" | "admin" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-blue-600" /> Staff — View trucks, record maintenance, use parts
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-purple-600" /> Admin — Full access including user management
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createUser.mutate(createForm)}
              disabled={createUser.isPending || !createForm.username || !createForm.password || !createForm.name}
            >
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit User — {editTarget?.name ?? editTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as "user" | "admin" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-blue-600" /> Staff</div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-purple-600" /> Admin</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Account Active</p>
                <p className="text-xs text-muted-foreground">Inactive users cannot log in</p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              onClick={() => editTarget && updateUser.mutate({ userId: editTarget.id, ...editForm })}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Reset Password — {resetTarget?.name ?? resetTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter a new password for this user. They will need to use it on their next login.
            </p>
            <div className="space-y-1.5">
              <Label>New Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showResetPwd ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowResetPwd((v) => !v)}
                >
                  {showResetPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button
              onClick={() => resetTarget && resetPassword.mutate({ userId: resetTarget.id, newPassword })}
              disabled={resetPassword.isPending || newPassword.length < 6}
            >
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteTarget?.name ?? deleteTarget?.username}</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteUser.mutate({ userId: deleteTarget.id })}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
