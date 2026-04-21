import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Truck, Package, Wrench, AlertTriangle, CheckCircle2,
  Banknote, Navigation, ArrowRight, Activity, ShieldAlert,
  Plus, Calendar, TrendingUp, TrendingDown, Fuel, Users,
  Clock, MapPin, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Link } from "wouter";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_CONFIG = {
  available:         { label: "Available",    dot: "bg-emerald-500", ring: "ring-emerald-200", card: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",   text: "text-emerald-700",  badge: "bg-emerald-100 text-emerald-700" },
  on_trip:           { label: "On Trip",      dot: "bg-blue-500",    ring: "ring-blue-200",    card: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",         text: "text-blue-700",     badge: "bg-blue-100 text-blue-700" },
  under_maintenance: { label: "Maintenance",  dot: "bg-amber-500",   ring: "ring-amber-200",   card: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",       text: "text-amber-700",    badge: "bg-amber-100 text-amber-700" },
  inactive:          { label: "Inactive",     dot: "bg-slate-400",   ring: "ring-slate-200",   card: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200",         text: "text-slate-600",    badge: "bg-slate-100 text-slate-600" },
};

const TRIP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:   { label: "Scheduled",   color: "bg-slate-100 text-slate-700" },
  loading:     { label: "Loading",     color: "bg-yellow-100 text-yellow-700" },
  in_transit:  { label: "In Transit",  color: "bg-blue-100 text-blue-700" },
  delivered:   { label: "Delivered",   color: "bg-teal-100 text-teal-700" },
  completed:   { label: "Completed",   color: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Cancelled",   color: "bg-red-100 text-red-700" },
};

function GradientKPICard({
  title, value, subtitle, icon: Icon,
  gradient, trend, trendLabel, href,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; gradient: string;
  trend?: "up" | "down" | "neutral"; trendLabel?: string; href?: string;
}) {
  const inner = (
    <div className={`relative overflow-hidden rounded-xl p-5 ${gradient} shadow-sm hover:shadow-md transition-all group cursor-pointer border border-white/20`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">{title}</p>
          <p className="text-3xl font-black leading-none mb-1">{value}</p>
          {subtitle && <p className="text-xs opacity-60 font-medium">{subtitle}</p>}
          {trendLabel && (
            <div className="flex items-center gap-1 mt-2">
              {trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-600" />}
              {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
              <span className={`text-xs font-semibold ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "opacity-60"}`}>{trendLabel}</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/30 group-hover:bg-white/40 transition-colors flex-shrink-0 shadow-sm">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {/* decorative circle */}
      <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/5 pointer-events-none" />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: fleetAvailability = [] } = trpc.trips.fleetAvailability.useQuery();
  const { data: tripStats } = trpc.trips.stats.useQuery();
  const { data: recentTrips = [] } = trpc.trips.list.useQuery({ limit: 5 });
  const { data: upcomingSchedules = [] } = trpc.schedules.list.useQuery();
  const { data: monthlyData } = trpc.reports.monthlyExpenses.useQuery({ year: new Date().getFullYear() });

  const chartData = useMemo(() =>
    monthlyData?.map(m => ({ month: MONTH_NAMES[m.month - 1], cost: m.totalCost, count: m.count })) ?? [],
    [monthlyData]
  );

  // Fill missing months with 0
  const fullChartData = useMemo(() => {
    const map = new Map(chartData.map(d => [d.month, d]));
    return MONTH_NAMES.slice(0, new Date().getMonth() + 1).map(m => map.get(m) ?? { month: m, cost: 0, count: 0 });
  }, [chartData]);

  const availabilityCounts = useMemo(() => {
    const c = { available: 0, on_trip: 0, under_maintenance: 0, inactive: 0 };
    fleetAvailability.forEach(t => { const k = t.availability as keyof typeof c; if (k in c) c[k]++; });
    return c;
  }, [fleetAvailability]);

  const pieData = useMemo(() => [
    { name: "Available",    value: availabilityCounts.available,         color: "#10b981" },
    { name: "On Trip",      value: availabilityCounts.on_trip,           color: "#3b82f6" },
    { name: "Maintenance",  value: availabilityCounts.under_maintenance, color: "#f59e0b" },
    { name: "Inactive",     value: availabilityCounts.inactive,          color: "#94a3b8" },
  ].filter(d => d.value > 0), [availabilityCounts]);

  const upcomingPending = useMemo(() =>
    upcomingSchedules
      .filter(s => !s.isCompleted)
      .sort((a, b) => new Date(String(a.nextServiceDate ?? "")).getTime() - new Date(String(b.nextServiceDate ?? "")).getTime())
      .slice(0, 6),
    [upcomingSchedules]
  );

  const daysUntil = (date: Date | string | null | undefined) => {
    if (!date) return null;
    return Math.ceil((new Date(String(date)).getTime() - Date.now()) / 86400000);
  };

  const totalTrucks = fleetAvailability.length || (summary?.totalTrucks ?? 0);
  const utilization = totalTrucks > 0 ? Math.round(((availabilityCounts.on_trip + availabilityCounts.under_maintenance) / totalTrucks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Welcome back, <span className="font-semibold text-slate-700">{user?.name ?? "User"}</span>
              <span className="mx-2 text-slate-300">·</span>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/trips">
              <Button variant="outline" size="sm" className="border-slate-200 bg-white shadow-sm">
                <Navigation className="h-4 w-4 mr-2 text-purple-600" />New Trip
              </Button>
            </Link>
            <Link href="/maintenance/add">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 shadow-sm">
                <Wrench className="h-4 w-4 mr-2" />Record Maintenance
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Alert Banner ── */}
        {((summary?.overdueServices ?? 0) > 0 || (summary?.lowStockParts ?? 0) > 0) && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex-wrap shadow-sm">
            <div className="p-1.5 rounded-lg bg-red-100">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            </div>
            <div className="flex flex-wrap gap-3 text-sm flex-1">
              {(summary?.overdueServices ?? 0) > 0 && (
                <span className="font-semibold">{summary?.overdueServices} overdue service{summary?.overdueServices !== 1 ? "s" : ""}</span>
              )}
              {(summary?.overdueServices ?? 0) > 0 && (summary?.lowStockParts ?? 0) > 0 && <span className="text-red-300">·</span>}
              {(summary?.lowStockParts ?? 0) > 0 && (
                <span className="font-semibold">{summary?.lowStockParts} part{summary?.lowStockParts !== 1 ? "s" : ""} below minimum stock</span>
              )}
            </div>
            <div className="flex gap-2">
              {(summary?.overdueServices ?? 0) > 0 && (
                <Link href="/schedules"><Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100 bg-white">View Services</Button></Link>
              )}
              {(summary?.lowStockParts ?? 0) > 0 && (
                <Link href="/reorder"><Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100 bg-white">Reorder Parts</Button></Link>
              )}
            </div>
          </div>
        )}

        {/* ── KPI Row 1 — Fleet ── */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" /> Fleet Overview
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GradientKPICard
              title="Total Trucks" value={summary?.totalTrucks ?? 0}
              subtitle={`${summary?.activeTrucks ?? 0} active · ${utilization}% utilization`}
              icon={Truck} gradient="bg-gradient-to-br from-slate-700 to-slate-900 text-white"
              href="/trucks"
            />
            <GradientKPICard
              title="On Trip" value={availabilityCounts.on_trip}
              subtitle="Currently dispatched"
              icon={Navigation} gradient="bg-gradient-to-br from-violet-500 to-purple-700 text-white"
              trend="neutral" trendLabel={`${availabilityCounts.available} available`}
              href="/trips"
            />
            <GradientKPICard
              title="Under Maintenance" value={summary?.underMaintenanceTrucks ?? 0}
              subtitle="Being serviced now"
              icon={Wrench} gradient="bg-gradient-to-br from-amber-400 to-orange-600 text-white"
              href="/trucks"
            />
            <GradientKPICard
              title="Inactive" value={summary?.inactiveTrucks ?? 0}
              subtitle="Out of service"
              icon={AlertTriangle} gradient="bg-gradient-to-br from-slate-300 to-slate-500 text-white"
              href="/trucks"
            />
          </div>
        </div>

        {/* ── KPI Row 2 — Operations ── */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> Operations This Month
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GradientKPICard
              title="Maintenance Jobs" value={summary?.maintenanceThisMonth ?? 0}
              subtitle="Completed this month"
              icon={Activity} gradient="bg-gradient-to-br from-teal-400 to-emerald-600 text-white"
              href="/maintenance"
            />
            <GradientKPICard
              title="Maintenance Cost"
              value={`₦${(summary?.maintenanceCostThisMonth ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              subtitle="Total spend this month"
              icon={Banknote} gradient="bg-gradient-to-br from-rose-400 to-red-600 text-white"
              href="/maintenance"
            />
            <GradientKPICard
              title="Parts In Stock" value={summary?.totalParts ?? 0}
              subtitle={`${summary?.lowStockParts ?? 0} below minimum`}
              icon={Package} gradient="bg-gradient-to-br from-indigo-400 to-blue-600 text-white"
              trend={(summary?.lowStockParts ?? 0) > 0 ? "down" : "neutral"}
              trendLabel={(summary?.lowStockParts ?? 0) > 0 ? `${summary?.lowStockParts} low stock` : "Stock healthy"}
              href="/parts"
            />
            <GradientKPICard
              title="Trip Revenue"
              value={`₦${(tripStats?.totalRevenue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              subtitle={`${tripStats?.totalTrips ?? 0} trips · ₦${(tripStats?.netProfit ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} profit`}
              icon={TrendingUp} gradient="bg-gradient-to-br from-green-400 to-emerald-600 text-white"
              trend={(tripStats?.netProfit ?? 0) >= 0 ? "up" : "down"}
              trendLabel={(tripStats?.netProfit ?? 0) >= 0 ? "Profitable" : "Net loss"}
              href="/trips"
            />
          </div>
        </div>

        {/* ── Main 3-column grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── LEFT: Fleet Availability Board ── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Fleet Availability Board */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Fleet Availability Board</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time truck status</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className="text-xs text-slate-500">{cfg.label}</span>
                        <span className="text-xs font-bold text-slate-700">{availabilityCounts[key as keyof typeof availabilityCounts]}</span>
                      </div>
                    ))}
                    <Link href="/trucks">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-500">
                        All <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {fleetAvailability.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="p-4 rounded-full bg-slate-100 mb-3">
                      <Truck className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No trucks registered yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first truck to see the fleet board</p>
                    <Link href="/trucks">
                      <Button size="sm" className="mt-4 bg-slate-900 hover:bg-slate-800">
                        <Plus className="h-4 w-4 mr-1" />Add Truck
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fleetAvailability.map(truck => {
                      const cfg = STATUS_CONFIG[truck.availability as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.inactive;
                      return (
                        <div key={truck.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${cfg.card} transition-all hover:shadow-sm`}>
                          <div className={`relative flex-shrink-0`}>
                            <div className={`h-10 w-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm`}>
                              <Truck className={`h-5 w-5 ${cfg.text}`} />
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-sm text-slate-800 truncate">{truck.truckCode}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{truck.plateNumber}</p>
                            {truck.activeTripDestination && (
                              <p className="text-xs text-blue-600 truncate flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />→ {truck.activeTripDestination}
                              </p>
                            )}
                            {truck.driverName && (
                              <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                                <Users className="h-2.5 w-2.5 flex-shrink-0" />{truck.driverName}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Monthly Maintenance Cost */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-bold text-slate-800">Maintenance Cost Trend</CardTitle>
                  <p className="text-xs text-slate-400">{new Date().getFullYear()} — monthly</p>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fullChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₦${(v/1000).toFixed(0)}k` : `₦${v}`} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                          formatter={(v: number) => [`₦${v.toLocaleString()}`, "Cost"]}
                        />
                        <Area type="monotone" dataKey="cost" stroke="#f43f5e" strokeWidth={2} fill="url(#costGrad)" dot={false} activeDot={{ r: 4, fill: "#f43f5e" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Fleet Status Pie */}
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-bold text-slate-800">Fleet Status Distribution</CardTitle>
                  <p className="text-xs text-slate-400">{totalTrucks} total trucks</p>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {pieData.length === 0 ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No fleet data yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="45%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                            formatter={(value, name) => [`${value} trucks`, name]}
                          />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Trips */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Recent Trips</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Latest dispatched jobs</p>
                  </div>
                  <Link href="/trips">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-500">
                      View All <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {recentTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Navigation className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">No trips yet</p>
                    <Link href="/trips">
                      <Button size="sm" className="mt-3 bg-slate-900 hover:bg-slate-800">
                        <Plus className="h-3.5 w-3.5 mr-1" />Dispatch First Trip
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left pb-2 font-semibold text-slate-400 uppercase tracking-wide">Trip</th>
                          <th className="text-left pb-2 font-semibold text-slate-400 uppercase tracking-wide">Route</th>
                          <th className="text-left pb-2 font-semibold text-slate-400 uppercase tracking-wide">Truck</th>
                          <th className="text-left pb-2 font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                          <th className="text-right pb-2 font-semibold text-slate-400 uppercase tracking-wide">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTrips.map((trip, i) => {
                          const sc = TRIP_STATUS_CONFIG[trip.status] ?? { label: trip.status, color: "bg-slate-100 text-slate-700" };
                          return (
                            <tr key={trip.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i === recentTrips.length - 1 ? "border-0" : ""}`}>
                              <td className="py-2.5 font-mono font-bold text-slate-700">{trip.tripCode}</td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-1 text-slate-600">
                                  <span className="truncate max-w-[80px]">{trip.origin}</span>
                                  <ArrowRight className="h-2.5 w-2.5 flex-shrink-0 text-slate-300" />
                                  <span className="truncate max-w-[80px]">{trip.destination}</span>
                                </div>
                              </td>
                              <td className="py-2.5 font-medium text-slate-700">{trip.truckCode ?? "—"}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-emerald-700">
                                ₦{parseFloat(String(trip.revenueAmount ?? 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold text-slate-800">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {[
                  { href: "/trips",          icon: Navigation, label: "Dispatch a Trip",          iconColor: "text-violet-600",  iconBg: "bg-violet-50"  },
                  { href: "/maintenance/add",icon: Wrench,     label: "Record Maintenance",       iconColor: "text-amber-600",   iconBg: "bg-amber-50"   },
                  { href: "/inventory",      icon: Package,    label: "Receive Stock",            iconColor: "text-blue-600",    iconBg: "bg-blue-50"    },
                  { href: "/stock-removal",  icon: Package,    label: "Issue Parts",              iconColor: "text-red-600",     iconBg: "bg-red-50"     },
                  { href: "/reorder",        icon: ShieldAlert,label: "Generate Purchase Order",  iconColor: "text-teal-600",    iconBg: "bg-teal-50"    },
                  { href: "/trucks",         icon: Truck,      label: "Add Truck",                iconColor: "text-indigo-600",  iconBg: "bg-indigo-50"  },
                  { href: "/drivers",        icon: Users,      label: "Add Driver",               iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
                ].map(a => (
                  <Link key={a.href} href={a.href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className={`p-1.5 rounded-lg ${a.iconBg} flex-shrink-0`}>
                        <a.icon className={`h-4 w-4 ${a.iconColor}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors flex-1">{a.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Trip Financials */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold text-slate-800">Trip Financials</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">All-time summary</p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-3">
                  {[
                    { label: "Total Revenue",   value: `₦${(tripStats?.totalRevenue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,  color: "text-emerald-700", bg: "bg-emerald-50",  icon: TrendingUp },
                    { label: "Net Profit",       value: `₦${(tripStats?.netProfit ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,     color: (tripStats?.netProfit ?? 0) >= 0 ? "text-emerald-700" : "text-red-600", bg: (tripStats?.netProfit ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50", icon: (tripStats?.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown },
                    { label: "Fuel Cost",        value: `₦${(tripStats?.totalFuelCost ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: "text-amber-700",   bg: "bg-amber-50",    icon: Fuel },
                    { label: "Total Distance",   value: `${(tripStats?.totalDistance ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} km`, color: "text-blue-700", bg: "bg-blue-50",     icon: MapPin },
                    { label: "Total Trips",      value: tripStats?.totalTrips ?? 0,                                                                   color: "text-slate-700",   bg: "bg-slate-50",    icon: Navigation },
                  ].map(s => (
                    <div key={s.label} className={`flex items-center justify-between p-3 rounded-xl ${s.bg}`}>
                      <div className="flex items-center gap-2.5">
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                        <span className="text-xs font-medium text-slate-600">{s.label}</span>
                      </div>
                      <span className={`text-sm font-black ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Services */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Upcoming Services</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Pending schedules</p>
                  </div>
                  <Link href="/schedules">
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {upcomingPending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">All services up to date</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {upcomingPending.map(s => {
                      const days = daysUntil(s.nextServiceDate);
                      const isOverdue = days !== null && days < 0;
                      const isDueSoon = days !== null && days >= 0 && days <= 7;
                      return (
                        <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-red-100" : isDueSoon ? "bg-amber-100" : "bg-slate-100"}`}>
                            <Calendar className={`h-4 w-4 ${isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-500"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">
                              {s.serviceType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{(s as { truckCode?: string }).truckCode ?? "—"}</p>
                          </div>
                          {days !== null && (
                            <span className={`text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full ${isOverdue ? "bg-red-100 text-red-700" : isDueSoon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                              {isOverdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Maintenance */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Recent Maintenance</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Latest service records</p>
                  </div>
                  <Link href="/maintenance">
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {(summary?.recentMaintenance?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Wrench className="h-7 w-7 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">No maintenance records yet</p>
                    <Link href="/maintenance/add">
                      <Button size="sm" className="mt-3 h-7 text-xs bg-slate-900 hover:bg-slate-800">
                        <Plus className="h-3 w-3 mr-1" />Record Maintenance
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {summary?.recentMaintenance.map((m, i) => (
                      <div key={m.id} className={`flex items-center gap-3 py-2.5 border-b border-slate-50 ${i === (summary.recentMaintenance.length - 1) ? "border-0" : ""}`}>
                        <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Wrench className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {m.serviceType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-slate-400">
                            {m.maintenanceDate instanceof Date ? m.maintenanceDate.toLocaleDateString() : String(m.maintenanceDate ?? "—")}
                          </p>
                        </div>
                        <span className="text-xs font-black text-slate-800 flex-shrink-0">
                          ${parseFloat(String(m.totalCost ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
