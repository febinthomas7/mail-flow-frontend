import { verifySmtpBatch } from "@/services/emailService";
import { useMail } from "@/utils/MailContext";
import React, { useState } from "react";

// --- Types ---
interface VerificationResult {
  status: "valid" | "invalid";
  msg: string;
}

interface SmtpVerifierProps {
  senders: {
    username?: string;
    password?: string;
    [key: string]: any;
  }[];
  addLog: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

export default function SmtpVerifier() {
  const {
    receivers,
    logs,
    setLogs,
    senders,
    addLog,
    setThroughput,
    setBackendLogs,
    senderFile,
    receiverFile,
    templateFile,
    htmlTemplate,
    recMode,
    throughput,
    smtpType,
    sendLimit,
    manualText,
    setTemplateFile,
    setManualText,
    deliveryFormat,
    setDeliveryFormat,
    setSmtpType,
    htmlMode,
    setHtmlMode,
    setSenderFile,
    setReceiverFile,
    setRecMode,
    sendersCount,
    setHtmlTemplate,

    setSendLimit,
  } = useMail();
  const [verifying, setVerifying] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, VerificationResult>>(
    {},
  );

  const runVerification = async () => {
    if (!senders || senders.length === 0) return;

    setVerifying(true);
    addLog(`Verifying ${senders.length} nodes via backend...`, "info");

    const data = await verifySmtpBatch(senders);

    if (data.success) {
      const newResults: Record<string, VerificationResult> = {};

      // Map backend 'user' (username) back to frontend 'email' key
      senders.forEach((sender) => {
        const match = data.results.find((r: any) => r.user === sender.username);
        if (match) {
          newResults[sender.username] = {
            status: match.status, // "valid" | "invalid"
            msg: match.status === "valid" ? "Online" : "Failed",
          };
        }
      });

      setResults(newResults);
      addLog("Verification sequence complete.", "success");
    } else {
      addLog(`Batch check failed: ${data.error}`, "error");
    }

    setVerifying(false);
  };
  // --- CSV Download Logic for SMTP Senders ---
  const downloadValidCSV = () => {
    const validSenders = senders.filter(
      (s) => results[s.email]?.status === "valid",
    );

    if (validSenders.length === 0) return;

    // Headers
    const csvRows = ["username,password"];

    validSenders.forEach((s) => {
      // Clean quotes to prevent CSV breakage
      const user = `"${(s.username || "").toString().replace(/"/g, '""')}"`;
      const pass = `"${(s.password || "").toString().replace(/"/g, '""')}"`;
      csvRows.push(`${user},${pass}`);
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = `valid_nodes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const validCount = Object.values(results).filter(
    (r) => r.status === "valid",
  ).length;
  const invalidCount = Object.values(results).filter(
    (r) => r.status === "invalid",
  ).length;
  return (
    <div className="bg-[#020617] min-h-screen  font-sans">
      <div className="glass rounded-[3.5rem] p-10 shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tighter flex items-center gap-3">
              <i className="fas fa-server text-indigo-500"></i> SMTP Verifier
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Validate active relay nodes
            </p>
          </div>
          <button
            onClick={runVerification}
            disabled={verifying || !senders || senders.length === 0}
            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              verifying || !senders || senders.length === 0
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            }`}
          >
            {verifying ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i> Testing...
              </>
            ) : (
              "Verify Nodes"
            )}
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4 mb-6 items-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 flex-1">
            <span className="block text-[9px] text-emerald-400 font-black uppercase">
              Active Nodes
            </span>
            <span className="text-xl text-white font-black">{validCount}</span>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 flex-1">
            <span className="block text-[9px] text-rose-400 font-black uppercase">
              Failed Nodes
            </span>
            <span className="text-xl text-white font-black">
              {invalidCount}
            </span>
          </div>

          {/* --- CSV Download Button --- */}
          {validCount > 0 && (
            <button
              onClick={downloadValidCSV}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex flex-col items-center justify-center gap-1 active:scale-95"
              title="Download Valid SMTP Configs"
            >
              <i className="fas fa-file-csv text-sm"></i>
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {/* Senders Summary Card */}
        <div className="flex-1 p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
          {!senders || senders.length === 0 ? (
            /* State: No Senders */
            <div className="text-center py-10 opacity-30">
              <i className="fas fa-network-wired text-5xl mb-4 text-slate-500"></i>
              <p className="font-bold uppercase tracking-wider text-slate-400">
                No SMTP Nodes to Check
              </p>
            </div>
          ) : (
            /* State: Has Senders */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                <i className="fas fa-server text-emerald-400 text-2xl"></i>
              </div>

              <h3 className="text-3xl font-black text-white">
                {senders.length}
              </h3>

              <p className="text-slate-400 font-medium uppercase text-xs tracking-widest mt-1">
                SMTP {senders.length === 1 ? "Node" : "Nodes"} Loaded
              </p>

              {/* Real-time status subtext */}
              {Object.keys(results).length > 0 && (
                <div className="mt-4 flex gap-3 text-[10px] font-bold uppercase">
                  <span className="text-emerald-400">
                    {
                      Object.values(results).filter((r) => r.status === "valid")
                        .length
                    }{" "}
                    Valid
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-rose-400">
                    {
                      Object.values(results).filter(
                        (r) => r.status === "invalid",
                      ).length
                    }{" "}
                    Failed
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
