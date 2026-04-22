import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Setup() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: setupStatus, isLoading } = trpc.auth.setupStatus.useQuery();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const bootstrapAdmin = trpc.auth.bootstrapAdmin.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await utils.auth.setupStatus.invalidate();
      toast.success("Super admin account created");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!isLoading && setupStatus?.hasUsers) {
      setLocation("/login");
    }
  }, [isLoading, setLocation, setupStatus?.hasUsers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    bootstrapAdmin.mutate({
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 text-white">
        <p className="text-sm text-slate-300">Checking system setup...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shadow-lg">
            <Truck className="h-8 w-8 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">First-Time Setup</h1>
            <p className="text-slate-300 text-sm mt-1">Create the initial super admin account for FleetManager Pro.</p>
          </div>
        </div>

        <Card className="border-white/10 shadow-2xl bg-white">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Super Admin Account
            </CardTitle>
            <CardDescription>
              This page works only once. After the first admin is created, everyone signs in through the normal login page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setup-name">Full Name</Label>
                <Input
                  id="setup-name"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="e.g. Ifeanyi Ijeh"
                  disabled={bootstrapAdmin.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="setup-username">Username</Label>
                <Input
                  id="setup-username"
                  value={form.username}
                  onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  disabled={bootstrapAdmin.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="setup-email">Email</Label>
                <Input
                  id="setup-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={bootstrapAdmin.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="setup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="setup-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    disabled={bootstrapAdmin.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((value) => !value)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="setup-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="setup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => setForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    disabled={bootstrapAdmin.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  bootstrapAdmin.isPending ||
                  !form.name.trim() ||
                  !form.username.trim() ||
                  !form.password ||
                  !form.confirmPassword
                }
              >
                {bootstrapAdmin.isPending ? "Creating super admin..." : "Create Super Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
