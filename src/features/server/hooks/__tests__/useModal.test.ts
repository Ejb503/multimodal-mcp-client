import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useModal } from "../useModal";

describe("useModal", () => {
  it("should initialize with closed state", () => {
    const { result } = renderHook(() => useModal<{ name: string }>());
    expect(result.current.viewModalOpen).toBe(false);
    expect(result.current.executeModalOpen).toBe(false);
    expect(result.current.selectedPrompt).toBeNull();
  });

  it("should open view modal with selected item", () => {
    const { result } = renderHook(() => useModal<{ name: string }>());
    const testItem = { name: "test" };

    act(() => {
      result.current.handleOpenViewModal(testItem);
    });

    expect(result.current.viewModalOpen).toBe(true);
    expect(result.current.executeModalOpen).toBe(false);
    expect(result.current.selectedPrompt).toBe(testItem);
  });

  it("should open execute modal with selected item", () => {
    const { result } = renderHook(() => useModal<{ name: string }>());
    const testItem = { name: "test" };

    act(() => {
      result.current.handleOpenExecuteModal(testItem);
    });

    expect(result.current.executeModalOpen).toBe(true);
    expect(result.current.viewModalOpen).toBe(false);
    expect(result.current.selectedPrompt).toBe(testItem);
  });

  it("should close modals and reset selected item", () => {
    const { result } = renderHook(() => useModal<{ name: string }>());
    const testItem = { name: "test" };

    // Open and close view modal
    act(() => {
      result.current.handleOpenViewModal(testItem);
    });
    expect(result.current.viewModalOpen).toBe(true);

    act(() => {
      result.current.handleCloseViewModal();
    });
    expect(result.current.viewModalOpen).toBe(false);
    expect(result.current.selectedPrompt).toBeNull();

    // Open and close execute modal
    act(() => {
      result.current.handleOpenExecuteModal(testItem);
    });
    expect(result.current.executeModalOpen).toBe(true);

    act(() => {
      result.current.handleCloseExecuteModal();
    });
    expect(result.current.executeModalOpen).toBe(false);
    expect(result.current.selectedPrompt).toBeNull();
  });
});
