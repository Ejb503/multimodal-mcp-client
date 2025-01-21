import { Chip, Card } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { CollapsibleSection } from "@/components/Layout/CollapsibleSection";

interface ServerDetailsProps {
  command: string;
  args: string[];
  env: string[];
  additionalInfo?: {
    github_link?: string;
    npm_link?: string;
    content?: string;
    title?: string;
    description?: string;
    environment_variables?: string[];
  };
  className?: string;
}

/**
 * ServerDetails displays detailed server information in a grid layout within a collapsible section
 */
export function ServerDetails({
  command,
  args,
  env,
  additionalInfo,
  className = "",
}: ServerDetailsProps) {
  const cards = [
    {
      title: "Server Information",
      icon: "solar:info-circle-bold-duotone",
      iconClassName: "text-primary",
      content: (
        <div className="space-y-3">
          {additionalInfo?.title && (
            <div>
              <h5 className="text-sm font-medium">Title</h5>
              <p className="text-sm text-default-600">{additionalInfo.title}</p>
            </div>
          )}
          <div>
            <h5 className="text-sm font-medium">Command</h5>
            <p className="text-sm text-default-600">{command}</p>
          </div>
          {args.length > 0 && (
            <div>
              <h5 className="text-sm font-medium">Arguments</h5>
              <p className="text-sm text-default-600">{args.join(" ")}</p>
            </div>
          )}
          {additionalInfo?.description && (
            <div>
              <h5 className="text-sm font-medium">Description</h5>
              <p className="text-sm text-default-600 whitespace-pre-wrap">
                {additionalInfo.description}
              </p>
            </div>
          )}
          {additionalInfo?.content && (
            <div>
              <h5 className="text-sm font-medium">Content</h5>
              <p className="text-sm text-default-600 whitespace-pre-wrap line-clamp-4">
                {additionalInfo.content}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            {additionalInfo?.github_link && (
              <a
                href={additionalInfo.github_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline inline-flex items-center gap-1"
              >
                <Icon
                  icon="solar:github-circle-bold-duotone"
                  className="text-lg"
                />
                GitHub
              </a>
            )}
            {additionalInfo?.npm_link && (
              <a
                href={additionalInfo.npm_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline inline-flex items-center gap-1"
              >
                <Icon icon="solar:box-bold-duotone" className="text-lg" />
                NPM
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Environment",
      icon: "solar:key-bold-duotone",
      iconClassName: "text-warning",
      content: (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Required Variables</h5>
          <div className="flex flex-wrap gap-2">
            {env.map((envVar) => (
              <Chip key={envVar} size="sm" variant="dot" color="warning">
                {envVar}
              </Chip>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={className}>
      <CollapsibleSection
        title="Server Details"
        titleContent={
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:server-bold-duotone"
              className="text-xl text-primary"
            />
            <span>Server Details</span>
          </div>
        }
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {cards.map((card) => (
            <Card key={card.title} className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon
                  icon={card.icon}
                  className={`text-xl ${card.iconClassName}`}
                />
                <h3 className="text-lg font-semibold">{card.title}</h3>
              </div>
              {card.content}
            </Card>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
