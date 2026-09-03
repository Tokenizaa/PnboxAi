import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MainContent } from './MainContent';
import { useAuth } from '../../contexts/AuthContext';
import { usePlans } from '../../contexts/PlansContext';
import { usePlan } from '../../contexts/PlanContext';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { plans, refreshPlans } = usePlans();
  const { currentPlan, setCurrentPlan } = usePlan();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
    }
  };

  const handleCreatePlan = () => {
    navigate('/plans/new');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isDashboard = location.pathname === '/';
  const isPlansPage = location.pathname === '/plans' || location.pathname.startsWith('/plans/');
  const isPlanWorkspace = location.pathname.startsWith('/plan/');
  const isSystem = location.pathname === '/system';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        plans={plans}
        currentPlan={currentPlan}
        onPlanChange={handlePlanChange}
        onCreatePlan={handleCreatePlan}
        onLogout={handleLogout}
        isDashboard={isDashboard}
        isPlansPage={isPlansPage}
        isPlanWorkspace={isPlanWorkspace}
        isSystem={isSystem}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Topbar */}
        <Topbar
          user={user}
          currentPlan={currentPlan}
          plans={plans}
          onPlanChange={handlePlanChange}
          onMenuClick={() => setSidebarOpen(true)}
          onMobileMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          mobileMenuOpen={mobileMenuOpen}
        />

        {/* Main content */}
        <MainContent>
          <Outlet />
        </MainContent>
      </div>
    </div>
  );
}