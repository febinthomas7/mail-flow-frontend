import React, { useState } from "react";

// --- MOCKED DEPENDENCIES FOR PREVIEW ---
// Replaces: import { verifySmtpConfig } from "../../services/emailService";
const verifySmtpConfig = async (email: string) => {
  return new Promise<{status: string, error?: string}>((resolve) => {
    setTimeout(() => {
      // Mocking an 80% success rate for visualization
      if (Math.random() > 0.2) resolve({ status: "valid" });
      else resolve({ status: "invalid", error: "Connection Timeout" });
    }, 600);
  });
};

// Replaces: import { useMail } from "@/utils/MailContext";
const useMail = () => {
  const [senders] = useState<any[]>([
    { email: "node1@secure.local", host: "smtp.secure.local", port: 587, username: "user1", password: "pwd" },
    { email: "node2@secure.local", host: "smtp.secure.local", port: 587, username: "user2", password: "pwd" },
    { email: "deadnode@secure.local", host: "smtp.bad.local", port: 465, username: "user3", password: "pwd" },
    { email: "node4@relay.net", host: "smtp.relay.net", port: 587, username: "user4", password: "pwd" },
    { email: "node5@relay.net", host: "smtp.relay.net", port: 587, username: "user5", password: "pwd" },
    { email: "node6@relay.net", host: "smtp.relay.net", port: 587, username: "user6", password: "pwd" },
    { email: "node7@relay.net", host: "smtp.relay.net", port: 587, username: "user7", password: "pwd" },
    { email: "node8@relay.net", host: "smtp.relay.net", port: 587, username: "user8", password: "pwd" },
    { email: "node9@relay.net", host: "smtp.relay.net", port: 587, username: "user9", password: "pwd" },
    { email: "node10@relay.net", host: "smtp.relay.net", port: 587, username: "user10", password: "pwd" },
    { email: "node11@relay.net", host: "smtp.relay.net", port: 587, username: "user11", password: "pwd" },
    { email: "node12@relay.net", host: "smtp.relay.net", port: 587, username: "user12", password: "pwd" },
  ]);
  return {
    addLog: (msg: string, type: string) => console.log(`[${type}] ${msg}`),
    senders
  };
};

// --- Types ---
interface VerificationResult {
  status: "valid" | "invalid";
  msg: string;
}

interface SmtpVerifierProps {
  senders: { email: string; host?: string; port?: string | number; username?: string; password?: string; [key: string]: any }[];
  addLog: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

const SmtpVerifierComponent: React.FC<SmtpVerifierProps> = ({
  senders,
  addLog,
}) => {
  const [verifying, setVerifying] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, VerificationResult>>(
    {},
  );

  const runVerification = async () => {
    if (!senders || senders.length === 0) return;
    setVerifying(true);
    addLog("Starting SMTP node verification...", "info");

    // Process nodes sequentially
    for (const sender of senders) {
      try {
        const res = await verifySmtpConfig(sender.email);

        const status: "valid" | "invalid" =
          res.status === "valid" ? "valid" : "invalid";
        const msg: string =
          res.status === "valid" ? "Connected" : res.error || "Failed";

        setResults((prev) => ({
          ...prev,
          [sender.email]: { status, msg },
        }));

        if (status === "valid") {
          addLog(`Node Verified: ${sender.email} is active.`, "success");
        } else {
          addLog(`Node Failed: ${sender.email} - ${msg}`, "error");
        }
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [sender.email]: { status: "invalid", msg: "Network Error" },
        }));
      }

      // Delay to avoid overwhelming local network/sockets
      await new Promise((r) => setTimeout(r, 800));
    }
    setVerifying(false);
    addLog("SMTP verification complete.", "info");
  };

  // --- CSV Download Logic for SMTP Senders ---
  const downloadValidCSV = () => {
    const validSenders = senders.filter((s) => results[s.email]?.status === "valid");
    if (validSenders.length === 0) return;

    // We include standard SMTP config headers
    const csvRows = ["Email,Host,Port,Username,Password"];
    validSenders.forEach((s) => {
      // Ensure we escape strings safely for CSV
      const email = `"${s.email || ""}"`;
      const host = `"${s.host || ""}"`;
      const port = `"${s.port || ""}"`;
      const user = `"${(s.username || "").replace(/"/g, '""')}"`;
      const pass = `"${(s.password || "").replace(/"/g, '""')}"`;
      
      csvRows.push(`${email},${host},${port},${user},${pass}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "valid_smtp_nodes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog("Valid SMTP nodes downloaded as CSV.", "success");
  };

  const validCount = Object.values(results).filter(
    (r) => r.status === "valid",
  ).length;
  const invalidCount = Object.values(results).filter(
    (r) => r.status === "invalid",
  ).length;

  return (
    <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
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
            verifying
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
          <span className="text-xl text-white font-black">{invalidCount}</span>
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

      {/* Senders List with fixed max height for scrolling */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 max-h-[550px]">
        {!senders || senders.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <i className="fas fa-network-wired text-6xl mb-4 text-slate-500"></i>
            <p className="font-bold uppercase text-slate-400">
              No SMTP Nodes to Check
            </p>
          </div>
        ) : (
          senders?.map((sender, index) => {
            const result = results[sender.email];

            return (
              <div
                key={index}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  result?.status === "valid"
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : result?.status === "invalid"
                      ? "bg-rose-500/5 border-rose-500/30"
                      : "bg-slate-900/40 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-inner ${
                      result?.status === "valid"
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : result?.status === "invalid"
                          ? "bg-rose-500 text-white shadow-rose-500/20"
                          : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <i
                      className={`fas ${
                        result?.status === "valid"
                          ? "fa-check"
                          : result?.status === "invalid"
                            ? "fa-times"
                            : "fa-server"
                      }`}
                    ></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {sender.email}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Host: {sender.host || "Unknown"} | Port: {sender.port || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      result?.status === "valid"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : result?.status === "invalid"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-slate-800 text-slate-600"
                    }`}
                  >
                    {result?.msg || "Pending"}
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

export default function SmtpVerifier() {
  const { addLog, senders } = useMail();
  return (
    <div className="bg-[#020617] min-h-screen p-4 md:p-10 font-sans">
      <SmtpVerifierComponent senders={senders} addLog={addLog} />
    </div>
  );
}