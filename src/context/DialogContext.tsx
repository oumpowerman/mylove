import React, { createContext, useContext, useState, useCallback } from 'react';
import { DialogGlobal } from '../components/ui/DialogGlobal';

interface DialogConfig {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant: 'danger' | 'info';
}

interface DialogContextType {
  showDialog: (config: Omit<DialogConfig, 'isOpen'>) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<DialogConfig>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'info'
  });

  const showDialog = useCallback((newConfig: Omit<DialogConfig, 'isOpen'>) => {
    setConfig({ ...newConfig, isOpen: true });
  }, []);

  const hideDialog = useCallback(() => {
    setConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <DialogGlobal 
        isOpen={config.isOpen}
        title={config.title}
        description={config.description}
        confirmLabel={config.confirmLabel}
        onConfirm={config.onConfirm}
        variant={config.variant}
        onCancel={hideDialog}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
