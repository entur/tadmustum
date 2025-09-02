import React, { createContext, useContext, useCallback, useState } from 'react';

type NoAccessProviderProps = {
  children: React.ReactNode;
};

const NoAccessContext = createContext<{
  showNoAccess: boolean;
  triggerNoAccess: () => void;
  resetNoAccess: () => void;
}>({
  showNoAccess: false,
  triggerNoAccess: () => {},
  resetNoAccess: () => {},
});

export const NoAccessProvider: React.FC<NoAccessProviderProps> = ({ children }) => {
  const [showNoAccess, setShowNoAccess] = useState(false);

  const triggerNoAccess = useCallback(() => setShowNoAccess(true), []);
  const resetNoAccess = useCallback(() => setShowNoAccess(false), []);

  return (
    <NoAccessContext.Provider value={{ showNoAccess, triggerNoAccess, resetNoAccess }}>
      {children}
    </NoAccessContext.Provider>
  );
};

export const useNoAccess = () => useContext(NoAccessContext);
