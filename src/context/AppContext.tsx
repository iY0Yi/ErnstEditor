import React from 'react';
import { FileTab } from '../types';

export interface AppContextValue {
  getActiveTab: () => FileTab | null;
  saveActiveTab: () => Promise<boolean>;
}

export const AppContext = React.createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) {
    throw new Error('AppContext is not available');
  }
  return ctx;
}


