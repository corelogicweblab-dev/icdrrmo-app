"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";

export type AgencyChromeBridge = {
  socketLive: boolean;
  openCount: number;
  loading: boolean;
  onRefresh: () => void;
};

const defaultBridge: AgencyChromeBridge = {
  socketLive: false,
  openCount: 0,
  loading: false,
  onRefresh: () => {},
};

const BridgeContext = createContext<AgencyChromeBridge>(defaultBridge);
const SetBridgeContext = createContext<Dispatch<SetStateAction<AgencyChromeBridge>> | null>(null);

export function useAgencyChromeBridge(): AgencyChromeBridge {
  return useContext(BridgeContext);
}

export function useSetAgencyChromeBridge(): Dispatch<SetStateAction<AgencyChromeBridge>> {
  const set = useContext(SetBridgeContext);
  if (!set) throw new Error("useSetAgencyChromeBridge requires AgencyChromeBridgeProvider");
  return set;
}

export function AgencyChromeBridgeProvider({ children }: { children: ReactNode }): ReactElement {
  const [bridge, setBridge] = useState<AgencyChromeBridge>(defaultBridge);
  return (
    <SetBridgeContext.Provider value={setBridge}>
      <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
    </SetBridgeContext.Provider>
  );
}
