import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Package,
  Printer,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ReorderItem = {
  partId: number;
  partName: string;
  partNumber?: string | null;
  unitCost?: string | null;
  unitType?: string | null;
  currentStock: number;
  minimumStockLevel?: number | null;
  reorderLevel?: number | null;
  suggestedOrderQty: number;
  supplierId?: number | null;
  supplierName?: string | null;
};

function formatCurrency(val: string | number | null | undefined) {
  const n = parseFloat(String(val ?? "0"));
  return isNaN(n) ? "—" : `₦${n.toFixed(2)}`;
}

function generatePOHtml(items: ReorderItem[], supplierName: string | null, notes: string, orderNumber: string) {
  const totalAmount = items.reduce((sum, i) => {
    return sum + (parseFloat(i.unitCost ?? "0") * i.suggestedOrderQty);
  }, 0);
  const rows = items.map((item, idx) => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;">${idx + 1}</td>
      <td style="padding:8px 12px;">${item.partName}</td>
      <td style="padding:8px 12px;font-family:monospace;font-size:12px;">${item.partNumber ?? "—"}</td>
      <td style="padding:8px 12px;text-align:center;">${item.unitType ?? "piece"}</td>
      <td style="padding:8px 12px;text-align:center;">${item.suggestedOrderQty}</td>
      <td style="padding:8px 12px;text-align:right;">${formatCurrency(item.unitCost)}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;">${formatCurrency(parseFloat(item.unitCost ?? "0") * item.suggestedOrderQty)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Purchase Order ${orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .company { font-size: 22px; font-weight: 700; color: #1e3a5f; }
    .po-title { font-size: 28px; font-weight: 700; color: #1e3a5f; text-align: right; }
    .po-number { font-size: 14px; color: #6b7280; text-align: right; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .meta-box h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin: 0 0 8px; letter-spacing: 0.05em; }
    .meta-box p { margin: 2px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1e3a5f; color: white; }
    thead th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .total-row { background: #1e3a5f !important; color: white; font-weight: 700; }
    .total-row td { padding: 12px; }
    .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">FleetManager Pro</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">Fleet Inventory & Maintenance System</div>
    </div>
    <div>
      <div class="po-title">PURCHASE ORDER</div>
      <div class="po-number">${orderNumber}</div>
      <div class="po-number">Date: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <h3>Supplier</h3>
      <p style="font-weight:600;font-size:16px;">${supplierName ?? "No Supplier Specified"}</p>
    </div>
    <div class="meta-box">
      <h3>Order Details</h3>
      <p><strong>Order No:</strong> ${orderNumber}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Status:</strong> Draft</p>
    </div>
  </div>

  ${notes ? `<div class="notes"><strong>Notes:</strong> ${notes}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Part Name</th>
        <th>Part Number</th>
        <th>Unit</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Cost</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="6" style="text-align:right;">TOTAL AMOUNT</td>
        <td style="text-align:right;">${formatCurrency(totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated by FleetManager Pro &bull; ${new Date().toLocaleString()} &bull; This is a system-generated purchase order.
  </div>
</body>
</html>`;
}

export default function PartsReorder() {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [poNotes, setPoNotes] = useState("");
  const [createdPO, setCreatedPO] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"reorder" | "orders">("reorder");

  const { data: lowStockParts = [], isLoading, refetch } = trpc.purchaseOrders.lowStockParts.useQuery();
  const { data: purchaseOrdersList = [], refetch: refetchOrders } = trpc.purchaseOrders.list.useQuery();

  const createPO = trpc.purchaseOrders.create.useMutation({
    onSuccess: (data) => {
      setCreatedPO(data);
      refetchOrders();
      toast.success("Purchase order created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetchOrders(); },
    onError: (e) => toast.error(e.message),
  });

  // Group low stock parts by supplier
  const grouped = lowStockParts.reduce((acc, item) => {
    const key = item.supplierId ? String(item.supplierId) : "no_supplier";
    const label = item.supplierName ?? "No Supplier";
    if (!acc[key]) acc[key] = { supplierId: item.supplierId ?? null, supplierName: label, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { supplierId: number | null; supplierName: string; items: ReorderItem[] }>);

  const selectedList = lowStockParts.filter((p) => selectedItems.has(p.partId));

  const toggleItem = (partId: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  };

  const selectAll = () => setSelectedItems(new Set(lowStockParts.map((p) => p.partId)));
  const clearAll = () => setSelectedItems(new Set());

  const getQty = (item: ReorderItem) => quantities[item.partId] ?? item.suggestedOrderQty;

  const handlePrint = (items: ReorderItem[], supplierName: string | null, notes: string, orderNumber: string) => {
    const html = generatePOHtml(items, supplierName, notes, orderNumber);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const handleCreatePO = () => {
    if (selectedList.length === 0) return;
    // Group by supplier — create one PO per supplier group
    const bySupplier = selectedList.reduce((acc, item) => {
      const key = item.supplierId ? String(item.supplierId) : "none";
      if (!acc[key]) acc[key] = { supplierId: item.supplierId ?? null, supplierName: item.supplierName ?? null, items: [] };
      acc[key].items.push(item);
      return acc;
    }, {} as Record<string, { supplierId: number | null; supplierName: string | null; items: ReorderItem[] }>);

    const firstGroup = Object.values(bySupplier)[0];
    createPO.mutate({
      supplierId: firstGroup.supplierId ?? undefined,
      items: firstGroup.items.map((i) => ({
        partId: i.partId,
        partName: i.partName,
        partNumber: i.partNumber ?? undefined,
        quantity: getQty(i),
        unitCost: i.unitCost ?? undefined,
        totalCost: parseFloat(i.unitCost ?? "0") * getQty(i),
      })),
      notes: poNotes,
    });
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parts Reorder</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Auto-detected low stock parts and purchase order management
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); refetchOrders(); }} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg w-fit">
        {[
          { id: "reorder", label: "Low Stock Parts", icon: AlertTriangle },
          { id: "orders", label: "Purchase Orders", icon: ClipboardList },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === "reorder" && lowStockParts.length > 0 && (
              <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {lowStockParts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Low Stock Parts Tab ─────────────────────────────────────────────── */}
      {activeTab === "reorder" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" /> Scanning inventory...
            </div>
          ) : lowStockParts.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-3 text-green-500 opacity-60" />
                <p className="font-medium text-green-700">All parts are sufficiently stocked</p>
                <p className="text-sm mt-1">No parts are below their minimum stock level</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selection toolbar */}
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium text-orange-800">
                    {lowStockParts.length} part{lowStockParts.length !== 1 ? "s" : ""} below minimum stock level
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>Clear</Button>
                  {selectedItems.size > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setShowCreatePO(true)}
                      className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <FileText className="h-4 w-4" />
                      Create PO ({selectedItems.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Grouped by supplier */}
              {Object.values(grouped).map((group) => (
                <Card key={group.supplierName} className="border-0 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {group.supplierName}
                        <Badge variant="outline" className="text-xs">{group.items.length} parts</Badge>
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-xs"
                        onClick={() => {
                          const orderNumber = `PO-${Date.now()}`;
                          handlePrint(group.items, group.supplierName, "", orderNumber);
                        }}
                      >
                        <Printer className="h-3.5 w-3.5" /> Print PO
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/20">
                            <th className="w-10 px-4 py-2"></th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Part Name</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Part No.</th>
                            <th className="text-center px-4 py-2 font-medium text-muted-foreground">Current Stock</th>
                            <th className="text-center px-4 py-2 font-medium text-muted-foreground">Min Level</th>
                            <th className="text-center px-4 py-2 font-medium text-muted-foreground">Order Qty</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Unit Cost</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {group.items.map((item) => {
                            const qty = getQty(item);
                            const total = parseFloat(item.unitCost ?? "0") * qty;
                            return (
                              <tr
                                key={item.partId}
                                className={`hover:bg-muted/20 transition-colors ${selectedItems.has(item.partId) ? "bg-orange-50" : ""}`}
                              >
                                <td className="px-4 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.has(item.partId)}
                                    onChange={() => toggleItem(item.partId)}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                </td>
                                <td className="px-4 py-2.5 font-medium">{item.partName}</td>
                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.partNumber ?? "—"}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`font-bold ${item.currentStock <= 0 ? "text-red-600" : "text-orange-600"}`}>
                                    {item.currentStock}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center text-muted-foreground">{item.minimumStockLevel ?? 5}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={qty}
                                    onChange={(e) => setQuantities((prev) => ({ ...prev, [item.partId]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                    className="w-20 h-7 text-center text-sm mx-auto"
                                  />
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(item.unitCost)}</td>
                                <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ─── Purchase Orders Tab ─────────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {purchaseOrdersList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No purchase orders yet</p>
                <p className="text-sm mt-1">Create a purchase order from the Low Stock Parts tab</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Order No.</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created By</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchaseOrdersList.map((po) => {
                      const items: ReorderItem[] = JSON.parse(po.items || "[]");
                      return (
                        <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs font-medium">{po.orderNumber}</td>
                          <td className="px-4 py-3">{po.supplierName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{po.createdByName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {po.createdAt instanceof Date
                              ? po.createdAt.toLocaleDateString()
                              : new Date(po.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(po.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[po.status] ?? ""}`}>
                              {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => handlePrint(items, po.supplierName ?? null, po.notes ?? "", po.orderNumber)}
                              >
                                <Printer className="h-3 w-3" /> Print
                              </Button>
                              {po.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-blue-600"
                                  onClick={() => updateStatus.mutate({ id: po.id, status: "sent" })}
                                >
                                  Mark Sent
                                </Button>
                              )}
                              {po.status === "sent" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-green-600"
                                  onClick={() => updateStatus.mutate({ id: po.id, status: "received" })}
                                >
                                  Mark Received
                                </Button>
                              )}
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
      )}

      {/* ─── Create PO Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showCreatePO} onOpenChange={(open) => { setShowCreatePO(open); if (!open) setCreatedPO(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          {!createdPO ? (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm font-medium mb-3">{selectedList.length} selected part{selectedList.length !== 1 ? "s" : ""}:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedList.map((item) => (
                    <div key={item.partId} className="flex items-center justify-between text-sm">
                      <span>{item.partName}</span>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>Qty: <strong className="text-foreground">{getQty(item)}</strong></span>
                        <span>{formatCurrency(parseFloat(item.unitCost ?? "0") * getQty(item))}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedList.reduce((s, i) => s + parseFloat(i.unitCost ?? "0") * getQty(i), 0))}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea rows={3} placeholder="Add any notes for this purchase order..." value={poNotes} onChange={(e) => setPoNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreatePO(false)}>Cancel</Button>
                <Button onClick={handleCreatePO} disabled={createPO.isPending} className="gap-2">
                  <FileText className="h-4 w-4" />
                  {createPO.isPending ? "Creating..." : "Create Purchase Order"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold">Purchase Order Created!</p>
                <p className="text-muted-foreground text-sm mt-1">Order number: <span className="font-mono font-bold">{createdPO.orderNumber}</span></p>
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const items: ReorderItem[] = JSON.parse(createdPO.items || "[]");
                    handlePrint(items, null, createdPO.notes ?? "", createdPO.orderNumber);
                  }}
                >
                  <Printer className="h-4 w-4" /> Print PO
                </Button>
                <Button onClick={() => { setShowCreatePO(false); setCreatedPO(null); setSelectedItems(new Set()); setActiveTab("orders"); }}>
                  View All Orders
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
