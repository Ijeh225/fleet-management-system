import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  Search,
  Truck,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type TruckStatus = "active" | "under_maintenance" | "inactive";
type FuelType = "diesel" | "petrol" | "electric" | "hybrid";

// ─── CSV Template columns ────────────────────────────────────────────────────
const CSV_HEADERS = [
  "truckCode",
  "plateNumber",
  "brand",
  "model",
  "year",
  "color",
  "vin",
  "engineNumber",
  "mileage",
  "fuelType",
  "status",
  "notes",
];

const CSV_EXAMPLE_ROW = [
  "TRK-001",
  "ABC-1234",
  "Mack",
  "Granite",
  "2020",
  "White",
  "1M2GR2GC0KM001234",
  "ENG-001",
  "45000",
  "diesel",
  "active",
  "Primary haul truck",
];

function downloadCsvTemplate() {
  const rows = [CSV_HEADERS.join(","), CSV_EXAMPLE_ROW.join(",")];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "truck_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV parser ──────────────────────────────────────────────────────────────
type ParsedRow = {
  rowNum: number;
  truckCode: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  engineNumber?: string;
  mileage?: number;
  fuelType?: FuelType;
  status?: TruckStatus;
  notes?: string;
  errors: string[];
};

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const get = (col: string) => {
      const idx = header.indexOf(col.toLowerCase());
      return idx >= 0 ? values[idx] ?? "" : "";
    };
    const errors: string[] = [];

    const truckCode = get("truckCode") || get("truck_code") || get("code");
    const plateNumber = get("plateNumber") || get("plate_number") || get("plate");
    if (!truckCode) errors.push("Truck Code is required");
    if (!plateNumber) errors.push("Plate Number is required");

    const yearStr = get("year");
    const year = yearStr ? parseInt(yearStr) : undefined;
    if (yearStr && (isNaN(year!) || year! < 1900 || year! > new Date().getFullYear() + 1)) {
      errors.push(`Invalid year: ${yearStr}`);
    }

    const mileageStr = get("mileage");
    const mileage = mileageStr ? parseInt(mileageStr) : undefined;
    if (mileageStr && isNaN(mileage!)) errors.push(`Invalid mileage: ${mileageStr}`);

    const fuelRaw = get("fuelType") || get("fuel_type") || get("fuel");
    const validFuels: FuelType[] = ["diesel", "petrol", "electric", "hybrid"];
    const fuelType = validFuels.includes(fuelRaw as FuelType) ? (fuelRaw as FuelType) : fuelRaw ? undefined : undefined;
    if (fuelRaw && !validFuels.includes(fuelRaw as FuelType)) errors.push(`Invalid fuel type: ${fuelRaw} (use diesel/petrol/electric/hybrid)`);

    const statusRaw = get("status");
    const validStatuses: TruckStatus[] = ["active", "under_maintenance", "inactive"];
    const status = validStatuses.includes(statusRaw as TruckStatus) ? (statusRaw as TruckStatus) : statusRaw ? undefined : "active";
    if (statusRaw && !validStatuses.includes(statusRaw as TruckStatus)) errors.push(`Invalid status: ${statusRaw}`);

    rows.push({
      rowNum: i,
      truckCode,
      plateNumber,
      brand: get("brand") || undefined,
      model: get("model") || undefined,
      year: isNaN(year!) ? undefined : year,
      color: get("color") || undefined,
      vin: get("vin") || undefined,
      engineNumber: get("engineNumber") || get("engine_number") || undefined,
      mileage: isNaN(mileage!) ? undefined : mileage,
      fuelType,
      status,
      notes: get("notes") || undefined,
      errors,
    });
  }
  return rows;
}

export default function Trucks() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    results: { row: number; plateNumber: string; status: string; reason?: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: trucks = [], refetch } = trpc.trucks.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const createTruck = trpc.trucks.create.useMutation({
    onSuccess: () => {
      toast.success("Truck added successfully");
      setShowAddDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkImport = trpc.trucks.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = trucks.filter((t) => {
    const matchSearch =
      !search ||
      t.truckCode.toLowerCase().includes(search.toLowerCase()) ||
      t.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.model ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const [form, setForm] = useState({
    truckCode: "",
    plateNumber: "",
    vin: "",
    engineNumber: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    fuelType: "diesel" as FuelType,
    purchaseDate: "",
    status: "active" as TruckStatus,
    assignedDriverId: "",
    insuranceExpiry: "",
    roadworthinessExpiry: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTruck.mutate({
      truckCode: form.truckCode,
      plateNumber: form.plateNumber,
      vin: form.vin || undefined,
      engineNumber: form.engineNumber || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      color: form.color || undefined,
      mileage: form.mileage ? parseInt(form.mileage) : undefined,
      fuelType: form.fuelType,
      purchaseDate: form.purchaseDate || undefined,
      status: form.status,
      assignedDriverId: form.assignedDriverId ? parseInt(form.assignedDriverId) : undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      roadworthinessExpiry: form.roadworthinessExpiry || undefined,
      notes: form.notes || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setParsedRows(rows);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;
    bulkImport.mutate({
      rows: validRows.map((r) => ({
        truckCode: r.truckCode,
        plateNumber: r.plateNumber,
        brand: r.brand,
        model: r.model,
        year: r.year,
        color: r.color,
        vin: r.vin,
        engineNumber: r.engineNumber,
        mileage: r.mileage,
        fuelType: r.fuelType,
        status: r.status,
        notes: r.notes,
      })),
    });
  };

  const resetImport = () => {
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trucks</h1>
          <p className="text-muted-foreground text-sm mt-1">{trucks.length} total vehicles in fleet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetImport(); setShowImportDialog(true); }} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Truck
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, plate, brand..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", count: trucks.filter((t) => t.status === "active").length, color: "text-green-600" },
          { label: "Under Maintenance", count: trucks.filter((t) => t.status === "under_maintenance").length, color: "text-yellow-600" },
          { label: "Inactive", count: trucks.filter((t) => t.status === "inactive").length, color: "text-gray-500" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trucks table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Truck className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No trucks found</p>
              <p className="text-sm mt-1">Add a truck manually or import from CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brand / Model</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Year</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mileage</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Insurance Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((truck) => (
                    <tr
                      key={truck.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/trucks/${truck.id}`)}
                    >
                      <td className="px-6 py-3 font-medium text-primary">{truck.truckCode}</td>
                      <td className="px-4 py-3 font-mono text-xs">{truck.plateNumber}</td>
                      <td className="px-4 py-3">{[truck.brand, truck.model].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{truck.year ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{truck.mileage?.toLocaleString() ?? "—"} km</td>
                      <td className="px-4 py-3"><StatusBadge status={truck.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {truck.insuranceExpiry
                          ? (truck.insuranceExpiry instanceof Date
                            ? truck.insuranceExpiry.toLocaleDateString()
                            : String(truck.insuranceExpiry))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add Truck Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Truck</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Truck Code *</Label>
                <Input placeholder="e.g. TRK-001" value={form.truckCode} onChange={(e) => setForm({ ...form, truckCode: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Plate Number *</Label>
                <Input placeholder="e.g. ABC-1234" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>VIN / Chassis</Label>
                <Input placeholder="Vehicle identification number" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Engine Number</Label>
                <Input value={form.engineNumber} onChange={(e) => setForm({ ...form, engineNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input placeholder="e.g. Mack, Volvo" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input placeholder="e.g. Granite, FH16" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" placeholder="2020" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mileage (km)</Label>
                <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fuel Type</Label>
                <Select value={form.fuelType} onValueChange={(v) => setForm({ ...form, fuelType: v as FuelType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TruckStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Driver</Label>
                <Select value={form.assignedDriverId} onValueChange={(v) => setForm({ ...form, assignedDriverId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                  <SelectContent>
                    {drivers.filter((d) => d.status === "active").map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Insurance Expiry</Label>
                <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Roadworthiness Expiry</Label>
                <Input type="date" value={form.roadworthinessExpiry} onChange={(e) => setForm({ ...form, roadworthinessExpiry: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createTruck.isPending}>
                {createTruck.isPending ? "Adding..." : "Add Truck"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── CSV Import Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) resetImport(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Bulk Import Trucks from CSV
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Upload */}
          {parsedRows.length === 0 && !importResult && (
            <div className="space-y-5">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Upload a CSV file with your truck data</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Choose CSV File
                </Button>
              </div>

              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Required CSV columns:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span><span className="font-semibold text-foreground">truckCode</span> — required</span>
                  <span><span className="font-semibold text-foreground">plateNumber</span> — required</span>
                  <span>brand — optional</span>
                  <span>model — optional</span>
                  <span>year — optional (number)</span>
                  <span>color — optional</span>
                  <span>vin — optional</span>
                  <span>engineNumber — optional</span>
                  <span>mileage — optional (number)</span>
                  <span>fuelType — diesel/petrol/electric/hybrid</span>
                  <span>status — active/under_maintenance/inactive</span>
                  <span>notes — optional</span>
                </div>
                <Button variant="ghost" size="sm" onClick={downloadCsvTemplate} className="gap-2 mt-1 text-primary">
                  <Download className="h-3.5 w-3.5" /> Download Template CSV
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preview & Validation */}
          {parsedRows.length > 0 && !importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> {validRows.length} valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="flex items-center gap-1.5 text-red-500 font-medium">
                      <XCircle className="h-4 w-4" /> {invalidRows.length} with errors
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={resetImport}>Clear</Button>
              </div>

              {invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
                  <p className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Rows with errors (will be skipped):
                  </p>
                  {invalidRows.map((r) => (
                    <div key={r.rowNum} className="text-xs text-red-600">
                      <span className="font-semibold">Row {r.rowNum}:</span> {r.errors.join("; ")}
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Row</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Code</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Plate</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Brand</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Model</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Year</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fuel</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Valid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedRows.map((r) => (
                      <tr key={r.rowNum} className={r.errors.length > 0 ? "bg-red-50" : "hover:bg-muted/20"}>
                        <td className="px-3 py-2 text-muted-foreground">{r.rowNum}</td>
                        <td className="px-3 py-2 font-medium">{r.truckCode || "—"}</td>
                        <td className="px-3 py-2 font-mono">{r.plateNumber || "—"}</td>
                        <td className="px-3 py-2">{r.brand || "—"}</td>
                        <td className="px-3 py-2">{r.model || "—"}</td>
                        <td className="px-3 py-2">{r.year ?? "—"}</td>
                        <td className="px-3 py-2">{r.fuelType || "—"}</td>
                        <td className="px-3 py-2">{r.status || "active"}</td>
                        <td className="px-3 py-2">
                          {r.errors.length === 0
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={resetImport}>Cancel</Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={validRows.length === 0 || bulkImport.isPending}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {bulkImport.isPending ? "Importing..." : `Import ${validRows.length} Truck${validRows.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex gap-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-xs text-muted-foreground mt-1">Imported</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{importResult.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-1">Skipped</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Row</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Plate Number</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Result</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importResult.results.map((r) => (
                      <tr key={r.row} className={r.status === "skipped" ? "bg-yellow-50" : ""}>
                        <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-2 font-mono">{r.plateNumber}</td>
                        <td className="px-3 py-2">
                          {r.status === "imported"
                            ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Imported</span>
                            : <span className="flex items-center gap-1 text-yellow-600 font-medium"><AlertCircle className="h-3.5 w-3.5" /> Skipped</span>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={resetImport}>Import Another File</Button>
                <Button onClick={() => setShowImportDialog(false)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
