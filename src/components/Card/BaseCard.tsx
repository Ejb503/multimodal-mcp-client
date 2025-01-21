import { Card } from "@nextui-org/react";
import { Icon } from "@iconify/react";

export interface BaseCardProps {
  icon?: string;
  iconClassName?: string;
  iconTestId?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  "data-testid"?: string;
}

/**
 * BaseCard provides a consistent foundation for all card-based UIs
 * @component
 * @example
 * ```tsx
 * <BaseCard
 *   icon="icon-name"
 *   iconClassName="text-primary"
 *   title="Card Title"
 *   subtitle="Optional subtitle"
 *   headerAction={<Button>Action</Button>}
 * >
 *   Card content
 * </BaseCard>
 * ```
 */
export function BaseCard({
  icon,
  iconClassName = "text-default-400",
  iconTestId,
  title,
  subtitle,
  headerAction,
  children,
  className = "",
  isLoading = false,
  isEmpty = false,
  "data-testid": testId,
}: BaseCardProps) {
  if (isLoading) {
    return (
      <Card
        className={`bg-default-50 shadow-xl border border-default-200 ${className}`}
        data-testid={testId}
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="h-7 w-3/4 bg-default-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-default-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-4 w-full bg-default-100 rounded animate-pulse" />
          <div className="h-9 w-full bg-default-200 rounded-lg animate-pulse mt-1" />
        </div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card
        className={`bg-default-50 shadow-xl border border-default-200 ${className}`}
        data-testid={testId}
      >
        <div className="flex flex-col items-center justify-center p-6 text-default-400">
          <Icon
            icon="solar:box-minimalistic-broken"
            className="h-12 w-12 mb-2"
          />
          <p>No content available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-default-50 shadow-xl border border-default-200 ${className}`}
      data-testid={testId}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <Icon
                icon={icon}
                className={`w-8 h-8 ${iconClassName}`}
                data-testid={iconTestId}
              />
            )}
            <div>
              <h3 className="text-xl">{title}</h3>
              {subtitle && <p className="text-default-500 mt-1">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
        {children}
      </div>
    </Card>
  );
}
