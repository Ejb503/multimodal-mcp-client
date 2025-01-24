import { useState } from "react";

export type ModalMode = "view" | "execute" | null;

export interface UseModalReturn<T> {
  viewModalOpen: boolean;
  executeModalOpen: boolean;
  selectedPrompt: T | null;
  handleOpenViewModal: (item: T) => void;
  handleOpenExecuteModal: (item: T) => void;
  handleCloseViewModal: () => void;
  handleCloseExecuteModal: () => void;
}

export function useModal<T>(): UseModalReturn<T> {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<T | null>(null);

  const handleOpenViewModal = (item: T) => {
    setSelectedPrompt(item);
    setViewModalOpen(true);
  };

  const handleOpenExecuteModal = (item: T) => {
    setSelectedPrompt(item);
    setExecuteModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleCloseExecuteModal = () => {
    setExecuteModalOpen(false);
    setSelectedPrompt(null);
  };

  return {
    viewModalOpen,
    executeModalOpen,
    selectedPrompt,
    handleOpenViewModal,
    handleOpenExecuteModal,
    handleCloseViewModal,
    handleCloseExecuteModal,
  };
}
