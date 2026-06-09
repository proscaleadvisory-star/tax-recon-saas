import React, { useState } from 'react';
import { api, type Anomaly } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Upload, AlertCircle, CheckCircle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

export const AuditConsole: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  
  const [training, setTraining] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    setStatusMessage('Querying database & compiling historical actuals...');
    try {
      const res = await api.trainAuditor();
      setStatusMessage(res.message);
    } catch (e: any) {
      setStatusMessage(`Training failed: ${e.message}`);
    } finally {
      setTraining(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleRunAudit = async () => {
    if (!selectedFile) return;
    setAuditing(true);
    try {
      const res = await api.runAuditor(selectedFile);
      setAnomalies(res.anomalies);
    } catch (e: any) {
      alert(`Audit failed: ${e.message}`);
    } finally {
      setAuditing(false);
    }
  };

  // Compile histogram data bins (0.0 to 1.0)
  const compileHistogram = () => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${(i * 0.1).toFixed(1)}-${((i + 1) * 0.1).toFixed(1)}`,
      count: 0
    }));
    
    anomalies.forEach(a => {
      const idx = Math.min(Math.floor(a.risk_score * 10), 9);
      bins[idx].count += 1;
    });
    
    return bins;
  };

  const histogramData = compileHistogram();
  const criticalCount = anomalies.filter(a => a.risk_score >= 0.75).length;
  const warningCount = anomalies.filter(a => a.risk_score >= 0.5 && a.risk_score < 0.75).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Pre-Close Ledger Auditor</h2>
          <p className="text-gray-400 text-sm">Hybrid Unsupervised ML Pipeline: PyTorch Autoencoder + Isolation Forest</p>
        </div>

        <button
          onClick={handleTrainModel}
          disabled={training}
          className="border border-border bg-card hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {training ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Fitting PyTorch Net...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Retrain ML Model on DB</span>
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-lg text-sm flex items-center gap-2 animate-pulse-slow">
          <AlertCircle className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Upload zone */}
      <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-white">Upload Pending Ledger Transactions</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Select or drag and drop a journal entries CSV file. The file must contain the following headers: 
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded font-mono ml-1">amount</code>, 
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded font-mono ml-1">timestamp</code>, 
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded font-mono ml-1">cost_center</code>, 
            <code className="text-primary bg-primary/10 px-1 py-0.5 rounded font-mono ml-1">account_id</code>.
          </p>
          
          <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-[#0a0a0f]/60 cursor-pointer relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-gray-500" />
            <span className="text-sm text-gray-300 font-medium">
              {selectedFile ? selectedFile.name : 'Choose CSV file...'}
            </span>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={!selectedFile || auditing}
            className="w-full bg-primary hover:bg-primaryHover text-white py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {auditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Reconstruction Fusion...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Perform Ledger Audit Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Help card */}
        <div className="bg-[#0f0f1b] border border-border p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-sm text-white mb-2">How Anomaly Fusion Works</h4>
            <ul className="text-xs text-gray-400 space-y-2.5 list-disc pl-4">
              <li><strong>LedgerPreprocessor</strong> scales numeric bounds and target encodes high-cardinality fields.</li>
              <li><strong>Autoencoder Model</strong> maps complex dimensions to extract reconstruction error vectors.</li>
              <li><strong>Isolation Forest</strong> partitions the ledger space to detect unusual coordinate bounds.</li>
              <li><strong>Fused Score Layer</strong> merges results (60% Autoencoder, 40% IF) to score risk levels [0-1].</li>
            </ul>
          </div>
          <div className="text-[10px] text-gray-500 mt-4 border-t border-border/40 pt-4">
            ℹ️ All calculations are completed instantly on the local CPU, requiring zero cloud SaaS pricing.
          </div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <>
          {/* Risk Rollup Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Scanned Rows</span>
              <span className="text-3xl font-bold text-white mt-2 font-mono">{anomalies.length}</span>
              <span className="text-[10px] text-emerald-400 mt-1">✓ Complete scan pipeline finished</span>
            </div>

            <div className="glass-panel p-6 flex flex-col justify-between border-l-2 border-l-rose-500">
              <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Critical Risks (≥ 0.75)</span>
              <span className="text-3xl font-bold text-rose-500 mt-2 font-mono">{criticalCount}</span>
              <span className="text-[10px] text-rose-400 mt-1">Requires immediate manual audit</span>
            </div>

            <div className="glass-panel p-6 flex flex-col justify-between border-l-2 border-l-amber-500">
              <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Warning Deviations (0.50 - 0.75)</span>
              <span className="text-3xl font-bold text-amber-500 mt-2 font-mono">{warningCount}</span>
              <span className="text-[10px] text-amber-400 mt-1">Verify posting parameters</span>
            </div>
          </div>

          {/* Histogram distribution */}
          <div className="glass-panel p-6">
            <h3 className="font-semibold text-white mb-4">Risk Score Distribution Histogram</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f33" />
                  <XAxis dataKey="range" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#12121e', borderColor: '#1f1f33' }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomaly list */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-border bg-[#151525] flex justify-between items-center">
              <h3 className="font-semibold text-sm text-white">Flagged Outliers & Posting Exceptions</h3>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header w-12"></th>
                  <th className="table-header">Transaction ID</th>
                  <th className="table-header">GL Account</th>
                  <th className="table-header">Cost Center</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-center w-36">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => {
                  const isExpanded = expandedRow === a.transaction_id;
                  const isCritical = a.risk_score >= 0.75;
                  const isWarning = a.risk_score >= 0.50 && a.risk_score < 0.75;
                  
                  return (
                    <React.Fragment key={a.transaction_id}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : a.transaction_id)}
                        className="hover:bg-gray-800/40 cursor-pointer border-b border-border/50"
                      >
                        <td className="table-cell text-center text-gray-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="table-cell font-mono text-xs font-semibold text-white">{a.transaction_id}</td>
                        <td className="table-cell">{a.account_id}</td>
                        <td className="table-cell text-gray-400">{a.cost_center}</td>
                        <td className="table-cell text-right font-mono">${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="table-cell text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono ${
                            isCritical 
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {(a.risk_score * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>

                      {/* Expandable explanations and attributions bar chart */}
                      {isExpanded && (
                        <tr className="bg-[#0f0f1b]/60">
                          <td colSpan={6} className="px-6 py-6 border-b border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <h4 className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">Exception Indicators</h4>
                                <ul className="space-y-2">
                                  {a.reasons.map((r, rIdx) => (
                                    <li key={rIdx} className="text-sm text-gray-300 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2"></span>
                                      <span>{r}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-4 pt-4 border-t border-border/40 text-xs text-gray-500">
                                  <p>Autoencoder reconstruction contribution score: <strong>{(a.ae_score * 100).toFixed(0)}%</strong></p>
                                  <p>Isolation Forest random path length score: <strong>{(a.if_score * 100).toFixed(0)}%</strong></p>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">Feature Attributions (Reconstruction Error)</h4>
                                <div className="h-32 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                      data={a.attributions}
                                      layout="vertical"
                                      margin={{ top: 5, right: 5, left: 20, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f33" />
                                      <XAxis type="number" stroke="#9ca3af" fontSize={9} />
                                      <YAxis dataKey="feature" type="category" stroke="#9ca3af" fontSize={9} width={90} />
                                      <Tooltip contentStyle={{ backgroundColor: '#12121e', borderColor: '#1f1f33' }} />
                                      <Bar dataKey="contribution" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
