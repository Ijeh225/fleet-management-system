import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const utils = trpc.useUtils();
  const { data: setupStatus, isLoading: setupStatusLoading } = trpc.auth.setupStatus.useQuery();

  useEffect(() => {
    if (!setupStatusLoading && setupStatus?.setupRequired) {
      setLocation("/setup");
    }
  }, [setLocation, setupStatus?.setupRequired, setupStatusLoading]);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      // Invalidate the auth.me query so the app re-reads the new session
      await utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    login.mutate({ username: username.trim(), password });
  };

  if (setupStatusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <p className="text-sm text-slate-300">Checking system status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">FleetManager Pro</h1>
            <p className="text-slate-400 text-sm mt-0.5">Fleet Inventory & Maintenance System</p>
          </div>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-2xl bg-white">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={login.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={login.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={login.isPending || !username.trim() || !password}
                size="lg"
              >
                {login.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
}
