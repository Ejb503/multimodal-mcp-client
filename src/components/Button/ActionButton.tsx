import React from "react";
import { Button, ButtonProps } from "@nextui-org/react";
import { Icon } from "@iconify/react";

interface ActionButtonProps extends Omit<ButtonProps, "children"> {
  icon?: string;
  label?: string;
  isIconOnly?: boolean;
}

/**
 * ActionButton component that provides consistent styling for action buttons
 */
export function ActionButton({
  icon,
  label,
  isIconOnly = false,
  className = "",
  ...props
}: ActionButtonProps) {
  if (isIconOnly) {
    return (
      <Button
        isIconOnly
        className={`min-w-unit-8 w-unit-8 h-unit-8 ${className}`}
        {...props}
      >
        {icon && <Icon icon={icon} className="text-lg" />}
      </Button>
    );
  }

  return (
    <Button
      className={className}
      startContent={icon && <Icon icon={icon} className="text-lg" />}
      {...props}
    >
      {label}
    </Button>
  );
}
