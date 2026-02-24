import React, { useState, useCallback, useMemo } from "react";

// --- MOCKED DEPENDENCIES FOR PREVIEW ---
export enum AppStatus {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED"
}
export interface Sender { email: string; name?: string; }
export interface Receiver { email: string; name?: string; }
export interface BatchPlan { sender: Sender; receivers: Receiver[]; status: string; progress: number; }
export interface LogEntry { id: string; timestamp: Date; level: "info" | "warning" | "error" | "success"; message: string; }

// Mock the backend send function
const sendEmail = async (params: any) => new Promise(resolve => setTimeout(resolve, 600));
const uuidv4 = () => crypto.randomUUID();

// Mock Context to supply data for preview
const useMail = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
  const [throughput, setThroughput] = useState(0);

  return {
    receivers: Array.from({ length: 45 }).map((_, i) => ({ email: `client${i+1}@domain.com`, name: `Client ${i+1}` })),
    senders: [
      { email: "node1@secure.local" }, 
      { email: "node2@secure.local" },
      { email: "node3@relay.net" },
      { email: "node4@relay.net" }
    ],
    logs, setLogs, htmlTemplate: "", throughput, setThroughput, setBackendLogs, sendLimit: 50,
  };
};

// --- MAIN APP COMPONENT ---
export default function SendEmail() {
  const {
    receivers,
    logs,
    setLogs,
    senders,
    htmlTemplate,
    throughput,
    setThroughput,
    setBackendLogs,
    sendLimit,
  } = useMail();

  // State: App Flow
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);

  // State: Content
  const [senderNames, setSenderNames] = useState(
    "PayPal Billing\nSecure Services\nAccount Manager for {name}"
  );

  const [emailSubject, setEmailSubject] = useState(
    "Your Digital Invoice - {invoice}\nInvoice #{invoice} for {name}\nNew Document: {invoice}",
  );
  
  const [emailBody, setEmailBody] = useState(`Hello {name},

Please find your secure digital invoice ({invoice}) attached to this email. 

Details:
- Issued to: {name}
- Email: {email}
- Date: {date}

Thank you for choosing McaFee Secure Services.

Best Regards,
The PayPal Team`);

  // State: Progress Tracking
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0); 
  const [senderProgress, setSenderProgress] = useState<Record<number, number>>({});

  // --- LOGGING UTILITY ---
  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info", isBackend = false) => {
      const newLog = { id: uuidv4(), timestamp: new Date(), level, message };
      if (isBackend) {
        setBackendLogs((prev: any) => [newLog, ...prev].slice(0, 50));
      }
    },
    [setBackendLogs]
  );

  // --- HELPERS ---
  const generateInvoiceNumber = () =>
    Math.floor(1000000000 + Math.random() * 9000000000).toString();

  const generateCurrentDate = () =>
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const injectVariables = (content: string, vars: Record<string, string>) => {
    let result = content;
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, value || "");
    });
    return result;
  };

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
    if (batchPlans.length === 0) return;
    setStatus(AppStatus.PROCESSING);
    setSenderProgress({});
    addLog("RELAY: Initializing Round-Robin distribution...", "warning");

    const startTimestamp = Date.now();
    let totalSent = 0;

    // 1. PREPARE SUBJECTS & SENDER NAMES
    const subjectTemplates = emailSubject.split("\n").filter(s => s.trim() !== "");
    const senderNameTemplates = senderNames.split("\n").filter(s => s.trim() !== "");
    
    if (subjectTemplates.length === 0) {
        addLog("Error: No subjects defined.", "error");
        setStatus(AppStatus.IDLE);
        return;
    }

    const maxQueueLength = Math.max(...batchPlans.map((p) => p.receivers.length));

    // Outer Loop: Email Index
    for (let i = 0; i < maxQueueLength; i++) {
      // Inner Loop: Senders
      for (let sIdx = 0; sIdx < batchPlans.length; sIdx++) {
        const batch = batchPlans[sIdx];
        if (i >= batch.receivers.length) continue;

        setCurrentBatchIndex(sIdx);
        const rec = batch.receivers[i];

        try {
          const invoice = generateInvoiceNumber();
          const currentDateStr = generateCurrentDate();

          const vars = {
            name: rec.name || "Valued Client",
            email: rec.email,
            invoice: invoice,
            date: currentDateStr,
          };

          // 2. ROTATE SUBJECT & SENDER NAME
          const rawSubject = subjectTemplates[totalSent % subjectTemplates.length];
          const personalizedSubject = injectVariables(rawSubject, vars);

          let personalizedSenderName = "";
          if (senderNameTemplates.length > 0) {
            const rawSenderName = senderNameTemplates[totalSent % senderNameTemplates.length];
            personalizedSenderName = injectVariables(rawSenderName, vars);
          }

          // Prepare Body
          const messageBody = injectVariables(emailBody, vars);
          let htmlBody = "";
          if (htmlTemplate) {
            htmlBody = injectVariables(htmlTemplate, vars);
          }

          // Send
          await sendEmail({
            sender: { ...batch.sender, name: personalizedSenderName },
            receiver: rec,
            subject: personalizedSubject,
            body: messageBody,
            html: htmlBody, 
          });

          // Update Stats
          totalSent++;
          const elapsedSec = (Date.now() - startTimestamp) / 1000;
          setThroughput(Math.round((totalSent / elapsedSec) * 60));

          setSenderProgress((prev) => ({ ...prev, [sIdx]: i + 1 }));

          if ((i + 1) % 5 === 0) {
            addLog(`Success: [${batch.sender.email}] -> ${rec.email}`, "success", true);
          } else {
            addLog(`Sent: ${rec.email} | Subj: "${personalizedSubject.substring(0, 15)}..."`, "info", false);
          }
        } catch (err: any) {
          addLog(`Failure: [${batch.sender.email}] -> ${rec.email} : ${err.message}`, "error", true);
        }

        // Delay
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    setStatus(AppStatus.COMPLETED);
    addLog("RELAY: Round-Robin Campaign complete.", "success");
  };

  return (
    <div className="bg-[#020617] min-h-screen p-4 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-6 w-full mr-4">
            
            {/* --- SENDER NAME ROTATOR --- */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-id-badge text-indigo-500"></i> Sender Name Rotator
                </label>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">
                   {senderNames.split('\n').filter(s => s.trim()).length} Variations
                </span>
              </div>
              
              <textarea
                value={senderNames}
                onChange={(e) => setSenderNames(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-base font-bold text-slate-300 focus:border-indigo-500 outline-none transition-all shadow-inner h-[80px] custom-scrollbar"
                placeholder="Enter sender names (one per line)...&#10;Billing Dept&#10;Support Team"
                spellCheck={false}
              />
            </div>

            {/* --- SUBJECT INPUT ROTATOR --- */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-pen-fancy text-indigo-500"></i> Subject Rotator
                </label>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">
                   {emailSubject.split('\n').filter(s => s.trim()).length} Variations
                </span>
              </div>
              
              <textarea
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-lg font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner h-[100px] custom-scrollbar"
                placeholder="Enter subjects (one per line)...&#10;Invoice {invoice}&#10;Hello {name}, Check this {invoice}"
                spellCheck={false}
              />
              <p className="ml-4 text-[9px] text-slate-600 font-medium">
                 * Enter multiple subjects on separate lines to rotate them round-robin.
              </p>
            </div>

            {/* Body Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 flex items-center gap-2">
                <i className="fas fa-align-left text-indigo-500"></i> Email Content
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
                Dynamic Injection Keys (Works in Subject & Body)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { key: "{name}", desc: "Recipient Name" },
                  { key: "{email}", desc: "Recipient Email" },
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

        {/* --- MODIFIED: VISUALIZATION QUEUE WITH FIXED SCROLL --- */}
        {batchPlans?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center select-none py-20">
            <i className="fas fa-satellite text-[10rem] mb-8"></i>
            <p className="text-2xl font-black uppercase tracking-[0.4em]">
              Ready for Dispatch
            </p>
            <p className="text-[10px] mt-4 uppercase font-black tracking-widest text-indigo-400">
              Load assets to generate queue
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
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/5 ${
                          isFiringNow
                            ? "bg-indigo-600 text-white animate-pulse"
                            : isComplete
                            ? "bg-emerald-600/20 text-emerald-400"
                            : "bg-slate-800 text-slate-600"
                        }`}
                      >
                        <i
                          className={`fas ${
                            isComplete
                              ? "fa-check-double"
                              : isFiringNow
                              ? "fa-paper-plane"
                              : "fa-server"
                          }`}
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
                          isFiringNow ? "text-indigo-400 font-black" : "text-slate-600"
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
                        className={`h-full transition-all duration-500 ${
                          isComplete
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-indigo-600 to-blue-500"
                        }`}
                        style={{
                          width: `${
                            plan.receivers.length > 0
                              ? (progress / plan.receivers.length) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}