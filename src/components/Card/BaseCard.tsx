import { Card } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { StatusCard } from "./StatusCard";
import { Spinner } from "@nextui-org/react";

interface BaseCardProps {
  icon?: string;
  iconClassName?: string;
  iconTestId?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  emptyMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * BaseCard component that provides consistent card layout with loading, empty, and error states
 */
export function BaseCard({
  icon,
  iconClassName = "text-primary",
  iconTestId,
  title,
  subtitle,
  headerAction,
  isLoading = false,
  isEmpty = false,
  error = null,
  emptyMessage = "No data available",
  className = "",
  children,
}: BaseCardProps) {
  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <div className="h-[200px] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <StatusCard
        status="danger"
        title="Error"
        description={error.message}
        icon="solar:shield-warning-bold-duotone"
        className={className}
      />
    );
  }

  if (isEmpty) {
    return (
      <StatusCard
        status="warning"
        title="No Data"
        description={emptyMessage}
        icon="solar:server-square-line-duotone"
        className={className}
      />
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-start justify-between p-4 border-b border-divider">
          <div className="flex items-center gap-2">
            {icon && (
              <div
                className={`p-2 rounded-medium bg-default-100 ${iconClassName}`}
              >
                <Icon
                  icon={icon}
                  className="text-xl"
                  data-testid={iconTestId}
                />
              </div>
            )}
            <div>
              {title && <h3 className="text-lg ">{title}</h3>}
              {subtitle && (
                <p className="text-sm text-default-500">{subtitle}</p>
              )}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </Card>
  );
}
