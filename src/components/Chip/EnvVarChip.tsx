import React from "react";
import { Chip, Tooltip } from "@nextui-org/react";
import { Icon } from "@iconify/react";

interface EnvVarChipProps {
  name: string;
  className?: string;
  tooltipContent?: string;
  variant?:
    | "flat"
    | "solid"
    | "dot"
    | "bordered"
    | "light"
    | "shadow"
    | "faded";
  size?: "sm" | "md" | "lg";
}

/**
 * EnvVarChip displays environment variables with consistent styling and tooltips
 */
export function EnvVarChip({
  name,
  className = "",
  tooltipContent = "Required environment variable",
  variant = "flat",
  size = "sm",
}: EnvVarChipProps) {
  return (
    <Tooltip content={tooltipContent} placement="bottom">
      <Chip
        size={size}
        variant={variant}
        className={className}
        startContent={
          <Icon
            icon="solar:key-minimalistic-bold-duotone"
            className="text-warning"
          />
        }
      >
        {name}
      </Chip>
    </Tooltip>
  );
}
