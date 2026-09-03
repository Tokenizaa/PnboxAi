import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlansProvider } from './contexts/PlansContext';
import { PlanProvider } from './contexts/PlanContext';
import { ResearchProvider } from './contexts/ResearchContext';
import { ExecutionProvider } from './contexts/ExecutionContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { PlansPage } from './pages/Plans';
import { PlanOverviewPage } from './pages/PlanOverview';
import { PlanResearchPage } from './pages/PlanResearch';
import { PlanToolsPage } from './pages/PlanTools';
import { PlanExecutionPage } from './pages/PlanExecution';
import { PlanHistoryPage } from './pages/PlanHistory';
import { SystemPage } from './pages/System';
import React from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthProvider>
        <PlansProvider>
          <PlanProvider>
            <ResearchProvider>
              <ExecutionProvider>
                <AppShell />
              </ExecutionProvider>
            </ResearchProvider>
          </PlanProvider>
        </PlansProvider>
      </AuthProvider>
    ),
    errorElement: <div className="p-8 text-center text-rose-400">Erro ao carregar a página</div>,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plans',
        element: (
          <ProtectedRoute>
            <PlansPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plan/:planId',
        element: (
          <ProtectedRoute>
            <PlanOverviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plan/:planId/research',
        element: (
          <ProtectedRoute>
            <PlanResearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plan/:planId/tools',
        element: (
          <ProtectedRoute>
            <PlanToolsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plan/:planId/execution',
        element: (
          <ProtectedRoute>
            <PlanExecutionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plan/:planId/history',
        element: (
          <ProtectedRoute>
            <PlanHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'system',
        element: (
          <ProtectedRoute>
            <SystemPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: 'cadastro',
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
    ],
  },
]);

export default router;