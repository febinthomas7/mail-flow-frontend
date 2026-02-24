import React, { useState } from "react";

// --- MOCKED DEPENDENCIES FOR PREVIEW ---
// Replaces: import { verifyTargetEmail } from "../../services/emailService";
const verifyTargetEmail = async (email: string) => {
  return new Promise<{status: string, error?: string}>((resolve) => {
    setTimeout(() => {
      // Mocking an 80% success rate for visualization
      if (Math.random() > 0.2) resolve({ status: "valid" });
      else resolve({ status: "invalid", error: "Mailbox not found" });
    }, 400);
  });
};

// Replaces: import { useMail } from "@/utils/MailContext";
const useMail = () => {
  const [receivers] = useState<any[]>([
    { email: "demo1@secure.local", name: "Demo 1" },
    { email: "demo2@secure.local", name: "Demo 2" },
    { email: "invalid@bounce.local", name: "Bouncer" },
    { email: "client4@domain.com", name: "Client 4" },
    { email: "client5@domain.com", name: "Client 5" },
    { email: "client6@domain.com", name: "Client 6" },
    { email: "client7@domain.com", name: "Client 7" },
    { email: "client8@domain.com", name: "Client 8" },
    { email: "client9@domain.com", name: "Client 9" },
    { email: "client10@domain.com", name: "Client 10" },
    { email: "client11@domain.com", name: "Client 11" },
    { email: "client12@domain.com", name: "Client 12" },
  ]);
  return {
    addLog: (msg: string, type: string) => console.log(`[${type}] ${msg}`),
    receivers
  };
};

// --- Types ---
interface VerificationResult {
  status: "valid" | "invalid";
  msg: string;
}

interface TargetVerifierProps {
  emails: { email: string; name?: string; [key: string]: any }[];
  addLog: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

const TargetVerifierComponent: React.FC<TargetVerifierProps> = ({
  emails,
  addLog,
}) => {
  const [verifying, setVerifying] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, VerificationResult>>(
    {},
  );

  console.log("TargetVerifierComponent rendered with emails:", emails);

  const runVerification = async () => {
    if (!emails || emails.length === 0) return;
    setVerifying(true);
    addLog("Starting target email verification...", "info");

    // Process one by one to avoid rate limits
    for (const email of emails) {
      try {
        const res = await verifyTargetEmail(email.email);

        // Determine status based on backend response
        const status: "valid" | "invalid" =
          res.status === "valid" ? "valid" : "invalid";
        const msg: string =
          res.status === "valid" ? "Deliverable" : res.error || "Unknown";

        setResults((prev) => ({
          ...prev,
          [email.email]: { status, msg },
        }));

        if (status === "valid") {
          addLog(`Target Verified: ${email.email} is Valid.`, "success");
        } else {
          addLog(`Target Failed: ${email.email} - ${msg}`, "error");
        }
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [email.email]: { status: "invalid", msg: "Network Error" },
        }));
      }

      // 1 second delay to be polite to target servers
      await new Promise((r) => setTimeout(r, 600));
    }
    setVerifying(false);
    addLog("Target verification complete.", "info");
  };

  // --- NEW: CSV Download Logic ---
  const downloadValidCSV = () => {
    const validEmails = emails.filter((e) => results[e.email]?.status === "valid");
    if (validEmails.length === 0) return;

    const csvRows = ["Email,Name"];
    validEmails.forEach((e) => {
      // Escape commas in names if any exist
      const safeName = e.name ? `"${e.name.replace(/"/g, '""')}"` : "Unknown";
      csvRows.push(`${e.email},${safeName}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "valid_targets.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog("Valid emails downloaded as CSV.", "success");
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
             <i className="fas fa-bullseye text-blue-500"></i> Target Validator
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
            <>
              <i className="fas fa-satellite-dish fa-spin mr-2"></i> Scanning...
            </>
          ) : (
            "Verify List"
          )}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 mb-6 items-center">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 flex-1">
          <span className="block text-[9px] text-blue-400 font-black uppercase">
            Deliverable
          </span>
          <span className="text-xl text-white font-black">{validCount}</span>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 flex-1">
          <span className="block text-[9px] text-rose-400 font-black uppercase">
            Undeliverable
          </span>
          <span className="text-xl text-white font-black">{invalidCount}</span>
        </div>

        {/* --- NEW: CSV Download Button --- */}
        {validCount > 0 && (
          <button
            onClick={downloadValidCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-1 active:scale-95"
            title="Download Valid Emails"
          >
            <i className="fas fa-file-csv text-sm"></i>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Email List - Added max-h-[550px] for scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 max-h-[550px]">
        {!emails || emails.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <i className="fas fa-envelope-open-text text-6xl mb-4 text-slate-500"></i>
            <p className="font-bold uppercase text-slate-400">
              No Emails to Check
            </p>
          </div>
        ) : (
          emails?.map((email, index) => {
            const result = results[email.email];

            return (
              <div
                key={index}
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
                        ? "bg-blue-500 text-white shadow-blue-500/20"
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
                            ? "fa-ban"
                            : "fa-search"
                      }`}
                    ></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {email.email}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {/* Extract domain for display */}
                      {email.email.split("@")[1] || "Unknown Domain"}
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

export default function TargetVerifier() {
  const { addLog, receivers } = useMail();
  return (
    <div className="bg-[#020617] min-h-screen p-4 md:p-10 font-sans">
      <TargetVerifierComponent emails={receivers} addLog={addLog} />
    </div>
  );
}