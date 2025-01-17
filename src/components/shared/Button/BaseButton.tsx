import { useMemo } from "react";
import { Button as NextUIButton, ButtonProps } from "@nextui-org/react";

export interface BaseButtonProps extends ButtonProps {
  isLoading?: boolean;
  validationState?: {
    isValid: boolean;
    requiredFields: string[];
  };
  loadingText?: string;
  defaultText: string;
}

export function BaseButton({
  isLoading,
  disabled,
  validationState,
  loadingText = "Loading...",
  defaultText,
  className = "",
  ...props
}: BaseButtonProps) {
  const buttonState = useMemo(() => {
    if (isLoading) return { disabled: true, text: loadingText };
    if (!validationState) return { disabled: disabled, text: defaultText };

    const { isValid, requiredFields } = validationState;

    if (requiredFields.length > 0) {
      return {
        disabled: true,
        text: `Enter ${requiredFields.join(" & ")}`,
      };
    }

    if (!isValid) {
      return { disabled: true, text: "Invalid Input" };
    }

    return { disabled: disabled, text: defaultText };
  }, [isLoading, validationState, disabled, loadingText, defaultText]);

  const isDisabled = buttonState.disabled;

  return (
    <NextUIButton
      {...props}
      disabled={isDisabled}
      className={`${className} relative transition-opacity ${
        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
      }`}
      data-loading={isLoading}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">{loadingText}</span>
        </div>
      ) : null}
      <span
        className={`${isLoading ? "invisible" : ""} ${
          isDisabled ? "pointer-events-none" : ""
        }`}
      >
        {buttonState.text}
      </span>
    </NextUIButton>
  );
}
