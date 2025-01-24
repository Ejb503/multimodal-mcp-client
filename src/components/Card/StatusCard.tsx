import { Card } from "@nextui-org/react";
import { Icon } from "@iconify/react";

export type StatusType = "success" | "warning" | "danger" | "default";

export interface StatusCardProps {
  status?: StatusType;
  title: string;
  description?: string;
  icon?: string;
  iconClassName?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { bgColor: string; textColor: string }> =
  {
    success: { bgColor: "bg-success-50", textColor: "text-success" },
    warning: { bgColor: "bg-warning-50", textColor: "text-warning" },
    danger: { bgColor: "bg-danger-50", textColor: "text-danger" },
    default: { bgColor: "bg-default-50", textColor: "text-default-600" },
  };

/**
 * StatusCard displays status information with consistent styling
 * @component
 * @example
 * ```tsx
 * <StatusCard
 *   status="success"
 *   title="Operation Successful"
 *   description="The operation completed successfully"
 *   icon="solar:check-circle-bold-duotone"
 * />
 * ```
 */
export function StatusCard({
  status = "default",
  title,
  description,
  icon,
  iconClassName,
  className = "",
}: StatusCardProps) {
  const { bgColor, textColor } = statusConfig[status];

  return (
    <Card className={`p-6 ${bgColor} ${className}`}>
      <div className={`flex items-center gap-3 ${textColor}`}>
        {icon && (
          <Icon
            icon={icon}
            className={`w-8 h-8 ${iconClassName || textColor}`}
          />
        )}
        <div>
          <h3 className="text-xl">{title}</h3>
          {description && <p className="text-sm mt-1">{description}</p>}
        </div>
      </div>
    </Card>
  );
}
