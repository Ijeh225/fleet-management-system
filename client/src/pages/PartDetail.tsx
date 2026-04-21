import { StockBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Box, PackageMinus, PackagePlus } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const partId = parseInt(id ?? "0");

  const { data: part } = trpc.parts.get.useQuery({ id: partId });
  const { data: balance } = trpc.parts.balance.useQuery({ partId });
  const { data: receipts = [] } = trpc.inventory.list.useQuery({ partId });
  const { data: issues = [] } = trpc.stockIssues.list.useQuery({ partId });
  const { data: categories = [] } = trpc.categories.list.useQuery();

  if (!part) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/parts")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Parts
        </Button>
        <div className="flex items-center justify-center py-20 text-muted-foreground"><p>Part not found</p></div>
      </div>
    );
  }

  const category = categories.find((c) => c.id === part.categoryId);
  const qty = balance?.balance ?? 0;
  const min = part.minimumStockLevel ?? 5;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/parts")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{part.name}</h1>
            <StockBadge quantity={qty} minimum={min} />
          </div>
          <p className="text-muted-foreground text-sm">{part.partNumber ?? "No part number"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Part Details */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Box className="h-4 w-4 text-primary" /> Part Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Part Name", part.name],
                  ["Part Number", part.partNumber ?? "—"],
                  ["Category", category?.name ?? "—"],
                  ["Compatible Model", part.compatibleModel ?? "—"],
                  ["Unit Type", part.unitType ?? "piece"],
                  ["Unit Cost", `₦${parseFloat(String(part.unitCost ?? 0)).toFixed(2)}`],
                  ["Min Stock Level", part.minimumStockLevel],
                  ["Reorder Level", part.reorderLevel],
                  ["Storage Location", part.storageLocation ?? "—"],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="font-medium mt-0.5">{String(value)}</p>
                  </div>
                ))}
              </div>
              {part.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="text-sm mt-1">{part.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Receipts */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PackagePlus className="h-4 w-4 text-emerald-600" /> Stock Receipts (Received)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {receipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No stock receipts yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setLocation("/inventory")}>Go to Inventory</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Qty Received</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Unit Cost</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Reference</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {receipts.map((r: any) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.receiptDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2 font-semibold text-emerald-700">+{r.quantity}</td>
                          <td className="px-4 py-2">{r.unitCost ? `₦${parseFloat(r.unitCost).toFixed(2)}` : "—"}</td>
                          <td className="px-4 py-2 text-xs">{r.purchaseReference ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Issues */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageMinus className="h-4 w-4 text-red-600" /> Stock Issues (Issued to Trucks)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No stock issues yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setLocation("/stock-removal")}>Go to Stock Removal</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Qty Issued</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Truck</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Driver</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {issues.map((iss: any) => (
                        <tr key={iss.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(iss.issueDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2 font-semibold text-red-700">-{iss.quantity}</td>
                          <td className="px-4 py-2 text-xs">{iss.truck?.plateNumber ?? iss.truck?.truckCode ?? "—"}</td>
                          <td className="px-4 py-2 text-xs">{iss.driver?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{iss.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock summary card */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${qty === 0 ? "text-red-600" : qty <= min ? "text-yellow-600" : "text-green-600"}`}>
                  {qty}
                </div>
                <p className="text-muted-foreground text-sm">Units in Stock</p>
                <div className="mt-4">
                  <StockBadge quantity={qty} minimum={min} />
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Received</span>
                  <span className="font-medium text-emerald-700">+{balance?.totalReceived ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Issued</span>
                  <span className="font-medium text-red-700">-{balance?.totalIssued ?? 0}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-bold">{balance?.balance ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Level</span>
                  <span className="font-medium">{min}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reorder Level</span>
                  <span className="font-medium">{part.reorderLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Cost</span>
                  <span className="font-medium">₦{parseFloat(String(part.unitCost ?? 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">Est. Value</span>
                  <span className="font-bold">₦{(qty * parseFloat(String(part.unitCost ?? 0))).toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button className="w-full" variant="outline" onClick={() => setLocation("/inventory")}>
                  <PackagePlus className="h-4 w-4 mr-2" /> Receive Stock
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setLocation("/stock-removal")}>
                  <PackageMinus className="h-4 w-4 mr-2" /> Issue Stock
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
