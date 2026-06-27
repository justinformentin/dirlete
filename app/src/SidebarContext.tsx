import { createContext, useContext, ReactNode } from 'react';

const SidebarContext = createContext<(content: ReactNode) => void>(() => {});

export function useSidebar() {
  return useContext(SidebarContext);
}

export { SidebarContext };
