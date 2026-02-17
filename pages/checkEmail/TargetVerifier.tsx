import React, { useState } from "react";
// Make sure this path points to your actual service file
import { verifyTargetEmail } from "../../services/emailService"; 

// --- Types ---
interface VerificationResult {
  status: "valid" | "invalid";
  msg: string;
}

interface TargetVerifierProps {
  emails: string[];
  addLog: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const TargetVerifier: React.FC<TargetVerifierProps> = ({ emails, addLog }) => {
  const [verifying, setVerifying] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, VerificationResult>>({});

  const runVerification = async () => {
    if (!emails || emails.length === 0) return;
    setVerifying(true);
    addLog("Starting target email verification...", "info");

    // Process one by one to avoid rate limits
    for (const email of emails) {
      try {
        const res = await verifyTargetEmail(email); 
        
        // Determine status based on backend response
        const status: "valid" | "invalid" = res.status === "valid" ? "valid" : "invalid";
        const msg: string = res.status === "valid" ? "Deliverable" : (res.error || "Unknown");

        setResults((prev) => ({
          ...prev,
          [email]: { status, msg },
        }));

        if (status === "valid") {
            addLog(`Target Verified: ${email} is Valid.`, "success");
        } else {
            addLog(`Target Failed: ${email} - ${msg}`, "error");
        }

      } catch (err) {
        setResults((prev) => ({
            ...prev,
            [email]: { status: "invalid", msg: "Network Error" },
        }));
      }

      // 1 second delay to be polite to target servers
      await new Promise((r) => setTimeout(r, 1000)); 
    }
    setVerifying(false);
    addLog("Target verification complete.", "info");
  };

  const validCount = Object.values(results).filter((r) => r.status === "valid").length;
  const invalidCount = Object.values(results).filter((r) => r.status === "invalid").length;

  return (
    <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-tighter">
            Target Validator
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Clean your email list
          </p>
        </div>
        <button
          onClick={runVerification}
          disabled={verifying || !emails || emails.length === 0}
          className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            verifying
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
          }`}
        >
          {verifying ? (
            <><i className="fas fa-satellite-dish fa-spin mr-2"></i> Scanning...</>
          ) : (
            "Verify List"
          )}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 mb-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 flex-1">
          <span className="block text-[9px] text-blue-400 font-black uppercase">Deliverable</span>
          <span className="text-xl text-white font-black">{validCount}</span>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 flex-1">
          <span className="block text-[9px] text-rose-400 font-black uppercase">Undeliverable</span>
          <span className="text-xl text-white font-black">{invalidCount}</span>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {(!emails || emails.length === 0) ? (
            <div className="text-center py-20 opacity-30">
            <i className="fas fa-envelope-open-text text-6xl mb-4 text-slate-500"></i>
            <p className="font-bold uppercase text-slate-400">No Emails to Check</p>
            </div>
        ) : (
            emails.map((email, idx) => {
            const result = results[email];
            
            return (
                <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    result?.status === "valid"
                    ? "bg-blue-500/5 border-blue-500/30"
                    : result?.status === "invalid"
                        ? "bg-rose-500/5 border-rose-500/30"
                        : "bg-slate-900/40 border-slate-800"
                }`}
                >
                <div className="flex items-center gap-4">
                    <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        result?.status === "valid"
                        ? "bg-blue-500 text-white"
                        : result?.status === "invalid"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-800 text-slate-500"
                    }`}
                    >
                    <i className={`fas ${
                        result?.status === "valid" ? "fa-check" : 
                        result?.status === "invalid" ? "fa-ban" : "fa-search"
                    }`}></i>
                    </div>
                    <div>
                    <p className="text-sm font-bold text-white">{email}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                         {/* Extract domain for display */}
                        {email.split('@')[1] || "Unknown Domain"}
                    </p>
                    </div>
                </div>

                <div className="text-right">
                    <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                        result?.status === "valid"
                        ? "bg-blue-500/20 text-blue-400"
                        : result?.status === "invalid"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-slate-800 text-slate-600"
                    }`}
                    >
                    {result?.msg || "Queued"}
                    </span>
                </div>
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};

export default TargetVerifier;