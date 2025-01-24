import { Button, Chip } from "@nextui-org/react";
import { BaseCard } from "./BaseCard";

interface UserInfoCardProps {
  userId: string;
  email: string;
  // apiKey: string;
  roles: string[];
  onCopyApiKey: () => void;
  className?: string;
}

/**
 * UserInfoCard displays user information in a standardized card layout
 * @component
 * @example
 * ```tsx
 * <UserInfoCard
 *   userId="user123"
 *   email="user@example.com"
 *   apiKey="api-key-123"
 *   roles={["admin", "user"]}
 *   onCopyApiKey={() => handleCopy()}
 * />
 * ```
 */
export function UserInfoCard({
  userId,
  email,
  // apiKey,
  roles,
  onCopyApiKey,
  className = "",
}: UserInfoCardProps) {
  const details = [
    {
      label: "User ID",
      value: userId,
      type: "monospace",
    },
    {
      label: "Email",
      value: email,
      type: "monospace",
    },
    // {
    //   label: "API Key",
    //   value: (
    //     <div className="flex items-center gap-2">
    //       <span className="font-mono">{apiKey.slice(0, 8)}...</span>
    //       <Button size="sm" variant="flat" onPress={onCopyApiKey}>
    //         Copy
    //       </Button>
    //     </div>
    //   ),
    // },
    {
      label: "Roles",
      value: (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Chip key={role} size="sm" variant="dot">
              {role}
            </Chip>
          ))}
        </div>
      ),
    },
  ];

  return (
    <BaseCard
      icon="solar:user-circle-bold-duotone"
      iconClassName="text-primary"
      title="User Information"
      className={className}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.map(({ label, value, type }) => (
          <div key={label}>
            <p className="text-sm text-default-500">{label}</p>
            {typeof value === "string" ? (
              <p
                className={
                  type === "monospace" ? "font-mono text-sm" : "text-sm"
                }
              >
                {value}
              </p>
            ) : (
              value
            )}
          </div>
        ))}
      </div>
    </BaseCard>
  );
}
