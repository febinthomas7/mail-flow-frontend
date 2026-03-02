import { useMail } from "@/utils/MailContext";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { sendBatchEmails } from "@/services/emailService";
import { io } from "socket.io-client";
export enum AppStatus {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
}
export interface Sender {
  email: string;
  name?: string;
}
export interface Receiver {
  email: string;
  name?: string;
}
export interface BatchPlan {
  sender: Sender;
  receivers: Receiver[];
  status: string;
  progress: number;
}
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  message: string;
}
const backendUrl = import.meta.env.VITE_BASE_URL;

const socket = io(backendUrl, {
  transports: ["polling"], // CRITICAL: Netlify proxies only support polling
  withCredentials: true,
  reconnectionAttempts: 10,
});
const uuidv4 = () => crypto.randomUUID();

export default function SendEmail() {
  const {
    receivers,
    logs,
    directFiles,
    setDirectFiles,
    setLogs,
    addLog,
    senders,
    includeBody,
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

  // State: App Flow
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [progressData, setProgressData] = useState({
    processed: 0,
    total: 0,
    remaining: "0",
  });
  // State: Content
  const [senderNames, setSenderNames] = useState(
    "PayPal Billing\nSecure Services\nAccount Manager for {{name}}",
  );
  const [emailSubject, setEmailSubject] = useState(
    "Your Digital Invoice - {{invoice}}\nInvoice #{{invoice}} for {{name}}\nNew Document: {{invoice}}",
  );
  const [emailBody, setEmailBody] = useState(
    `Hello {{name}},\n\nPlease find your secure digital invoice ({{invoice}}) attached to this email.\n\nDetails:\n- Issued to: {{name}}\n- Email: {{email}}\n- Date: {{date}}\n\nThank you for choosing McaFee Secure Services.\n\nBest Regards,\nThe PayPal Team`,
  );
  const [isPaused, setIsPaused] = useState(false);
  // State: Progress Tracking
  // const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  // const [senderProgress, setSenderProgress] = useState<Record<number, number>>(
  //   {},
  // );

  useEffect(() => {
    socket.on("batch_progress", (data) => {
      setProgressData(data);
      // console.log(data);

      // 2. Add to your logs if it's a real-time update
      if (data.status === "sent") {
        setStatus(AppStatus.PROCESSING);
        // You can add logic here to show successful hits
      }

      if (data.percentage == "100.0") {
        setStatus(AppStatus.COMPLETED);
      }
    });

    return () => {
      socket.off("batch_progress");
    };
  }, []);

  const togglePause = () => {
    if (isPaused) {
      socket.emit("resume_dispatch");
      setIsPaused(false);
      addLog("▶️ Resuming dispatch...", "info");
    } else {
      socket.emit("pause_dispatch");
      setIsPaused(true);
      addLog(
        "⏸️ Pausing dispatch (waiting for current tasks to finish)...",
        "warning",
      );
    }
  };

  // --- LOGGING UTILITY ---
  // const addLog = useCallback(
  //   (message: string, level: LogEntry["level"] = "info", isBackend = false) => {
  //     const newLog = { id: uuidv4(), timestamp: new Date(), level, message };
  //     if (isBackend) {
  //       setBackendLogs((prev: any) => [newLog, ...prev].slice(0, 50));
  //     }
  //   },
  //   [setBackendLogs],
  // );

  // --- HELPERS ---
  const generateInvoiceNumber = () =>
    Math.floor(1000000000 + Math.random() * 9000000000).toString();

  // --- LOGIC: ROUND ROBIN DISTRIBUTION ---
  const batchPlans = useMemo(() => {
    if (senders.length === 0 || receivers.length === 0) return [];
    const plans = senders.map((sender) => ({
      sender,
      receivers: [] as Receiver[],
      status: "pending",
      progress: 0,
    }));

    receivers.forEach((receiver, index) => {
      const senderIndex = index % senders.length;
      if (plans[senderIndex].receivers.length < sendLimit) {
        plans[senderIndex].receivers.push(receiver);
      }
    });
    return plans;
  }, [senders, receivers, sendLimit]);

  // --- LOGIC: EXECUTION ---
  const startCampaign = async () => {
    // 1. Validation
    if (receivers.length === 0 || senders.length === 0) {
      addLog("Error: Senders or Recipients list is empty.", "error");
      return;
    }

    setStatus(AppStatus.PROCESSING);
    // setSenderProgress({}); // Reset progress
    addLog(
      `RELAY: Initializing batch dispatch for ${receivers.length} targets...`,
      "warning",
    );

    // 2. Prepare Payload for your sender.js
    const payload = {
      targets: receivers, // Array of 20,000 objects {email, name, invoice}
      smtpConfigs: senders, // Array of sender objects {email, username, password}
      subjects: emailSubject.split("\n").filter((s) => s.trim()),
      senderNames: senderNames.split("\n").filter((s) => s.trim()),
      textBody: includeBody,
      generationOptions: {
        body: emailBody,
        html: htmlTemplate,
        format: deliveryFormat, // 'html', 'pdf', etc.
        receiverNames: receivers.map((r) => r.name),
        invoices: receivers.map(() => generateInvoiceNumber()),
        directFiles: directFiles,
      },
    };

    try {
      // 3. One single massive request
      addLog("Uploading batch data to server...", "info");

      const response = await sendBatchEmails(receivers, senders, payload);

      // const result = await response.json();

      if (response) {
        addLog(`Server Accepted`, "success", true);
        setStatus(AppStatus.PROCESSING);
      } else {
        throw new Error("Batch rejection");
      }
    } catch (err: any) {
      addLog(`Critical Failure: ${err.message}`, "error", true);
      setStatus(AppStatus.IDLE);
    }
  };

  return (
    <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
      <div className="flex justify-between items-start mb-10">
        <div className="space-y-6 w-full mr-4">
          {/* --- SENDER NAME ROTATOR --- */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center ml-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-id-badge text-indigo-500"></i> Sender Name
                Rotator
              </label>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">
                {senderNames.split("\n").filter((s) => s.trim()).length}{" "}
                Variations
              </span>
            </div>
            <textarea
              value={senderNames}
              onChange={(e) => setSenderNames(e.target.value)}
              className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-base font-bold text-slate-300 focus:border-indigo-500 outline-none transition-all shadow-inner h-[80px] custom-scrollbar"
              placeholder="Enter sender names (one per line)..."
              spellCheck={false}
            />
          </div>

          {/* --- SUBJECT INPUT ROTATOR --- */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center ml-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-pen-fancy text-indigo-500"></i> Subject
                Rotator
              </label>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">
                {emailSubject.split("\n").filter((s) => s.trim()).length}{" "}
                Variations
              </span>
            </div>
            <textarea
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-lg font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner h-[100px] custom-scrollbar"
              placeholder="Enter subjects (one per line)..."
              spellCheck={false}
            />
          </div>

          {/* Body Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 flex items-center gap-2">
              <i className="fas fa-align-left text-indigo-500"></i> Email
              Content
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full bg-black/40 border border-slate-800 rounded-3xl p-7 h-[250px] text-sm text-slate-300 custom-scrollbar font-medium focus:border-indigo-500 outline-none transition-all shadow-inner leading-relaxed"
            />
          </div>

          {/* Vars Helper */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-3">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
              Dynamic Injection Keys
            </p>
            <div className="flex flex-wrap gap-2.5">
              {[
                { key: "{name}", desc: "Recipient" },
                { key: "{email}", desc: "Email" },
                { key: "{invoice}", desc: "Generated ID" },
                { key: "{date}", desc: "Current Date" },
              ].map((v) => (
                <div
                  key={v.key}
                  className="flex flex-col items-start bg-indigo-500/5 p-2 px-3 rounded-lg border border-indigo-500/20 group hover:border-indigo-500/50 transition-all"
                >
                  <span className="text-indigo-400 text-[10px] font-mono font-bold">
                    {v.key}
                  </span>
                  <span className="text-[8px] text-slate-600 uppercase font-black">
                    {v.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={startCampaign}
              disabled={
                status === AppStatus.PROCESSING || batchPlans.length === 0
              }
              className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                status === AppStatus.PROCESSING || batchPlans.length === 0
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95"
              }`}
            >
              Start Dispatch
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-white/10 p-6 rounded-[2.5rem] mb-8 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Live Global Stream
            </p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {progressData.processed.toLocaleString()}{" "}
              <span className="text-slate-600 text-lg">
                / {progressData.total.toLocaleString()}
              </span>
            </p>
          </div>

          <div className="text-right space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Est. Remaining
            </p>
            <p className="text-2xl font-black text-indigo-400 tracking-tight">
              {progressData.remainingMins}{" "}
              <span className="text-xs text-slate-600">MIN</span>
            </p>
          </div>
        </div>

        {/* THE PROGRESS BAR */}
        <div className="relative w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-400 transition-all duration-700 ease-out rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
            style={{ width: `${progressData.percentage}%` }}
          />
        </div>

        <div className="flex justify-between mt-3">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            Current Target:{" "}
            <span className="text-slate-400 font-mono">
              {progressData.lastEmail || "Initializing..."}
            </span>
          </p>
          <p className="text-[9px] font-black text-indigo-500/80 uppercase">
            {progressData.percentage}% Completed
          </p>
        </div>
        {status === AppStatus.PROCESSING && (
          <div className="flex gap-4 mt-6">
            <button
              onClick={togglePause}
              className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all border ${
                isPaused
                  ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                  : "bg-amber-600/20 border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-white"
              }`}
            >
              <i
                className={`fas ${isPaused ? "fa-play" : "fa-pause"} mr-2`}
              ></i>
              {isPaused ? "Continue Dispatch" : "Pause Dispatch"}
            </button>
          </div>
        )}
      </div>

      {/* --- VISUALIZATION QUEUE --- */}
      {/* {batchPlans?.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center select-none py-20">
          <i className="fas fa-satellite text-[10rem] mb-8"></i>
          <p className="text-2xl font-black uppercase tracking-[0.4em]">
            Ready for Dispatch
          </p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-4 custom-scrollbar flex-1 max-h-[400px] mt-4 border-t border-slate-800/50 pt-6">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <i className="fas fa-list-check"></i> Round-Robin Sequence
          </p>
          {batchPlans?.map((plan, idx) => {
            const isFiringNow =
              status === AppStatus.PROCESSING && currentBatchIndex === idx;
            const progress = senderProgress[idx] || 0;
            const isComplete =
              progress >= plan.receivers.length && plan.receivers.length > 0;
            const cardStateClass = isFiringNow
              ? "bg-indigo-600/10 border-indigo-500/40 shadow-2xl scale-[1.01]"
              : isComplete
                ? "bg-emerald-900/10 border-emerald-500/20 opacity-75"
                : "bg-slate-900/20 border-white/5 opacity-50";

            return (
              <div
                key={idx}
                className={`p-6 rounded-3xl border transition-all duration-300 ${cardStateClass}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/5 ${isFiringNow ? "bg-indigo-600 text-white animate-pulse" : isComplete ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-800 text-slate-600"}`}
                    >
                      <i
                        className={`fas ${isComplete ? "fa-check-double" : isFiringNow ? "fa-paper-plane" : "fa-server"}`}
                      ></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">
                        MedLock Node {idx + 1}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tight truncate max-w-[250px]">
                        {plan.sender.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-600 uppercase mb-1">
                      Assigned
                    </p>
                    <p className="text-xl font-black text-slate-400">
                      {plan.receivers.length}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>
                      Relaying: {progress} / {plan.receivers.length}
                    </span>
                    <span
                      className={
                        isFiringNow
                          ? "text-indigo-400 font-black"
                          : "text-slate-600"
                      }
                    >
                      {plan.receivers.length > 0
                        ? Math.round((progress / plan.receivers.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-600 to-blue-500"}`}
                      style={{
                        width: `${plan.receivers.length > 0 ? (progress / plan.receivers.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )} */}
    </div>
  );
}
