import React, { useState } from "react";
import { Sender } from "../../types";
import { verifySmtpCredential } from "../../services/emailService";
import { useMail } from "@/utils/MailContext";

// --- COMPONENT: SMTP VERIFIER (NEW) ---
const SmtpVerifier = ({
  senders,
  addLog,
}: {
  senders: Sender[];
  addLog: any;
}) => {
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState<
    Record<string, { status: "valid" | "invalid"; msg?: string }>
  >({});

  const runVerification = async () => {
    if (senders?.length === 0) return;
    setVerifying(true);

    for (const sender of senders) {
      const key = sender.email || sender.username;
      const res = await verifySmtpCredential(sender);

      setResults((prev) => ({
        ...prev,
        [key]: {
          status: res.success ? "valid" : "invalid",
          msg: res.success ? "Authenticated" : res.error,
        },
      }));

      if (res.success) addLog(`Verified: ${key} is VALID.`, "success");
      else addLog(`Failed: ${key} - ${res.error}`, "error");

      await new Promise((r) => setTimeout(r, 200)); // Rate limiting
    }
    setVerifying(false);
  };

  const validCount = Object.values(results).filter(
    (r) => r.status === "valid",
  ).length;
  const invalidCount = Object.values(results).filter(
    (r) => r.status === "invalid",
  ).length;

  return (
    <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-tighter">
            SMTP Validator
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Check credentials before sending
          </p>
        </div>
        <button
          onClick={runVerification}
          disabled={verifying || senders?.length === 0}
          className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${verifying ? "bg-slate-800 text-slate-500" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"}`}
        >
          {verifying ? (
            <>
              <i className="fas fa-circle-notch fa-spin mr-2"></i> Checking...
            </>
          ) : (
            "Verify Batch"
          )}
        </button>
      </div>

      {/* Results Stats */}
      <div className="flex gap-4 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 flex-1">
          <span className="block text-[9px] text-emerald-400 font-black uppercase">
            Valid
          </span>
          <span className="text-xl text-white font-black">{validCount}</span>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 flex-1">
          <span className="block text-[9px] text-rose-400 font-black uppercase">
            Invalid
          </span>
          <span className="text-xl text-white font-black">{invalidCount}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {senders?.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <i className="fas fa-server text-6xl mb-4 text-slate-500"></i>
            <p className="font-bold uppercase text-slate-400">
              No Senders Loaded
            </p>
          </div>
        ) : (
          senders?.map((sender, idx) => {
            const key = sender.email || sender.username;
            const result = results[key];
            return (
              <div
                key={idx}
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
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      result?.status === "valid"
                        ? "bg-emerald-500 text-white"
                        : result?.status === "invalid"
                          ? "bg-rose-500 text-white"
                          : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <i
                      className={`fas ${
                        result?.status === "valid"
                          ? "fa-check"
                          : result?.status === "invalid"
                            ? "fa-times"
                            : "fa-shield-alt"
                      }`}
                    ></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {sender.email || sender.username}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {sender.host}
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

// --- MAIN APP COMPONENT ---
const VerifyEmail = () => {
  const { addLog, senders } = useMail();
  return <SmtpVerifier senders={senders} addLog={addLog} />;
};

export default VerifyEmail;
