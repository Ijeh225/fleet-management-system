import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Search, Truck, MapPin, Calendar, Banknote,
  ArrowRight, Clock, CheckCircle2, XCircle, Package,
  Navigation, Loader2, Edit, Trash2, ChevronRight, TrendingUp,
  Fuel, Route, Zap, AlertCircle, Info
} from "lucide-react";
import { MapView } from "@/components/Map";

type TripStatus = "scheduled" | "loading" | "in_transit" | "delivered" | "completed" | "cancelled";

interface TripRow {
  id: number;
  tripCode: string;
  truckId: number | null;
  truckCode: string | null;
  plateNumber: string | null;
  driverId: number | null;
  driverName: string | null;
  cargoType: string | null;
  cargoDescription: string | null;
  containerSize: "20ft" | "40ft" | "40ft_hc" | null;
  origin: string;
  destination: string;
  scheduledDeparture: Date | string | null;
  actualDeparture: Date | string | null;
  scheduledArrival: Date | string | null;
  actualArrival: Date | string | null;
  distanceKm: string | null;
  revenueAmount: string | null;
  fuelCost: string | null;
  otherExpenses: string | null;
  status: string;
  clientName: string | null;
  notes: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Calendar },
  loading: { label: "Loading", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Package },
  in_transit: { label: "In Transit", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Navigation },
  delivered: { label: "Delivered", color: "bg-teal-100 text-teal-700 border-teal-200", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const STATUS_FLOW: Record<TripStatus, TripStatus[]> = {
  scheduled: ["loading", "cancelled"],
  loading: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

function StatusBadge({ status }: { status: TripStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatCurrency(val: string | number | null | undefined) {
  const n = parseFloat(String(val ?? "0"));
  return isNaN(n) ? "₦0.00" : `₦${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(val: Date | string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleString();
}

export default function Trips() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [containerSizeFilter, setContainerSizeFilter] = useState<"all" | "20ft" | "40ft" | "40ft_hc">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editTrip, setEditTrip] = useState<TripRow | null>(null);
  const [viewTrip, setViewTrip] = useState<TripRow | null>(null);
  const [fuelRecordTrip, setFuelRecordTrip] = useState<TripRow | null>(null);
  const [actualFuelLitres, setActualFuelLitres] = useState("");
  const [actualFuelCost, setActualFuelCost] = useState("");

  const utils = trpc.useUtils();
  const { data: trips = [], isLoading } = trpc.trips.list.useQuery({});
  const { data: stats } = trpc.trips.stats.useQuery();
  const { data: trucks = [] } = trpc.trucks.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const createMutation = trpc.trips.create.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); utils.trips.stats.invalidate(); setShowCreate(false); toast.success("Trip dispatched successfully"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.trips.update.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); setEditTrip(null); toast.success("Trip updated"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.trips.updateStatus.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); utils.trips.stats.invalidate(); utils.trips.fleetAvailability.invalidate(); toast.success("Trip status updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.trips.delete.useMutation({
    onSuccess: () => { utils.trips.list.invalidate(); utils.trips.stats.invalidate(); toast.success("Trip deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const recordActualFuelMutation = trpc.trips.recordActualFuel.useMutation({
    onSuccess: () => {
      utils.trips.list.invalidate();
      setFuelRecordTrip(null);
      setActualFuelLitres("");
      setActualFuelCost("");
      toast.success("Actual fuel recorded — truck efficiency profile updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return trips.filter(t => {
      const matchSearch = !search ||
        t.tripCode.toLowerCase().includes(search.toLowerCase()) ||
        t.origin.toLowerCase().includes(search.toLowerCase()) ||
        t.destination.toLowerCase().includes(search.toLowerCase()) ||
        (t.truckCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.driverName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.clientName ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchContainerSize = containerSizeFilter === "all" || t.containerSize === containerSizeFilter;
      return matchSearch && matchStatus && matchContainerSize;
    });
  }, [trips, search, statusFilter, containerSizeFilter]);

  // ─── Route Estimation ─────────────────────────────────────────────────────────
  const estimateRouteMutation = trpc.trips.estimateRoute.useMutation({
    onError: (e) => toast.error(`Route estimation failed: ${e.message}`),
  });

  // ─── Create / Edit Form ───────────────────────────────────────────────────────
  function TripForm({ initial, onSubmit, loading, onClose }: {
    initial?: Partial<typeof editTrip>;
    onSubmit: (data: Record<string, unknown>) => void;
    loading: boolean;
    onClose: () => void;
  }) {
    const isEdit = !!initial?.id;
    const [form, setForm] = useState({
      truckId: initial?.truckId ? String(initial.truckId) : "",
      driverId: initial?.driverId ? String(initial.driverId) : "",
      cargoType: initial?.cargoType ?? "",
      cargoDescription: initial?.cargoDescription ?? "",
      origin: initial?.origin ?? "",
      destination: initial?.destination ?? "",
      scheduledDeparture: initial?.scheduledDeparture ? new Date(initial.scheduledDeparture).toISOString().slice(0, 16) : "",
      scheduledArrival: initial?.scheduledArrival ? new Date(initial.scheduledArrival).toISOString().slice(0, 16) : "",
      distanceKm: initial?.distanceKm ? String(initial.distanceKm) : "",
      revenueAmount: initial?.revenueAmount ? String(initial.revenueAmount) : "",
      fuelCost: initial?.fuelCost ? String(initial.fuelCost) : "",
      otherExpenses: initial?.otherExpenses ? String(initial.otherExpenses) : "",
      clientName: initial?.clientName ?? "",
      notes: initial?.notes ?? "",
      containerSize: (initial as (typeof initial & { containerSize?: string }))?.containerSize ?? "" as "" | "20ft" | "40ft" | "40ft_hc",
      dieselPricePerLitre: "1.20",
    });

    const [routeInfo, setRouteInfo] = useState<{
      distanceKm: number;
      distanceText: string;
      durationText: string;
      durationMins: number;
      estimatedFuelLitres: number;
      estimatedFuelCost: number;
      fuelEfficiencyUsed: number;
      usingRollingAverage: boolean;
      sampleCount: number;
      usingDefault?: boolean;
    } | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const originInputRef = useRef<HTMLInputElement>(null);
    const destInputRef = useRef<HTMLInputElement>(null);
    const autocompleteOriginRef = useRef<google.maps.places.Autocomplete | null>(null);
    const autocompleteDestRef = useRef<google.maps.places.Autocomplete | null>(null);

    const activeTrucks = trucks.filter(t => t.status === "active");
    const selectedTruck = activeTrucks.find(t => String(t.id) === form.truckId);

    // Compute diesel estimate client-side — uses truck profile if selected, else defaults to 3.5 km/L
    const computeEstimate = useCallback((distanceKm: number, truckId: string, dieselPrice: string) => {
      const truck = activeTrucks.find(t => String(t.id) === truckId);
      // Use truck's rolling average or base efficiency, or fall back to 3.5 km/L default
      const rawEff = truck
        ? parseFloat((truck as Record<string, unknown>).avgFuelEfficiencyKmL as string ?? (truck as Record<string, unknown>).fuelEfficiencyKmL as string ?? "3.5")
        : 3.5;
      const effKmL = isNaN(rawEff) || rawEff <= 0 ? 3.5 : rawEff;
      const litres = distanceKm / effKmL;
      const price = parseFloat(dieselPrice) || 0; // 0 means no cost shown if price not entered
      const cost = price > 0 ? litres * price : 0;
      return {
        estimatedFuelLitres: Math.round(litres * 10) / 10,
        estimatedFuelCost: Math.round(cost * 100) / 100,
        fuelEfficiencyUsed: Math.round(effKmL * 100) / 100,
        usingRollingAverage: !!(truck && (truck as Record<string, unknown>).avgFuelEfficiencyKmL),
        sampleCount: truck ? (((truck as Record<string, unknown>).fuelEfficiencySampleCount as number) ?? 0) : 0,
        usingDefault: !truck,
      };
    }, [activeTrucks]);

    // Auto-calculate route when origin + destination are both set
    const calculateRoute = useCallback(() => {
      if (!mapRef.current || !form.origin.trim() || !form.destination.trim()) return;
      if (!window.google?.maps) return;
      setRouteLoading(true);
      const directionsService = new window.google.maps.DirectionsService();
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: false,
          polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.85 },
        });
        directionsRendererRef.current.setMap(mapRef.current);
      }
      directionsService.route(
        { origin: form.origin, destination: form.destination, travelMode: window.google.maps.TravelMode.DRIVING },
        (result, status) => {
          setRouteLoading(false);
          if (status === "OK" && result) {
            directionsRendererRef.current!.setDirections(result);
            const leg = result.routes[0].legs[0];
            const distKm = Math.round((leg.distance!.value / 1000) * 10) / 10;
            const durationMins = Math.round(leg.duration!.value / 60);
            const estimate = computeEstimate(distKm, form.truckId, form.dieselPricePerLitre);
            setRouteInfo({
              distanceKm: distKm,
              distanceText: leg.distance!.text,
              durationText: leg.duration!.text,
              durationMins,
              estimatedFuelLitres: estimate?.estimatedFuelLitres ?? 0,
              estimatedFuelCost: estimate?.estimatedFuelCost ?? 0,
              fuelEfficiencyUsed: estimate?.fuelEfficiencyUsed ?? 3.5,
              usingRollingAverage: estimate?.usingRollingAverage ?? false,
              sampleCount: estimate?.sampleCount ?? 0,
              usingDefault: estimate?.usingDefault ?? true,
            });
            // Auto-fill distance and fuel cost
            setForm(f => ({
              ...f,
              distanceKm: String(distKm),
              fuelCost: estimate ? String(estimate.estimatedFuelCost) : f.fuelCost,
            }));
          } else {
            setRouteInfo(null);
            if (directionsRendererRef.current) {
              directionsRendererRef.current.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
            }
          }
        }
      );
    }, [form.origin, form.destination, form.truckId, form.dieselPricePerLitre, computeEstimate]);

    // Re-run estimate when diesel price or truck changes (if route already drawn)
    useEffect(() => {
      if (routeInfo) {
        const estimate = computeEstimate(routeInfo.distanceKm, form.truckId, form.dieselPricePerLitre);
        if (estimate) {
          setRouteInfo(r => r ? { ...r, ...estimate } : r);
          if (estimate.estimatedFuelCost > 0) {
            setForm(f => ({ ...f, fuelCost: String(estimate.estimatedFuelCost) }));
          }
        }
      }
    }, [form.dieselPricePerLitre, form.truckId]);

    // Debounced auto-calculate when origin/destination text changes
    useEffect(() => {
      if (!isEdit && form.origin.trim().length > 3 && form.destination.trim().length > 3) {
        const timer = setTimeout(calculateRoute, 800);
        return () => clearTimeout(timer);
      }
    }, [form.origin, form.destination, isEdit]);

    // Initialize Places Autocomplete independently of map load
    // This runs as soon as the input refs are available and Google Maps is loaded
    const initAutocomplete = useCallback(() => {
      if (!window.google?.maps?.places) return;

      if (originInputRef.current && !autocompleteOriginRef.current) {
        autocompleteOriginRef.current = new window.google.maps.places.Autocomplete(originInputRef.current, {
          types: ["geocode", "establishment"],
          fields: ["formatted_address", "name", "geometry"],
        });
        autocompleteOriginRef.current.addListener("place_changed", () => {
          const place = autocompleteOriginRef.current!.getPlace();
          const addr = place.formatted_address ?? place.name ?? "";
          if (addr) setForm(f => ({ ...f, origin: addr }));
        });
      }

      if (destInputRef.current && !autocompleteDestRef.current) {
        autocompleteDestRef.current = new window.google.maps.places.Autocomplete(destInputRef.current, {
          types: ["geocode", "establishment"],
          fields: ["formatted_address", "name", "geometry"],
        });
        autocompleteDestRef.current.addListener("place_changed", () => {
          const place = autocompleteDestRef.current!.getPlace();
          const addr = place.formatted_address ?? place.name ?? "";
          if (addr) setForm(f => ({ ...f, destination: addr }));
        });
      }
    }, []);

    // Try to init autocomplete on mount and retry until Google Maps is ready
    useEffect(() => {
      if (isEdit) return;
      if (window.google?.maps?.places) {
        initAutocomplete();
      } else {
        // Poll until Google Maps JS API is loaded
        const interval = setInterval(() => {
          if (window.google?.maps?.places) {
            clearInterval(interval);
            initAutocomplete();
          }
        }, 300);
        return () => clearInterval(interval);
      }
    }, [isEdit, initAutocomplete]);

    // MutationObserver: toggle body.pac-open when pac-container becomes visible/hidden
    // This disables the Dialog overlay's pointer-events during autocomplete selection
    useEffect(() => {
      if (isEdit) return;
      let observer: MutationObserver | null = null;
      const watchPacContainer = () => {
        const pac = document.querySelector('.pac-container') as HTMLElement | null;
        if (!pac) return;
        const updatePacOpen = () => {
          const isVisible = pac.style.display !== 'none' && pac.offsetHeight > 0;
          document.body.classList.toggle('pac-open', isVisible);
        };
        observer = new MutationObserver(updatePacOpen);
        observer.observe(pac, { attributes: true, attributeFilter: ['style'] });
        updatePacOpen();
      };
      // Wait for pac-container to be added to DOM
      const domObserver = new MutationObserver(() => {
        if (document.querySelector('.pac-container')) {
          domObserver.disconnect();
          watchPacContainer();
        }
      });
      domObserver.observe(document.body, { childList: true, subtree: true });
      return () => {
        observer?.disconnect();
        domObserver.disconnect();
        document.body.classList.remove('pac-open');
      };
    }, [isEdit]);

    // Setup map and DirectionsRenderer when map is ready
    const handleMapReady = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.85 },
      });
      directionsRendererRef.current.setMap(map);
      // Also try to init autocomplete now that maps is definitely loaded
      initAutocomplete();
      // If editing and already has origin/destination, draw the route
      if (form.origin && form.destination) {
        setTimeout(calculateRoute, 500);
      }
    }, [initAutocomplete]);

    // Trigger route calc when autocomplete sets a place
    useEffect(() => {
      if (mapRef.current && form.origin.trim().length > 3 && form.destination.trim().length > 3) {
        calculateRoute();
      }
    }, [form.origin, form.destination]);



    return (
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Form Fields */}
        <div className="space-y-4">
          {/* Truck & Driver */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Truck <span className="text-red-500">*</span></Label>
              <Select value={form.truckId} onValueChange={v => setForm(f => ({ ...f, truckId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
                <SelectContent>
                  {activeTrucks.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.truckCode} — {t.plateNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTruck && (
                <p className="text-[10px] text-muted-foreground">
                  {(selectedTruck as Record<string,unknown>).avgFuelEfficiencyKmL
                    ? `Avg ${(selectedTruck as Record<string,unknown>).avgFuelEfficiencyKmL} km/L (${(selectedTruck as Record<string,unknown>).fuelEfficiencySampleCount} trips)`
                    : (selectedTruck as Record<string,unknown>).fuelEfficiencyKmL
                    ? `Base ${(selectedTruck as Record<string,unknown>).fuelEfficiencyKmL} km/L`
                    : "No fuel profile set — using 3.5 km/L default"}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Driver</Label>
              <Select value={form.driverId} onValueChange={v => setForm(f => ({ ...f, driverId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No driver assigned</SelectItem>
                  {drivers.filter(d => d.status === "active").map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origin & Destination with Autocomplete */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-green-600" /> Origin <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={originInputRef}
              value={form.origin}
              onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
              placeholder="e.g. Lagos, Nigeria or Abuja"
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-600" /> Destination <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={destInputRef}
              value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              placeholder="e.g. Port Harcourt or Kano"
            />
          </div>

          {/* Diesel Price */}
          {!isEdit && (
            <div className="space-y-1">
              <Label className="text-xs">Diesel Price / litre (₦)</Label>
              <Input
                type="number" min="0" step="1"
                className="h-8 text-xs"
                value={form.dieselPricePerLitre}
                onChange={e => setForm(f => ({ ...f, dieselPricePerLitre: e.target.value }))}
                placeholder="e.g. 1200"
              />
            </div>
          )}

          {/* Container & Client */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Container Number</Label>
              <Input value={form.cargoType} onChange={e => setForm(f => ({ ...f, cargoType: e.target.value }))} placeholder="e.g. MSCU1234567" />
            </div>
            <div className="space-y-1">
              <Label>Container Size</Label>
              <Select value={form.containerSize} onValueChange={v => setForm(f => ({ ...f, containerSize: v as "" | "20ft" | "40ft" | "40ft_hc" }))}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft">20ft Standard</SelectItem>
                  <SelectItem value="40ft">40ft Standard</SelectItem>
                  <SelectItem value="40ft_hc">40ft High Cube</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Client Name</Label>
            <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Client / company" />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Scheduled Departure</Label>
              <Input type="datetime-local" value={form.scheduledDeparture} onChange={e => setForm(f => ({ ...f, scheduledDeparture: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Scheduled Arrival</Label>
              <Input type="datetime-local" value={form.scheduledArrival} onChange={e => setForm(f => ({ ...f, scheduledArrival: e.target.value }))} />
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Distance (km)</Label>
              <Input type="number" min="0" value={form.distanceKm} onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} placeholder="Auto" />
            </div>
            <div className="space-y-1">
              <Label>Revenue</Label>
              <Input type="number" min="0" step="0.01" value={form.revenueAmount} onChange={e => setForm(f => ({ ...f, revenueAmount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Fuel Cost</Label>
              <Input type="number" min="0" step="0.01" value={form.fuelCost} onChange={e => setForm(f => ({ ...f, fuelCost: e.target.value }))} placeholder="Auto" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." rows={2} />
          </div>

        </div>

        {/* Live Map + Route Summary — below form fields */}
        {!isEdit && (
          <div className="space-y-2">
            {/* Map */}
            <div className="relative rounded-lg overflow-hidden border border-border" style={{ height: 240 }}>
              <MapView
                className="w-full h-full"
                initialCenter={{ lat: 9.082, lng: 8.6753 }}
                initialZoom={5}
                onMapReady={handleMapReady}
              />
              {routeLoading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Calculating route...
                  </div>
                </div>
              )}
              {!form.origin && !form.destination && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-muted-foreground text-xs bg-background/80 rounded-lg px-3 py-2">
                    <Route className="h-5 w-5 mx-auto mb-1 opacity-50" />
                    Enter origin &amp; destination to see the route
                  </div>
                </div>
              )}
            </div>

            {/* Route & Fuel Summary — horizontal strip */}
            {routeInfo ? (
              <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Route calculated
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded bg-white dark:bg-slate-900 border p-2">
                    <div className="text-muted-foreground">Distance</div>
                    <div className="font-bold">{routeInfo.distanceText}</div>
                    <div className="text-[10px] text-muted-foreground">{routeInfo.distanceKm} km</div>
                  </div>
                  <div className="rounded bg-white dark:bg-slate-900 border p-2">
                    <div className="text-muted-foreground">Travel Time</div>
                    <div className="font-bold">{routeInfo.durationText}</div>
                    <div className="text-[10px] text-muted-foreground">{routeInfo.durationMins} mins</div>
                  </div>
                  <div className="rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2">
                    <div className="text-muted-foreground flex items-center gap-1"><Fuel className="h-3 w-3" /> Est. Diesel</div>
                    <div className="font-bold text-amber-700 dark:text-amber-400">{routeInfo.estimatedFuelLitres > 0 ? `${routeInfo.estimatedFuelLitres} L` : "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{form.truckId ? `${routeInfo.fuelEfficiencyUsed} km/L` : `@ 3.5 km/L default`}</div>
                  </div>
                  <div className="rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 p-2">
                    <div className="text-muted-foreground flex items-center gap-1"><Fuel className="h-3 w-3" /> Fuel Cost</div>
                    <div className="font-bold text-blue-700 dark:text-blue-400">{routeInfo.estimatedFuelCost > 0 ? `₦${routeInfo.estimatedFuelCost.toLocaleString()}` : "—"}</div>
                    <div className="text-[10px] text-muted-foreground">@ ₦{form.dieselPricePerLitre}/L</div>
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                  {routeInfo.usingDefault
                    ? <><AlertCircle className="h-3 w-3 text-amber-500" /> Using default 3.5 km/L — select a truck for a more accurate estimate</>
                    : routeInfo.usingRollingAverage
                    ? <><Info className="h-3 w-3 text-green-600" /> Rolling avg from {routeInfo.sampleCount} trips ({routeInfo.fuelEfficiencyUsed} km/L)</>
                    : <><AlertCircle className="h-3 w-3 text-amber-500" /> Base profile ({routeInfo.fuelEfficiencyUsed} km/L) — record actual fuel to improve</>}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-2 text-center text-xs text-muted-foreground">
                <Fuel className="h-3.5 w-3.5 mx-auto mb-0.5 opacity-40" />
                Diesel estimate appears once route is calculated
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={loading || !form.truckId || !form.origin || !form.destination} onClick={() => onSubmit({
            truckId: parseInt(form.truckId),
            driverId: form.driverId && form.driverId !== "none" ? parseInt(form.driverId) : undefined,
            cargoType: form.cargoType || undefined,
            cargoDescription: form.cargoDescription || undefined,
            containerSize: form.containerSize || undefined,
            origin: form.origin,
            destination: form.destination,
            scheduledDeparture: form.scheduledDeparture || undefined,
            scheduledArrival: form.scheduledArrival || undefined,
            distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : undefined,
            revenueAmount: form.revenueAmount ? parseFloat(form.revenueAmount) : undefined,
            fuelCost: form.fuelCost ? parseFloat(form.fuelCost) : undefined,
            otherExpenses: form.otherExpenses ? parseFloat(form.otherExpenses) : undefined,
            clientName: form.clientName || undefined,
            notes: form.notes || undefined,
          })}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? "Save Changes" : "Dispatch Trip"}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trip Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Dispatch and track all fleet transport jobs</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Dispatch Trip
          </Button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Trips", value: stats.totalTrips, icon: Truck, color: "text-blue-600" },
              { label: "Active Trips", value: stats.activeTrips, icon: Navigation, color: "text-purple-600" },
              { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: Banknote, color: "text-green-600" },
              { label: "Net Profit", value: formatCurrency(stats.netProfit), icon: TrendingUp, color: stats.netProfit >= 0 ? "text-green-600" : "text-red-600" },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search trips, trucks, drivers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Container Size chip filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Container:</span>
            {(["all", "20ft", "40ft", "40ft_hc"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setContainerSizeFilter(size)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  containerSizeFilter === size
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {size === "all" ? "All Sizes" : size === "40ft_hc" ? "40ft HC" : size}
              </button>
            ))}
            {containerSizeFilter !== "all" && (
              <span className="text-xs text-muted-foreground ml-1">
                — {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Trips Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Truck className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No trips found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Click "Dispatch Trip" to create your first trip</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trip Code</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Truck / Driver</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cargo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(trip => {
                      const nextStatuses = STATUS_FLOW[trip.status as TripStatus];
                      return (
                        <tr key={trip.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => setViewTrip(trip)} className="font-mono text-xs font-semibold text-primary hover:underline">
                              {trip.tripCode}
                            </button>
                            {trip.clientName && <p className="text-xs text-muted-foreground mt-0.5">{trip.clientName}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm">
                              <span className="font-medium">{trip.origin}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{trip.destination}</span>
                            </div>
                            {trip.distanceKm && (
                              <p className="text-xs text-muted-foreground mt-0.5">{parseFloat(String(trip.distanceKm)).toFixed(0)} km</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{trip.truckCode ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{trip.driverName ?? "No driver"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm">{trip.cargoType ?? "—"}</p>
                            {/* Container Number shown in trip list */}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-green-700">{formatCurrency(trip.revenueAmount)}</p>
                            <p className="text-xs text-muted-foreground">Fuel: {formatCurrency(trip.fuelCost)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={trip.status as TripStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {nextStatuses.map(ns => (
                                <Button key={ns} size="sm" variant="outline" className="h-7 text-xs px-2"
                                  onClick={() => updateStatusMutation.mutate({ id: trip.id, status: ns,
                                    actualDeparture: ns === "in_transit" ? new Date().toISOString() : undefined,
                                    actualArrival: ns === "delivered" ? new Date().toISOString() : undefined,
                                  })}>
                                  {STATUS_CONFIG[ns].label}
                                </Button>
                              ))}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTrip(trip)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => { if (confirm("Delete this trip?")) deleteMutation.mutate({ id: trip.id }); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(trip.status === "delivered" || trip.status === "completed") && !(trip as TripRow & { actualFuelLitres?: string | null }).actualFuelLitres && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700" title="Record Actual Fuel" onClick={() => setFuelRecordTrip(trip)}>
                                  <Fuel className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTrip(trip)}>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          className="w-[calc(100vw-2rem)] max-w-4xl"
          onInteractOutside={(e) => {
            // Prevent dialog from closing when clicking a Google Places Autocomplete suggestion
            const target = e.target as HTMLElement;
            if (target?.closest?.('.pac-container') || target?.classList?.contains('pac-item') || target?.classList?.contains('pac-item-query')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" /> Dispatch New Trip
            </DialogTitle>
          </DialogHeader>
          <TripForm
            onSubmit={(data) => createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0])}
            loading={createMutation.isPending}
            onClose={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editTrip && (
        <Dialog open={!!editTrip} onOpenChange={() => setEditTrip(null)}>
          <DialogContent
            className="w-[calc(100vw-2rem)] max-w-4xl"
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target?.closest?.('.pac-container') || target?.classList?.contains('pac-item') || target?.classList?.contains('pac-item-query')) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Trip — {editTrip.tripCode}</DialogTitle>
            </DialogHeader>
            <TripForm
              initial={editTrip}
              onSubmit={(data) => updateMutation.mutate({ id: editTrip.id, ...data } as Parameters<typeof updateMutation.mutate>[0])}
              loading={updateMutation.isPending}
              onClose={() => setEditTrip(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      {viewTrip && (
        <Dialog open={!!viewTrip} onOpenChange={() => setViewTrip(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Trip Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-primary">{viewTrip.tripCode}</span>
                <StatusBadge status={viewTrip.status as TripStatus} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Truck</p><p className="font-medium">{viewTrip.truckCode ?? "—"} ({viewTrip.plateNumber ?? "—"})</p></div>
                <div><p className="text-muted-foreground text-xs">Driver</p><p className="font-medium">{viewTrip.driverName ?? "Not assigned"}</p></div>
                <div><p className="text-muted-foreground text-xs">Origin</p><p className="font-medium">{viewTrip.origin}</p></div>
                <div><p className="text-muted-foreground text-xs">Destination</p><p className="font-medium">{viewTrip.destination}</p></div>
                <div><p className="text-muted-foreground text-xs">Container No.</p><p className="font-medium">{viewTrip.cargoType ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Container Size</p><p className="font-medium">{viewTrip.containerSize ? viewTrip.containerSize.replace("_hc", " HC") : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Client</p><p className="font-medium">{viewTrip.clientName ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Distance</p><p className="font-medium">{viewTrip.distanceKm ? `${parseFloat(String(viewTrip.distanceKm)).toFixed(0)} km` : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Revenue</p><p className="font-semibold text-green-700">{formatCurrency(viewTrip.revenueAmount)}</p></div>
                <div><p className="text-muted-foreground text-xs">Fuel Cost</p><p className="font-medium">{formatCurrency(viewTrip.fuelCost)}</p></div>
                <div><p className="text-muted-foreground text-xs">Other Expenses</p><p className="font-medium">{formatCurrency(viewTrip.otherExpenses)}</p></div>
                <div><p className="text-muted-foreground text-xs">Scheduled Departure</p><p className="font-medium">{formatDateTime(viewTrip.scheduledDeparture)}</p></div>
                <div><p className="text-muted-foreground text-xs">Actual Departure</p><p className="font-medium">{formatDateTime(viewTrip.actualDeparture)}</p></div>
                <div><p className="text-muted-foreground text-xs">Scheduled Arrival</p><p className="font-medium">{formatDateTime(viewTrip.scheduledArrival)}</p></div>
                <div><p className="text-muted-foreground text-xs">Actual Arrival</p><p className="font-medium">{formatDateTime(viewTrip.actualArrival)}</p></div>
              </div>
              {viewTrip.cargoDescription && (
                <>
                  <Separator />
                  <div><p className="text-muted-foreground text-xs mb-1">Cargo Description</p><p className="text-sm">{viewTrip.cargoDescription}</p></div>
                </>
              )}
              {viewTrip.notes && (
                <div><p className="text-muted-foreground text-xs mb-1">Notes</p><p className="text-sm">{viewTrip.notes}</p></div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net Profit</span>
                <span className={`font-bold text-base ${(parseFloat(String(viewTrip.revenueAmount ?? 0)) - parseFloat(String(viewTrip.fuelCost ?? 0)) - parseFloat(String(viewTrip.otherExpenses ?? 0))) >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(parseFloat(String(viewTrip.revenueAmount ?? 0)) - parseFloat(String(viewTrip.fuelCost ?? 0)) - parseFloat(String(viewTrip.otherExpenses ?? 0)))}
                </span>
              </div>

              {/* Fuel Estimation vs Actual */}
              {(viewTrip as TripRow & { estimatedFuelLitres?: string | null; actualFuelLitres?: string | null; estimatedDistanceKm?: string | null; estimatedDurationMins?: number | null }).estimatedFuelLitres && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Fuel Estimation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-white dark:bg-slate-900 border p-2">
                        <p className="text-muted-foreground">Est. Distance</p>
                        <p className="font-semibold">{parseFloat(String((viewTrip as TripRow & { estimatedDistanceKm?: string | null }).estimatedDistanceKm ?? "0")).toFixed(0)} km</p>
                      </div>
                      <div className="rounded bg-white dark:bg-slate-900 border p-2">
                        <p className="text-muted-foreground">Est. Duration</p>
                        <p className="font-semibold">{(viewTrip as TripRow & { estimatedDurationMins?: number | null }).estimatedDurationMins ? `${Math.floor(((viewTrip as TripRow & { estimatedDurationMins?: number | null }).estimatedDurationMins ?? 0) / 60)}h ${((viewTrip as TripRow & { estimatedDurationMins?: number | null }).estimatedDurationMins ?? 0) % 60}m` : "—"}</p>
                      </div>
                      <div className="rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-200 p-2">
                        <p className="text-muted-foreground">Est. Fuel</p>
                        <p className="font-bold text-amber-700">{parseFloat(String((viewTrip as TripRow & { estimatedFuelLitres?: string | null }).estimatedFuelLitres ?? "0")).toFixed(1)} L</p>
                      </div>
                      <div className="rounded bg-white dark:bg-slate-900 border p-2">
                        <p className="text-muted-foreground">Actual Fuel</p>
                        <p className={`font-bold ${
                          (viewTrip as TripRow & { actualFuelLitres?: string | null }).actualFuelLitres
                            ? parseFloat(String((viewTrip as TripRow & { actualFuelLitres?: string | null }).actualFuelLitres)) > parseFloat(String((viewTrip as TripRow & { estimatedFuelLitres?: string | null }).estimatedFuelLitres ?? "0"))
                              ? "text-red-600" : "text-green-700"
                            : "text-muted-foreground"
                        }`}>
                          {(viewTrip as TripRow & { actualFuelLitres?: string | null }).actualFuelLitres
                            ? `${parseFloat(String((viewTrip as TripRow & { actualFuelLitres?: string | null }).actualFuelLitres)).toFixed(1)} L`
                            : "Not recorded"}
                        </p>
                      </div>
                    </div>
                    {!(viewTrip as TripRow & { actualFuelLitres?: string | null }).actualFuelLitres &&
                      (viewTrip.status === "delivered" || viewTrip.status === "completed") && (
                      <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 text-xs h-7"
                        onClick={() => { setFuelRecordTrip(viewTrip); setViewTrip(null); }}>
                        <Fuel className="h-3.5 w-3.5 mr-1.5" /> Record Actual Fuel Used
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTrip(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Record Actual Fuel Dialog */}
      {fuelRecordTrip && (
        <Dialog open={!!fuelRecordTrip} onOpenChange={() => setFuelRecordTrip(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-amber-600" /> Record Actual Fuel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-mono font-semibold text-primary">{fuelRecordTrip.tripCode}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{fuelRecordTrip.origin} → {fuelRecordTrip.destination}</p>
              </div>
              <div className="space-y-1">
                <Label>Actual Fuel Used (litres) <span className="text-red-500">*</span></Label>
                <Input
                  type="number" min="0" step="0.1"
                  placeholder="e.g. 185.5"
                  value={actualFuelLitres}
                  onChange={e => setActualFuelLitres(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Actual Fuel Cost (₦)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="e.g. 222.60"
                  value={actualFuelCost}
                  onChange={e => setActualFuelCost(e.target.value)}
                />
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2.5 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Recording actual fuel will update this truck’s rolling average fuel efficiency, improving future estimates.</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFuelRecordTrip(null)}>Cancel</Button>
              <Button
                disabled={!actualFuelLitres || parseFloat(actualFuelLitres) <= 0 || recordActualFuelMutation.isPending}
                onClick={() => recordActualFuelMutation.mutate({
                  tripId: fuelRecordTrip.id,
                  actualFuelLitres: parseFloat(actualFuelLitres),
                  actualFuelCost: actualFuelCost ? parseFloat(actualFuelCost) : undefined,
                })}
              >
                {recordActualFuelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save &amp; Update Efficiency
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
