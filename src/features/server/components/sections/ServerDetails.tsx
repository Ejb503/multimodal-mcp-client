import { Chip, Card } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { ExternalLink } from "@/components/Link/ExternalLink";
import { EnvVarChip } from "@/components/Chip/EnvVarChip";

interface ServerDetailsProps {
  title: string;
  description: string;
  environment_variables?: string[];
  github_link?: string;
  npm_link?: string;
  metadata?: {
    created?: string;
    updated?: string;
    version?: number;
    status?: string;
  };
  className?: string;
}

interface CardType {
  title: string;
  icon: string;
  iconClassName: string;
  content: JSX.Element;
}

/**
 * ServerDetails displays detailed MCP module information in a grid layout within a collapsible section
 */
export function ServerDetails({
  title,
  description,
  environment_variables = [],
  github_link,
  npm_link,
  metadata,
  className = "",
}: ServerDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const cards: CardType[] = [
    {
      title: "Module Information",
      icon: "solar:programming-line-duotone",
      iconClassName: "text-primary",
      content: (
        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-medium text-default-700">Title</h5>
            <p className="text-sm text-default-600">{title}</p>
          </div>
          <div>
            <h5 className="text-sm font-medium text-default-700">
              Description
            </h5>
            <p className="text-sm text-default-600 whitespace-pre-wrap">
              {description}
            </p>
          </div>
          <div className="flex gap-2">
            {github_link && <ExternalLink href={github_link} type="github" />}
            {npm_link && <ExternalLink href={npm_link} type="npm" />}
          </div>
        </div>
      ),
    },
    environment_variables.length > 0 && {
      title: "Environment",
      icon: "solar:key-bold-duotone",
      iconClassName: "text-warning",
      content: (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-default-700">
            Required Variables
          </h5>
          <div className="flex flex-wrap gap-2">
            {environment_variables.map((envVar: string) => (
              <EnvVarChip key={envVar} name={envVar} />
            ))}
          </div>
        </div>
      ),
    },
    metadata && {
      title: "Metadata",
      icon: "solar:document-bold-duotone",
      iconClassName: "text-success",
      content: (
        <div className="space-y-3">
          {metadata.status && (
            <div>
              <h5 className="text-sm font-medium text-default-700">Status</h5>
              <Chip
                size="sm"
                variant="flat"
                color={metadata.status === "published" ? "success" : "default"}
                startContent={
                  <Icon
                    icon={
                      metadata.status === "published"
                        ? "solar:check-circle-bold-duotone"
                        : "solar:clock-circle-bold-duotone"
                    }
                    className="text-sm"
                  />
                }
              >
                {metadata.status}
              </Chip>
            </div>
          )}
          {metadata.version && (
            <div>
              <h5 className="text-sm font-medium text-default-700">Version</h5>
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                startContent={
                  <Icon
                    icon="solar:tag-horizontal-bold-duotone"
                    className="text-sm"
                  />
                }
              >
                v{metadata.version}
              </Chip>
            </div>
          )}
          {metadata.updated && (
            <div>
              <h5 className="text-sm font-medium text-default-700">
                Last Updated
              </h5>
              <p className="text-sm text-default-600 flex items-center gap-1">
                <Icon
                  icon="solar:calendar-bold-duotone"
                  className="text-default-500"
                />
                {formatDate(metadata.updated)}
              </p>
            </div>
          )}
        </div>
      ),
    },
  ].filter((card): card is CardType => Boolean(card));

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-default-50">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="p-4 bg-content1 border-1 border-default-200 shadow-small hover:border-primary transition-colors"
            isPressable
          >
            <div className="flex items-center gap-2 mb-4 border-b border-divider pb-2">
              <div
                className={`p-2 rounded-medium bg-default-100 ${card.iconClassName}`}
              >
                <Icon icon={card.icon} className="text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-left">{card.title}</h3>
            </div>
            <div className="text-left">{card.content}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
