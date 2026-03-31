import { createContext, useContext, useState, ReactNode } from "react";

export type ConnectionState = "connected" | "offline" | "reconnecting" | "timeout" | "unstable";

interface ConnectionContextType {
  state: ConnectionState;
  setState: (state: ConnectionState) => void;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>("connected");

  return (
    <ConnectionContext.Provider value={{ state, setState }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    // Si no hay provider, devolver estado por defecto
    return { state: "connected" as ConnectionState, setState: () => {} };
  }
  return context;
}
