import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchemaField } from "../components/SchemaField";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import type { JSONSchema7 } from "json-schema";

describe("SchemaField", () => {
  describe("oneOf schema handling", () => {
    it("renders type selector with options", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <SchemaField
          schema={{
            oneOf: [
              {
                type: "object",
                properties: {
                  type: { const: "database_id" },
                  database_id: { type: "string" },
                },
              },
              {
                type: "object",
                properties: {
                  type: { const: "page_id" },
                  page_id: { type: "string" },
                },
              },
            ],
            description: "Parent container where the page will be created",
          }}
          path={[]}
          value={{}}
          onChange={onChange}
        />
      );

      const select = screen.getByRole("button", {
        name: /Parent container where the page will be created/i,
      });
      expect(select).toBeInTheDocument();

      await user.click(select);
      const option = screen.getByRole("option", { name: /database_id/i });
      expect(option).toBeInTheDocument();
    });

    it("initializes required fields when selecting type", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <SchemaField
          schema={{
            oneOf: [
              {
                type: "object",
                properties: {
                  type: { const: "database_id" },
                  database_id: { type: "string" },
                },
                required: ["database_id"],
              },
            ],
            description: "Parent container where the page will be created",
          }}
          path={[]}
          value={{}}
          onChange={onChange}
        />
      );

      const select = screen.getByRole("button", {
        name: /Parent container where the page will be created/i,
      });
      await user.click(select);
      const option = screen.getByRole("option", { name: /database_id/i });
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith([], {
        type: "database_id",
        database_id: "",
      });
    });

    it("shows nested fields for selected type", () => {
      const onChange = vi.fn();

      render(
        <SchemaField
          schema={{
            oneOf: [
              {
                type: "object",
                properties: {
                  type: { const: "database_id" },
                  database_id: {
                    type: "string",
                    description: "ID of the parent database",
                  },
                },
              },
            ],
          }}
          path={[]}
          value={{ type: "database_id", database_id: "" }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("ID of the parent database")).toBeInTheDocument();
    });
  });

  describe("pattern properties handling", () => {
    const schema: JSONSchema7 = {
      type: "object",
      patternProperties: {
        "^[a-zA-Z0-9_]+$": {
          oneOf: [
            {
              type: "object",
              properties: {
                type: { const: "text" },
              },
              required: ["type"],
            },
          ],
        },
      },
    };

    it("renders property type selector", () => {
      render(
        <SchemaField schema={schema} path={[]} value={{}} onChange={() => {}} />
      );

      expect(screen.getByText("Properties")).toBeInTheDocument();
      expect(screen.getByText("Select type")).toBeInTheDocument();
    });

    it("adds new property with correct structure", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <SchemaField schema={schema} path={[]} value={{}} onChange={onChange} />
      );

      const typeSelect = screen.getByRole("button", {
        name: /Property Type/i,
      });
      await user.click(typeSelect);

      const textOption = screen.getByRole("option", { name: /text/i });
      await user.click(textOption);

      expect(onChange).toHaveBeenCalledWith([], {
        property_1: {
          type: "text",
        },
      });
    });

    it("allows property deletion", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <SchemaField
          schema={schema}
          path={[]}
          value={{
            property_1: {
              type: "text",
            },
          }}
          onChange={onChange}
        />
      );

      const deleteButton = screen.getByRole("button", {
        name: /delete/i,
      });
      await user.click(deleteButton);

      expect(onChange).toHaveBeenCalledWith([], {});
    });
  });

  describe("error handling", () => {
    it("displays validation errors", () => {
      const onChange = vi.fn();

      render(
        <SchemaField
          schema={{
            type: "string",
            description: "Required field",
          }}
          path={[]}
          value=""
          error={{ path: [], message: "This field is required" }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });
  });
});
