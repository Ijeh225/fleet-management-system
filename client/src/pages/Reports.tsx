import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, Banknote, CheckCircle2, Fuel, TrendingUp, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6b7280"];

function fmt(n: string | number | null | undefined, decimals = 1) {
  if (n == null) return "—";
  const v = parseFloat(String(n));
  return isNaN(v) ? "—" : v.toFixed(decimals);
}

function fmtCurrency(n: string | number | null | undefined) {
  if (n == null) return "—";
  const v = parseFloat(String(n));
  if (isNaN(v)) return "—";
  return `₦${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [activeTab, setActiveTab] = useState("maintenance");

  const { data: monthlyData = [] } = trpc.reports.monthlyExpenses.useQuery({ year: parseInt(year) });
  const { data: truckCosts = [] } = trpc.reports.costPerTruck.useQuery();
  const { data: partUsage = [] } = trpc.reports.partsUsage.useQuery();
  const { data: fuelReport } = trpc.reports.fuelEfficiency.useQuery();

  const monthlyChartData = monthlyData.map((m) => ({
    month: MONTH_NAMES[m.month - 1],
    cost: m.totalCost,
    count: m.count,
  }));

  const truckCostChartData = truckCosts.slice(0, 10).map((t) => ({
    truckCode: t.truck.truckCode,
    totalCost: t.totalCost,
    count: t.count,
  }));

  const totalYearCost = monthlyData.reduce((sum, m) => sum + m.totalCost, 0);
  const totalServices = monthlyData.reduce((sum, m) => sum + m.count, 0);
  const avgCostPerService = totalServices > 0 ? totalYearCost / totalServices : 0;

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  // ─── Fuel efficiency derived data ────────────────────────────────────────────
  const fuelTrips = fuelReport?.trips ?? [];
  const truckSummary = fuelReport?.truckSummary ?? [];

  const tripsWithBoth = fuelTrips.filter(
    (t) => t.estimatedFuelLitres != null && t.actualFuelLitres != null
  );

  const totalEstimated = tripsWithBoth.reduce((s, t) => s + parseFloat(String(t.estimatedFuelLitres ?? 0)), 0);
  const totalActual = tripsWithBoth.reduce((s, t) => s + parseFloat(String(t.actualFuelLitres ?? 0)), 0);
  const avgVariancePct = tripsWithBoth.length > 0
    ? tripsWithBoth.reduce((s, t) => {
        const est = parseFloat(String(t.estimatedFuelLitres ?? 0));
        const act = parseFloat(String(t.actualFuelLitres ?? 0));
        return est > 0 ? s + ((act - est) / est) * 100 : s;
      }, 0) / tripsWithBoth.length
    : 0;

  // Per-truck bar chart: base vs rolling-average efficiency
  const truckEfficiencyChart = useMemo(() =>
    truckSummary
      .filter((t) => t.baseFuelEfficiencyKmL != null)
      .map((t) => ({
        truckCode: t.truckCode,
        base: parseFloat(String(t.baseFuelEfficiencyKmL ?? 0)),
        rolling: t.avgFuelEfficiencyKmL != null ? parseFloat(String(t.avgFuelEfficiencyKmL)) : null,
        samples: t.fuelEfficiencySampleCount ?? 0,
      }))
  , [truckSummary]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Fleet performance and cost analysis</p>
        </div>
        {activeTab === "maintenance" && (
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" /> Fuel Efficiency
          </TabsTrigger>
        </TabsList>

        {/* ── MAINTENANCE TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="maintenance" className="space-y-6 mt-0">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Maintenance Cost</p>
                    <p className="text-2xl font-bold mt-1">₦{totalYearCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">{year} year-to-date</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Services</p>
                    <p className="text-2xl font-bold mt-1">{totalServices}</p>
                    <p className="text-xs text-muted-foreground mt-1">Maintenance events in {year}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cost per Service</p>
                    <p className="text-2xl font-bold mt-1">₦{avgCostPerService.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">Per maintenance event</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Monthly Maintenance Costs — {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyChartData.every((m) => m.cost === 0) ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <p className="text-sm">No maintenance data for {year}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, "Cost"]} />
                    <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top trucks by cost */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Trucks by Maintenance Cost</CardTitle>
              </CardHeader>
              <CardContent>
                {truckCostChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p className="text-sm">No truck cost data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={truckCostChartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="truckCode" tick={{ fontSize: 11 }} width={60} />
                      <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, "Cost"]} />
                      <Bar dataKey="totalCost" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Parts usage donut */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Parts by Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {partUsage.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p className="text-sm">No parts usage data</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={partUsage.slice(0, 8).map((p) => ({ name: p.part.name, value: p.totalIssued }))}
                          cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name"
                        >
                          {partUsage.slice(0, 8).map((_: unknown, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value, "Units Used"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {partUsage.slice(0, 6).map((item: { part: { name: string }; totalIssued: number; balance: number }, index: number) => (
                        <div key={item.part.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-muted-foreground text-xs truncate max-w-[120px]">{item.part.name}</span>
                          </div>
                          <span className="font-medium text-xs">{item.totalIssued} issued</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Parts usage table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Parts Usage Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {partUsage.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <p className="text-sm">No parts usage data</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-6 py-3 font-medium text-muted-foreground">#</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Part Name</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Part Number</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issues</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total Issued</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total Received</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {partUsage.slice(0, 15).map((p: { part: { name: string; partNumber: string | null }; issueCount: number; totalIssued: number; totalReceived: number; balance: number }, i: number) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-6 py-3 text-muted-foreground font-medium">{i + 1}</td>
                          <td className="px-4 py-3 font-medium">{p.part.name}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.part.partNumber ?? "—"}</td>
                          <td className="px-4 py-3">{p.issueCount}</td>
                          <td className="px-4 py-3">{p.totalIssued}</td>
                          <td className="px-4 py-3">{p.totalReceived}</td>
                          <td className="px-4 py-3 font-semibold">{p.balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FUEL EFFICIENCY TAB ──────────────────────────────────────────────── */}
        <TabsContent value="fuel" className="space-y-6 mt-0">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Trips with Fuel Data</p>
                    <p className="text-2xl font-bold mt-1">{fuelTrips.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tripsWithBoth.length} have both est. & actual</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Fuel className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Actual Fuel Used</p>
                    <p className="text-2xl font-bold mt-1">{totalActual.toFixed(1)} L</p>
                    <p className="text-xs text-muted-foreground mt-1">vs {totalEstimated.toFixed(1)} L estimated</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Variance</p>
                    <p className={`text-2xl font-bold mt-1 ${Math.abs(avgVariancePct) > 10 ? "text-red-600" : "text-green-600"}`}>
                      {tripsWithBoth.length > 0 ? `${avgVariancePct > 0 ? "+" : ""}${avgVariancePct.toFixed(1)}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Actual vs estimated fuel</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${Math.abs(avgVariancePct) > 10 ? "bg-red-100" : "bg-green-100"}`}>
                    {Math.abs(avgVariancePct) > 10
                      ? <AlertTriangle className="h-5 w-5 text-red-600" />
                      : <CheckCircle2 className="h-5 w-5 text-green-600" />
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-truck efficiency chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Per-Truck Fuel Efficiency (km/L)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Base (manufacturer spec) vs Rolling Average (from recorded trips)</p>
            </CardHeader>
            <CardContent>
              {truckEfficiencyChart.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <p className="text-sm">No truck efficiency data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={truckEfficiencyChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="truckCode" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v} km/L`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(2)} km/L`,
                        name === "base" ? "Base Efficiency" : "Rolling Average",
                      ]}
                    />
                    <Legend formatter={(v) => v === "base" ? "Base Efficiency" : "Rolling Average"} />
                    <Bar dataKey="base" fill="#3b82f6" radius={[4, 4, 0, 0]} name="base" />
                    <Bar dataKey="rolling" fill="#10b981" radius={[4, 4, 0, 0]} name="rolling" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Trip-level comparison table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trip Fuel Comparison — Estimated vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fuelTrips.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <Fuel className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No fuel data yet. Dispatch trips and record actual fuel to see comparisons.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trip</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Truck</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Distance</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Est. Fuel (L)</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actual Fuel (L)</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Variance</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actual Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fuelTrips.map((t) => {
                        const est = t.estimatedFuelLitres != null ? parseFloat(String(t.estimatedFuelLitres)) : null;
                        const act = t.actualFuelLitres != null ? parseFloat(String(t.actualFuelLitres)) : null;
                        const variance = est != null && act != null ? ((act - est) / est) * 100 : null;
                        const distKm = t.estimatedDistanceKm ?? t.distanceKm;
                        return (
                          <tr key={t.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{t.tripCode}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{t.truckCode ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{t.plateNumber ?? ""}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {t.origin} → {t.destination}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {distKm ? `${parseFloat(String(distKm)).toFixed(0)} km` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">{fmt(t.estimatedFuelLitres)}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {act != null ? act.toFixed(1) : <span className="text-muted-foreground text-xs italic">not recorded</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {variance != null ? (
                                <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
                                  Math.abs(variance) <= 5
                                    ? "bg-green-100 text-green-700"
                                    : variance > 0
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-xs">{fmtCurrency(t.actualFuelCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Truck efficiency summary table */}
          {truckSummary.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Truck Efficiency Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Truck</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base (km/L)</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Rolling Avg (km/L)</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Samples</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {truckSummary.map((t) => {
                        const base = t.baseFuelEfficiencyKmL != null ? parseFloat(String(t.baseFuelEfficiencyKmL)) : null;
                        const rolling = t.avgFuelEfficiencyKmL != null ? parseFloat(String(t.avgFuelEfficiencyKmL)) : null;
                        const improved = base != null && rolling != null && rolling > base;
                        const degraded = base != null && rolling != null && rolling < base * 0.9;
                        return (
                          <tr key={t.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{t.truckCode}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.plateNumber}</td>
                            <td className="px-4 py-3 text-right">{base != null ? `${base.toFixed(2)}` : "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {rolling != null ? rolling.toFixed(2) : <span className="text-muted-foreground text-xs italic">no data</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{t.fuelEfficiencySampleCount ?? 0}</td>
                            <td className="px-4 py-3">
                              {rolling == null ? (
                                <span className="text-xs text-muted-foreground italic">awaiting data</span>
                              ) : degraded ? (
                                <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Below spec
                                </span>
                              ) : improved ? (
                                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Above base
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Within spec</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
