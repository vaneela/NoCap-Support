import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CustomerAuth } from './pages/CustomerAuth';
import { StaffLogin } from './pages/StaffLogin';
import { CustomerPortal } from './pages/customer/CustomerPortal';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { SessionProvider, useSession, type SessionKind } from './session/SessionContext';

const HOME: Record<SessionKind, string> = { customer: '/customer', staff: '/staff' };
const LOGIN: Record<SessionKind, string> = { customer: '/', staff: '/staff/login' };

function RequireSession({ kind, children }: { kind: SessionKind; children: ReactNode }) {
  const { session } = useSession();
  if (!session) return <Navigate to={LOGIN[kind]} replace />;
  if (session.kind !== kind) return <Navigate to={HOME[session.kind]} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CustomerAuth />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route
            path="/customer"
            element={
              <RequireSession kind="customer">
                <CustomerPortal />
              </RequireSession>
            }
          />
          <Route
            path="/staff"
            element={
              <RequireSession kind="staff">
                <StaffDashboard />
              </RequireSession>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
