'use client';

import { createContext, useContext, ReactNode } from 'react';

interface RoleContextType {
  userId: string;
  userName: string;
  businessName: string;
}

// Demo B2B user ID – matches seed.sql.
const DEMO_USER = {
  id: 'd0d0d0d0-0000-4000-8000-000000000001',
  name: 'Restoran Hijau Nusantara',
  businessName: 'PT Hijau Nusantara',
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  return (
    <RoleContext.Provider
      value={{
        userId: DEMO_USER.id,
        userName: DEMO_USER.name,
        businessName: DEMO_USER.businessName,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
