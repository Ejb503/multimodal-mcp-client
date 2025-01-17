import { useState, ReactNode } from "react";
import { Input } from "@nextui-org/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description: ReactNode;
  placeholder?: string;
  isRequired?: boolean;
}

export function ApiKeyInput({
  value,
  onChange,
  label,
  description,
  placeholder = "Enter API key",
  isRequired = false,
}: ApiKeyInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <Input
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      description={description}
      placeholder={placeholder}
      labelPlacement="outside"
      isRequired={isRequired}
      type={isVisible ? "text" : "password"}
      variant="flat"
      classNames={{
        base: "max-w-full",
        label: "text-sm font-medium text-white",
        description: "text-xs text-gray-400",
        inputWrapper: [
          "border-1",
          "hover:border-blue-500 dark:hover:border-blue-400",
          "focus-within:!border-blue-500 dark:focus-within:!border-blue-400",
          "transition-colors",
          "rounded-lg",
          "!cursor-text",
          "h-12",
        ],
        input: [
          "text-base",
          "text-gray-900 dark:text-white",
          "placeholder:text-gray-500 dark:placeholder:text-gray-400",
        ],
      }}
      endContent={
        <button
          className="focus:outline-none"
          type="button"
          onClick={toggleVisibility}
        >
          {isVisible ? (
            <EyeOffIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          ) : (
            <EyeIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          )}
        </button>
      }
    />
  );
}
