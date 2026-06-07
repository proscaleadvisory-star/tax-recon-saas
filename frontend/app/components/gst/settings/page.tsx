"use client";

import React from "react";
import { 
  Settings, 
  User, 
  Building2, 
  Shield, 
  Database, 
  Trash2, 
  Bell, 
  Globe,
  Save,
  ChevronRight
} from "lucide-react";
import { PersistenceService } from "@/lib/services/persistence-service";

export default function SettingsPage() {
  const handleClearData = () => {
    if (confirm("CRITICAL: This will permanently wipe all local reconciliation data and settings. Proceed?")) {
      PersistenceService.clearAll();
      alert("All local data has been cleared.");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-indigo-400 h-8 w-8" />
          Platform Settings
        </h1>
        <p className="text-slate-400 mt-1">Configure your ProScale Advisor workspace and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Nav */}
        <aside className="space-y-2">
           <SettingsNavItem icon={<User />} label="Profile Info" active />
           <SettingsNavItem icon={<Building2 />} label="Business Account" />
           <SettingsNavItem icon={<Shield />} label="Security" />
           <SettingsNavItem icon={<Bell />} label="Notifications" />
           <SettingsNavItem icon={<Database />} label="Data Management" />
        </aside>

        {/* Right Content */}
        <main className="md:col-span-2 space-y-8">
          {/* Profile Section */}
          <section className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-white border-b border-white/5 pb-4">Personal Profile</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                <input type="text" defaultValue="John" className="settings-input" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                <input type="text" defaultValue="Advisor" className="settings-input" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
              <input type="email" defaultValue="demo@proscale.com" className="settings-input" />
            </div>

            <div className="pt-4 flex justify-end">
              <button className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm">
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </section>

          {/* Business Section */}
          <section className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-white border-b border-white/5 pb-4">Organization Details</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Firm Name</label>
              <input type="text" defaultValue="ProScale Consulting LLP" className="settings-input" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Firm Registration No / GSTIN</label>
              <input type="text" defaultValue="27AAAPW1234A1Z1" className="settings-input text-indigo-400 font-mono" />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                 <Globe className="h-5 w-5 text-slate-500" />
                 <div>
                   <p className="text-sm font-bold text-white">Public Profile</p>
                   <p className="text-xs text-slate-500">Allow clients to find you on the portal</p>
                 </div>
              </div>
              <div className="w-12 h-6 bg-indigo-500 rounded-full relative">
                 <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="glass-card p-8 border-rose-500/20 bg-rose-500/[0.02] space-y-6">
             <h3 className="text-xl font-bold text-rose-400 flex items-center gap-2">
               <Trash2 className="h-5 w-5" /> Danger Zone
             </h3>
             <p className="text-sm text-slate-400">
               Permanently delete all your reconciliation history, saved files, and account settings. This action is irreversible.
             </p>
             <button 
               onClick={handleClearData}
               className="px-6 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 font-bold hover:bg-rose-500/20 transition-all text-sm"
             >
               Delete All Workspace Data
             </button>
          </section>
        </main>
      </div>

      <style jsx>{`
        .settings-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .settings-input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }
      `}</style>
    </div>
  );
}

function SettingsNavItem({ icon, label, active }: any) {
  return (
    <button className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
      active ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`}>
      <div className="flex items-center gap-3">
        {React.cloneElement(icon, { className: "w-5 h-5" })}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ChevronRight className={`w-4 h-4 ${active ? "opacity-100" : "opacity-0"}`} />
    </button>
  );
}
