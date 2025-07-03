import React, { createContext, useState, useContext, type ReactNode, useCallback } from 'react';

interface EditingContextType {
  editingStopPlaceId: string | null;
  setEditingStopPlaceId: (id: string | null) => void;
}

const EditingContext = createContext<EditingContextType | undefined>(undefined);

export const EditingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [editingStopPlaceId, setEditingStopPlaceId] = useState<string | null>(null);

  const handleSetEditingStopPlaceId = useCallback((id: string | null) => {
    setEditingStopPlaceId(id);
  }, []);

  const value = { editingStopPlaceId, setEditingStopPlaceId: handleSetEditingStopPlaceId };

  return <EditingContext.Provider value={value}>{children}</EditingContext.Provider>;
};

export const useEditing = (): EditingContextType => {
  const context = useContext(EditingContext);
  if (context === undefined) {
    throw new Error('useEditing must be used within an EditingProvider');
  }
  return context;
};
