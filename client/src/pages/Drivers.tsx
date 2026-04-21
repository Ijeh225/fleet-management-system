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
  Edit,
  Plus,
  Search,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type DriverStatus = "active" | "inactive" | "on_leave";

// ─── CSV Template ─────────────────────────────────────────────────────────────
const CSV_HEADERS = [
  "name",
  "licenseNumber",
  "licenseExpiry",
  "phone",
  "email",
  "address",
  "status",
  "notes",
];

const CSV_EXAMPLE_ROW = [
  "John Doe",
  "DL-123456",
  "2027-06-30",
  "+1-555-0100",
  "john.doe@example.com",
  "123 Main St",
  "active",
  "Senior driver",
];

function downloadCsvTemplate() {
  const rows = [CSV_HEADERS.join(","), CSV_EXAMPLE_ROW.join(",")];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "driver_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
type ParsedRow = {
  rowNum: number;
  name: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: DriverStatus;
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
      return idx >= 0 ? (values[idx] ?? "") : "";
    };
    const errors: string[] = [];

    const name = get("name");
    if (!name) errors.push("Name is required");

    const licenseExpiry = get("licenseExpiry") || get("license_expiry") || get("expiry");
    if (licenseExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry)) {
      errors.push(`Invalid license expiry format: "${licenseExpiry}" (use YYYY-MM-DD)`);
    }

    const statusRaw = get("status");
    const validStatuses: DriverStatus[] = ["active", "inactive", "on_leave"];
    const status: DriverStatus | undefined = validStatuses.includes(statusRaw as DriverStatus)
      ? (statusRaw as DriverStatus)
      : statusRaw
      ? undefined
      : "active";
    if (statusRaw && !validStatuses.includes(statusRaw as DriverStatus)) {
      errors.push(`Invalid status: "${statusRaw}" (use active/inactive/on_leave)`);
    }

    rows.push({
      rowNum: i,
      name,
      licenseNumber: get("licenseNumber") || get("license_number") || get("license") || undefined,
      licenseExpiry: licenseExpiry || undefined,
      phone: get("phone") || undefined,
      email: get("email") || undefined,
      address: get("address") || undefined,
      status,
      notes: get("notes") || undefined,
      errors,
    });
  }
  return rows;
}

export default function Drivers() {
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editDriver, setEditDriver] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    results: { row: number; name: string; status: string; reason?: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: drivers = [], refetch } = trpc.drivers.list.useQuery();
  const { data: trucks = [] } = trpc.trucks.list.useQuery();

  const createDriver = trpc.drivers.create.useMutation({
    onSuccess: () => {
      toast.success("Driver added");
      setShowAddDialog(false);
      setForm({ name: "", phone: "", licenseNumber: "", licenseExpiry: "", status: "active", notes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateDriver = trpc.drivers.update.useMutation({
    onSuccess: () => { toast.success("Driver updated"); setEditDriver(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const archiveDriver = trpc.drivers.archive.useMutation({
    onSuccess: () => { toast.success("Driver archived"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const bulkImport = trpc.drivers.bulkImport.useMutation({
    onSuccess: (data) => { setImportResult(data); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
    status: "active" as DriverStatus,
    notes: "",
  });

  const filtered = drivers.filter((d) =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone ?? "").includes(search) ||
    (d.licenseNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const getAssignedTruck = (driverId: number) =>
    trucks.find((t) => t.assignedDriverId === driverId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setParsedRows(parseCsv(text));
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const resetImport = () => {
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;
    bulkImport.mutate({
      rows: validRows.map((r) => ({
        name: r.name,
        licenseNumber: r.licenseNumber,
        licenseExpiry: r.licenseExpiry,
        phone: r.phone,
        email: r.email,
        address: r.address,
        status: r.status,
        notes: r.notes,
      })),
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
          <p className="text-muted-foreground text-sm mt-1">{drivers.length} registered drivers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetImport(); setShowImportDialog(true); }} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", count: drivers.filter((d) => d.status === "active").length, color: "text-green-600" },
          { label: "On Leave", count: drivers.filter((d) => d.status === "on_leave").length, color: "text-yellow-600" },
          { label: "Inactive", count: drivers.filter((d) => d.status === "inactive").length, color: "text-gray-500" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, license number..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">No drivers found</p>
              <p className="text-sm mt-1">Add a driver manually or import from CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">License No.</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">License Expiry</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned Truck</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((driver) => {
                    const truck = getAssignedTruck(driver.id);
                    return (
                      <tr key={driver.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-medium">{driver.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{driver.phone ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{driver.licenseNumber ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {driver.licenseExpiry instanceof Date
                            ? driver.licenseExpiry.toLocaleDateString()
                            : String(driver.licenseExpiry ?? "—")}
                        </td>
                        <td className="px-4 py-3">
                          {truck
                            ? <span className="text-primary font-medium">{truck.truckCode}</span>
                            : <span className="text-muted-foreground">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={driver.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditDriver(driver)} className="h-7 w-7 p-0">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Archive ${driver.name}?`)) archiveDriver.mutate({ id: driver.id });
                              }}
                            >
                              Archive
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

      {/* ─── Add Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createDriver.mutate(form as any);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>License Number</Label><Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>License Expiry</Label><Input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DriverStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createDriver.isPending}>{createDriver.isPending ? "Adding..." : "Add Driver"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ──────────────────────────────────────────────────────── */}
      {editDriver && (
        <Dialog open={!!editDriver} onOpenChange={() => setEditDriver(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Driver</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDriver.mutate({
                  id: editDriver.id,
                  name: editDriver.name,
                  phone: editDriver.phone,
                  licenseNumber: editDriver.licenseNumber,
                  licenseExpiry: editDriver.licenseExpiry instanceof Date
                    ? editDriver.licenseExpiry.toISOString().split("T")[0]
                    : editDriver.licenseExpiry,
                  status: editDriver.status,
                  notes: editDriver.notes,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5"><Label>Name *</Label><Input value={editDriver.name} onChange={(e) => setEditDriver({ ...editDriver, name: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={editDriver.phone ?? ""} onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>License Number</Label><Input value={editDriver.licenseNumber ?? ""} onChange={(e) => setEditDriver({ ...editDriver, licenseNumber: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>License Expiry</Label><Input type="date" value={editDriver.licenseExpiry instanceof Date ? editDriver.licenseExpiry.toISOString().split("T")[0] : editDriver.licenseExpiry ?? ""} onChange={(e) => setEditDriver({ ...editDriver, licenseExpiry: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editDriver.status} onValueChange={(v) => setEditDriver({ ...editDriver, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={editDriver.notes ?? ""} onChange={(e) => setEditDriver({ ...editDriver, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditDriver(null)}>Cancel</Button>
                <Button type="submit" disabled={updateDriver.isPending}>{updateDriver.isPending ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── CSV Import Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={showImportDialog}
        onOpenChange={(open) => { setShowImportDialog(open); if (!open) resetImport(); }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Bulk Import Drivers from CSV
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Upload */}
          {parsedRows.length === 0 && !importResult && (
            <div className="space-y-5">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Upload a CSV file with your driver data</p>
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
                <p className="text-sm font-medium">CSV columns:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span><span className="font-semibold text-foreground">name</span> — required</span>
                  <span>licenseNumber — optional</span>
                  <span>licenseExpiry — optional (YYYY-MM-DD)</span>
                  <span>phone — optional</span>
                  <span>email — optional</span>
                  <span>address — optional</span>
                  <span>status — active / inactive / on_leave</span>
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
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">License No.</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">License Expiry</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Valid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedRows.map((r) => (
                      <tr key={r.rowNum} className={r.errors.length > 0 ? "bg-red-50" : "hover:bg-muted/20"}>
                        <td className="px-3 py-2 text-muted-foreground">{r.rowNum}</td>
                        <td className="px-3 py-2 font-medium">{r.name || "—"}</td>
                        <td className="px-3 py-2 font-mono">{r.licenseNumber || "—"}</td>
                        <td className="px-3 py-2">{r.licenseExpiry || "—"}</td>
                        <td className="px-3 py-2">{r.phone || "—"}</td>
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
                  {bulkImport.isPending
                    ? "Importing..."
                    : `Import ${validRows.length} Driver${validRows.length !== 1 ? "s" : ""}`}
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
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Result</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importResult.results.map((r) => (
                      <tr key={r.row} className={r.status === "skipped" ? "bg-yellow-50" : ""}>
                        <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
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
