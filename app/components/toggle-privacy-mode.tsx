import { MetaRepository } from "@/repositories/meta";
import { useQuery } from "@tanstack/react-query";
import React, { createContext, ReactNode, useContext } from "react";

// Define the context type
interface PrivacyModeContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

// Create the context
const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(
  undefined
);

// Provider component
export const PrivacyModeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data } = useQuery(MetaRepository.getUserMeta());

  const { mutate } = MetaRepository.updateUserMetaMutation();

  const togglePrivacyMode = () => {
    mutate({
      privacyMode: !data?.settings?.privacyMode,
    });
  };

  const isPrivacyMode = data?.settings?.privacyMode ?? false;

  return (
    <PrivacyModeContext value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyModeContext>
  );
};

// Custom hook to use the context
export const usePrivacyMode = (): PrivacyModeContextType => {
  const context = useContext(PrivacyModeContext);
  if (!context) {
    throw new Error("usePrivacyMode must be used within a PrivacyModeProvider");
  }
  return context;
};
