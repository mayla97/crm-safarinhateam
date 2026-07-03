import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "blue" | "red" | "green" | "amber";
}

const iconColorMap = {
  blue: "bg-remax-blue-light text-remax-blue",
  red: "bg-remax-red-light text-remax-red",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "blue",
}: StatsCardProps) {
  const changeColors = {
    positive: "text-emerald-600",
    negative: "text-remax-red",
    neutral: "text-brand-muted",
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-brand-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-remax-blue-dark">{value}</p>
          {change && (
            <p className={cn("mt-1 text-xs font-medium", changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconColorMap[iconColor]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
