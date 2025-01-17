import { memo } from "react";
import { Select, SelectItem, Button } from "@nextui-org/react";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { ValidationError } from "../utils/schema-utils";
import { FormField } from "./FormField";
import { Icon } from "@iconify/react";

interface SchemaFieldProps {
  schema: JSONSchema7Definition;
  path: string[];
  value: unknown;
  error?: ValidationError;
  onChange: (path: string[], value: unknown) => void;
}

function SchemaFieldComponent({
  schema,
  path,
  value,
  error,
  onChange,
}: SchemaFieldProps) {
  if (typeof schema === "boolean") return null;

  // Handle oneOf schemas
  if (schema.oneOf) {
    // First, render the type selector
    const typeValue = (value as Record<string, unknown>)?.type as string;
    const typeOptions = schema.oneOf
      .map((subSchema) => {
        if (typeof subSchema === "boolean") return null;
        if (!subSchema.properties?.type) return null;
        const typeSchema = subSchema.properties.type as JSONSchema7;
        const typeValue = typeSchema.const || typeSchema.enum?.[0];
        if (!typeValue) return null;

        return {
          value: typeValue as string,
          description:
            subSchema.description || typeSchema.description || undefined,
          required: subSchema.required || [],
          properties: subSchema.properties,
        };
      })
      .filter(
        (
          type
        ): type is {
          value: string;
          description: string | undefined;
          required: string[];
          properties: Record<string, JSONSchema7Definition>;
        } => type !== null
      );

    const selectedOption = typeOptions.find((opt) => opt.value === typeValue);
    const fieldName = path[path.length - 1] || "Type";
    const label = schema.description || fieldName;

    return (
      <div className="space-y-4">
        <Select
          label={label}
          placeholder={`Select ${fieldName.toLowerCase()}`}
          selectedKeys={typeValue ? [typeValue] : []}
          onChange={(e) => {
            const selectedType = e.target.value;
            const option = typeOptions.find(
              (opt) => opt.value === selectedType
            );
            if (!option) return;

            // Initialize with required fields
            const newValue: Record<string, unknown> = {
              type: selectedType,
            };

            // Add required fields with default values based on their type
            option.required.forEach((field) => {
              if (field === "type") return;
              const fieldSchema = option.properties[field];
              if (typeof fieldSchema === "boolean") return;

              if (fieldSchema.type === "string") {
                newValue[field] = "";
              } else if (fieldSchema.type === "object") {
                newValue[field] = {};
              } else if (fieldSchema.type === "array") {
                newValue[field] = [];
              }
            });

            onChange(path, newValue);
          }}
          errorMessage={error?.message}
          isInvalid={!!error}
          className="mb-4"
        >
          {typeOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              description={option.description}
            >
              {option.value}
            </SelectItem>
          ))}
        </Select>

        {selectedOption && (
          <div className="pl-4 border-l-2 border-default-200">
            {Object.entries(selectedOption.properties)
              .filter(([key]) => key !== "type") // Skip the type field as it's already rendered
              .map(([key, propSchema]) => (
                <SchemaField
                  key={key}
                  schema={propSchema}
                  path={[...path, key]}
                  value={(value as Record<string, unknown>)?.[key]}
                  error={
                    error?.path.join(".") === [...path, key].join(".")
                      ? error
                      : undefined
                  }
                  onChange={onChange}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  // Handle pattern properties
  if (schema.patternProperties) {
    const patternEntries = Object.entries(schema.patternProperties);
    if (patternEntries.length === 1) {
      const [, propSchema] = patternEntries[0];
      const objValue = value as Record<string, unknown> | undefined;

      // Extract available property types from the schema
      const propertyTypes = (() => {
        if (typeof propSchema === "boolean") return [];
        if (!propSchema.oneOf) return [];

        return propSchema.oneOf
          .map((subSchema) => {
            if (typeof subSchema === "boolean") return null;
            if (!subSchema.properties?.type) return null;
            const typeSchema = subSchema.properties.type as JSONSchema7;
            return {
              value: typeSchema.const as string,
              description: subSchema.description || typeSchema.description,
              schema: subSchema,
            };
          })
          .filter(
            (
              type
            ): type is {
              value: string;
              description: string | undefined;
              schema: JSONSchema7;
            } => type !== null
          );
      })();

      return (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Properties</span>
              <Select
                label="Property Type"
                placeholder="Select type"
                size="sm"
                className="max-w-[200px]"
                onChange={(e) => {
                  const selectedType = e.target.value;
                  const typeSchema = propertyTypes.find(
                    (t) => t.value === selectedType
                  )?.schema;
                  if (!typeSchema) return;

                  const newPropName = `property_${
                    Object.keys(objValue || {}).length + 1
                  }`;

                  // Initialize with required fields based on schema
                  const newValue: Record<string, unknown> = {
                    type: selectedType,
                  };

                  if (selectedType === "title") {
                    Object.assign(newValue, {
                      title: [{ type: "text", text: { content: "" } }],
                    });
                  } else if (selectedType === "rich_text") {
                    Object.assign(newValue, {
                      rich_text: [{ type: "text", text: { content: "" } }],
                    });
                  } else if (selectedType === "number") {
                    Object.assign(newValue, { number: null });
                  } else if (selectedType === "select") {
                    Object.assign(newValue, { select: null });
                  } else if (selectedType === "multi_select") {
                    Object.assign(newValue, { multi_select: [] });
                  } else if (selectedType === "date") {
                    Object.assign(newValue, { date: null });
                  } else if (selectedType === "people") {
                    Object.assign(newValue, { people: [] });
                  } else if (selectedType === "files") {
                    Object.assign(newValue, { files: [] });
                  } else if (selectedType === "checkbox") {
                    Object.assign(newValue, { checkbox: false });
                  } else if (selectedType === "url") {
                    Object.assign(newValue, { url: null });
                  } else if (selectedType === "email") {
                    Object.assign(newValue, { email: null });
                  } else if (selectedType === "phone_number") {
                    Object.assign(newValue, { phone_number: null });
                  }

                  onChange(path, {
                    ...(objValue || {}),
                    [newPropName]: newValue,
                  });
                }}
              >
                {propertyTypes.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    description={type.description}
                  >
                    {type.value}
                  </SelectItem>
                ))}
              </Select>
            </div>
            {objValue &&
            typeof objValue === "object" &&
            Object.entries(objValue).length > 0 ? (
              <div className="space-y-6 pl-4 border-l-2 border-default-200">
                {Object.entries(objValue).map(([key, propValue]) => (
                  <div key={key} className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        aria-label="Property Name"
                        value={key}
                        onChange={(e) => {
                          const newName = e.target.value;
                          if (!newName || newName === key) return;

                          // Create new object with renamed property
                          const newValue = Object.fromEntries(
                            Object.entries(objValue).map(([k, v]) =>
                              k === key ? [newName, v] : [k, v]
                            )
                          );
                          onChange(path, newValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-default-200 focus:border-primary focus:outline-none"
                      />
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        aria-label="Delete"
                        onPress={() => {
                          const newValue = { ...objValue };
                          delete newValue[key];
                          onChange(path, newValue);
                        }}
                      >
                        <Icon icon="solar:trash-bin-trash-line-duotone" />
                      </Button>
                    </div>
                    <SchemaField
                      schema={propSchema as JSONSchema7Definition}
                      path={[...path, key]}
                      value={propValue}
                      error={
                        error?.path.join(".") === [...path, key].join(".")
                          ? error
                          : undefined
                      }
                      onChange={onChange}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-default-200 rounded-lg">
                <Icon
                  icon="solar:box-minimalistic-line-duotone"
                  className="w-8 h-8 text-default-400"
                />
                <p className="mt-2 text-sm text-default-500">
                  No properties added yet. Select a property type to add one.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // Handle nested objects
  if (schema.type === "object" && schema.properties) {
    const fieldName = path[path.length - 1] || "Object";
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-default-700">
          {schema.description || fieldName}
        </div>
        <div className="pl-4 border-l-2 border-default-200">
          {Object.entries(schema.properties).map(([key, propSchema]) => (
            <SchemaField
              key={key}
              schema={propSchema}
              path={[...path, key]}
              value={(value as Record<string, unknown>)?.[key]}
              error={
                error?.path.join(".") === [...path, key].join(".")
                  ? error
                  : undefined
              }
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    );
  }

  // Handle basic fields (string, number, boolean, enum)
  return (
    <FormField
      schema={schema}
      path={path}
      value={value}
      error={error}
      onChange={onChange}
    />
  );
}

export const SchemaField = memo(SchemaFieldComponent);
