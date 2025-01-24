import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  titleContent?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  titleContent,
  children,
  defaultExpanded = true,
  isExpanded: controlledIsExpanded,
  onExpandedChange,
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);

  const isExpanded = controlledIsExpanded ?? internalIsExpanded;
  const setIsExpanded = (expanded: boolean) => {
    setInternalIsExpanded(expanded);
    onExpandedChange?.(expanded);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-2 text-left bg-default-100 hover:bg-default-200 rounded-lg"
        aria-expanded={isExpanded}
      >
        {titleContent || <span className="font-medium">{title}</span>}
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      <div
        className={`mt-2 ${isExpanded ? "block" : "hidden"}`}
        aria-hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;
