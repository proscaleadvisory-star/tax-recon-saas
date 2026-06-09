import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { BudgetGrid } from './components/BudgetGrid';
import { ForecastDashboard } from './components/ForecastDashboard';
import { ReportsPanel } from './components/ReportsPanel';
import { AuditConsole } from './components/AuditConsole';
import { ChatPanel } from './components/ChatPanel';

function App() {
  const [currentTab, setCurrentTab] = useState('grid');

  return (
    <div className="flex bg-background min-h-screen text-gray-100 hero-gradient">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Panel Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        {currentTab === 'grid' && <BudgetGrid />}
        {currentTab === 'forecast' && <ForecastDashboard />}
        {currentTab === 'reports' && <ReportsPanel />}
        {currentTab === 'audit' && <AuditConsole />}
        {currentTab === 'chat' && <ChatPanel />}
      </main>
    </div>
  );
}

export default App;
