import { verifyTargetEmail } from "@/services/emailService";
import { useMail } from "@/utils/MailContext";
import React, { useState } from "react";

// --- MOCKED DEPENDENCIES FOR PREVIEW ---
// Replaces: import { verifyTargetEmail } from "../../services/emailService";
// const verifyTargetEmail = async (email: string) => {
//   return new Promise<{status: string, error?: string}>((resolve) => {
//     setTimeout(() => {
//       // Mocking an 80% success rate for visualization
//       if (Math.random() > 0.2) resolve({ status: "valid" });
//       else resolve({ status: "invalid", error: "Mailbox not found" });
//     }, 400);
//   });
// };

// Replaces: import { useMail } from "@/utils/MailContext";

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
    addLog(
      `Batching ${emails.length} targets for server-side verification...`,
      "info",
    );

    const data = await verifyTargetEmail(emails);

    if (data.success) {
      const newResults: Record<string, VerificationResult> = {};

      // Map the array of results back to your State object
      data.results.forEach((res: any) => {
        newResults[res.email] = {
          status: res.status, // "valid" | "invalid"
          msg: res.status === "valid" ? "Deliverable" : res.error || "Rejected",
        };
      });

      setResults(newResults);

      addLog(
        `Batch complete: ${data.results.filter((r: any) => r.status === "valid").length} valid targets found.`,
        "success",
      );
    } else {
      addLog(`Batch verification failed: ${data.error}`, "error");
    }

    setVerifying(false);
  };

  // --- NEW: CSV Download Logic ---
  const downloadValidCSV = () => {
    const validEmails = emails.filter(
      (e) => results[e.email]?.status === "valid",
    );
    if (validEmails.length === 0) return;

    const csvRows = ["Email,Name"];
    validEmails.forEach((e) => {
      // Escape commas in names if any exist
      const safeName = e.name ? `"${e.name.replace(/"/g, '""')}"` : "Unknown";
      csvRows.push(`${e.email},${safeName}`);
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
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
    <div className="glass rounded-[3.5rem] p-10  shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
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
            verifying || !emails || emails.length === 0
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

      {/* Email Status Summary */}
      <div className="flex-1 p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
        {!emails || emails.length === 0 ? (
          /* State: No Emails */
          <div className="text-center py-10 opacity-30">
            <i className="fas fa-envelope-open-text text-5xl mb-4 text-slate-500"></i>
            <p className="font-bold uppercase tracking-wider text-slate-400">
              No Emails to Check
            </p>
          </div>
        ) : (
          /* State: Has Emails */
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <i className="fas fa-list-ol text-blue-400 text-2xl"></i>
            </div>
            <h3 className="text-2xl font-black text-white">{emails.length}</h3>
            <p className="text-slate-400 font-medium uppercase text-xs tracking-widest mt-1">
              Emails Loaded & Ready
            </p>

            {/* Optional: Tiny progress indicator if processing is active */}
            {Object.keys(results).length > 0 && (
              <p className="mt-4 text-[10px] text-slate-500 font-mono italic">
                Checked {Object.keys(results).length} of {emails.length}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function TargetVerifier() {
  const { addLog, receivers } = useMail();
  return (
    <div className="bg-[#020617] min-h-screen  font-sans">
      <TargetVerifierComponent emails={receivers} addLog={addLog} />
    </div>
  );
}
