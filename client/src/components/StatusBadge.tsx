import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "active" | "inactive" | "under_maintenance"
  | "pending" | "in_progress" | "completed"
  | "stock_in" | "stock_out" | "maintenance_usage" | "adjustment"
  | "admin" | "user";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100" },
  under_maintenance: { label: "Under Maintenance", className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100" },
  pending: { label: "Pending", className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100" },
  in_progress: { label: "In Progress", className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" },
  stock_in: { label: "Stock In", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" },
  stock_out: { label: "Stock Out", className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100" },
  maintenance_usage: { label: "Maintenance Use", className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100" },
  adjustment: { label: "Adjustment", className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100" },
  admin: { label: "Admin", className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100" },
  user: { label: "Staff", className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as StatusType] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function StockBadge({ quantity, minimum }: { quantity: number; minimum: number }) {
  if (quantity === 0) {
    return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">Out of Stock</Badge>;
  }
  if (quantity <= minimum) {
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Low Stock</Badge>;
  }
  return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">In Stock</Badge>;
}
