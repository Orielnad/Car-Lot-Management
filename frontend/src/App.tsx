import type { ReactNode } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { VehiclesPage } from './pages/VehiclesPage';
import { CustomersPage } from './pages/CustomersPage';
import { TasksPage } from './pages/TasksPage';
import { DealsPage } from './pages/DealsPage';
import { DocumentsPage } from './pages/DocumentsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
