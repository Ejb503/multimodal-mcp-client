import React from "react";
import { Link } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { Tooltip } from "@nextui-org/react";

interface ExternalLinkProps {
  href: string;
  type: "github" | "npm";
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const LINK_CONFIGS = {
  github: {
    label: "GitHub",
    icon: "solar:github-circle-bold-duotone",
    tooltip: "View on GitHub",
  },
  npm: {
    label: "NPM",
    icon: "solar:box-bold-duotone",
    tooltip: "View on NPM",
  },
};

/**
 * ExternalLink component that provides consistent styling for external links (GitHub, NPM)
 */
export function ExternalLink({
  href,
  type,
  className = "",
  showIcon = true,
  showLabel = true,
  size = "sm",
}: ExternalLinkProps) {
  const config = LINK_CONFIGS[type];

  const content = (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size={size}
      className={`text-primary hover:text-primary-600 transition-colors inline-flex items-center gap-1 p-2 rounded-medium hover:bg-primary/10 ${className}`}
    >
      {showIcon && <Icon icon={config.icon} className="text-lg" />}
      {showLabel && <span className={`text-${size}`}>{config.label}</span>}
    </Link>
  );

  return <Tooltip content={config.tooltip}>{content}</Tooltip>;
}
