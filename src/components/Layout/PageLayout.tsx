import React from "react";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between bg-default-50 p-4 rounded-2xl border border-default-200 ${className}`}
    >
      <div>
        <div className="flex items-center gap-3 mb-2">
          {icon}
          {typeof title === "string" ? (
            <h1 className="text-2xl ">{title}</h1>
          ) : (
            title
          )}
        </div>
        {subtitle &&
          (typeof subtitle === "string" ? (
            <p className="text-default-500">{subtitle}</p>
          ) : (
            subtitle
          ))}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export interface PageSectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageSection({
  title,
  subtitle,
  action,
  children,
  className = "",
  contentClassName = "",
}: PageSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title &&
              (typeof title === "string" ? (
                <h2 className="text-xl ">{title}</h2>
              ) : (
                title
              ))}
            {subtitle &&
              (typeof subtitle === "string" ? (
                <p className="text-sm text-default-500">{subtitle}</p>
              ) : (
                subtitle
              ))}
          </div>
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export interface PageLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  header,
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${className}`}>
      {header}
      {children}
    </div>
  );
}
