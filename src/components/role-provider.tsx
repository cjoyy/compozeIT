'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'b2b' | 'b2c';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  userId: string;
  userName: string;
}

// Demo user IDs — matches seed.sql
const DEMO_USERS: Record<Role, { id: string; name: string }> = {
  b2b: { id: 'd0d0d0d0-demo-4000-8000-000000000001', name: 'Restoran Hijau Nusantara' },
  b2c: { id: 'd0d0d0d0-demo-4000-8000-000000000002', name: 'Budi Santoso' },
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('b2c');

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        userId: DEMO_USERS[role].id,
        userName: DEMO_USERS[role].name,
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
