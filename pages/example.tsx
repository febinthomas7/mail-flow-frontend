import React, { useState, useCallback, useMemo } from "react";
import { Sender, Receiver, BatchPlan, LogEntry, AppStatus } from "../../types";
import { sendEmail, verifySmtpCredential } from "../../services/emailService";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { useMail } from "@/utils/MailContext";
import { Link } from "react-router-dom";

// Declare html2pdf for TypeScript if using the CDN/external script
declare const html2pdf: any;

// --- MAIN APP COMPONENT ---
const SendEmail = () => {
  const {
    receivers,
    setReceivers,
    logs,
    setLogs,
    receiverFileName,
    setReceiverFileName,
    senders,
    setSenders,
    htmlTemplate,
    setHtmlTemplate,
    backendLogs,
    throughput,
    setThroughput,
    setBackendLogs,
    sendLimit,
    setSendLimit,
  } = useMail();
  // Navigation State

  // State: Data

  // State: App Flow
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);

  // State: Content
  const [emailSubject, setEmailSubject] = useState(
    "Your Digital Invoice - {invoice}",
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

  // State: Progress Tracking (Round-Robin specific)
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0); // Tracks which sender is currently "firing"
  const [senderProgress, setSenderProgress] = useState<Record<number, number>>(
    {},
  ); // Tracks progress per sender

  // --- LOGGING UTILITY ---
  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info", isBackend = false) => {
      const newLog = { id: uuidv4(), timestamp: new Date(), level, message };
      if (isBackend) {
        setBackendLogs((prev) => [newLog, ...prev].slice(0, 50));
      }
    },
    [],
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

    // 1. Initialize empty plans for each sender
    const plans = senders.map((sender) => ({
      sender,
      receivers: [],
      status: "pending",
      progress: 0,
    }));

    // 2. Distribute receivers Modulo style (1 for you, 1 for you...)
    receivers.forEach((receiver, index) => {
      const senderIndex = index % senders.length;

      // Respect the per-sender limit
      if (plans[senderIndex].receivers.length < sendLimit) {
        plans[senderIndex].receivers.push(receiver);
      }
    });

    return plans;
  }, [senders, receivers, sendLimit]);

  // --- LOGIC: ROUND ROBIN EXECUTION ---
  const startCampaign = async () => {
    if (batchPlans.length === 0) return;
    setStatus(AppStatus.PROCESSING);
    setSenderProgress({}); // Reset progress bars
    addLog(
      "RELAY: Initializing MedLock Round-Robin distribution...",
      "warning",
    );

    const startTimestamp = Date.now();
    let totalSent = 0;

    // Find the longest queue to determine how many "rounds" of rotation needed
    const maxQueueLength = Math.max(
      ...batchPlans.map((p) => p.receivers.length),
    );

    // Outer Loop: The Email Index (1st email, 2nd email, 3rd email...)
    for (let i = 0; i < maxQueueLength; i++) {
      // Inner Loop: The Senders (Sender 0, Sender 1, Sender 2...)
      for (let sIdx = 0; sIdx < batchPlans.length; sIdx++) {
        const batch = batchPlans[sIdx];

        // If this sender is out of emails, skip them
        if (i >= batch.receivers.length) continue;

        setCurrentBatchIndex(sIdx); // For UI Highlighting
        const rec = batch.receivers[i];

        try {
          // Prepare Content
          const invoice = generateInvoiceNumber();
          const currentDateStr = generateCurrentDate();

          const vars = {
            name: rec.name || "Valued Client",
            email: rec.email,
            invoice: invoice,
            date: currentDateStr,
          };

          const personalizedSubject = injectVariables(emailSubject, vars);

          // 1. Prepare the Personal Message from the textarea
          const messageBody = injectVariables(emailBody, vars);
          let htmlBody = "";
          if (htmlTemplate) {
            const personalizedTemplate = injectVariables(htmlTemplate, vars);
            htmlBody = personalizedTemplate;
          }

          // 3. Prepare the PDF (using ONLY the template content)
          let attachment = undefined;

          // 4. Send
          await sendEmail({
            sender: batch.sender,
            receiver: rec,
            subject: personalizedSubject,
            body: messageBody,
            html: htmlBody, // Now contains BOTH the message and the HTML template
            attachment: attachment,
          });

          // Update Stats
          totalSent++;
          const elapsedSec = (Date.now() - startTimestamp) / 1000;
          setThroughput(Math.round((totalSent / elapsedSec) * 60));

          // Update individual sender progress
          setSenderProgress((prev) => ({ ...prev, [sIdx]: i + 1 }));

          if ((i + 1) % 5 === 0) {
            addLog(
              `Success: [${batch.sender.email}] -> ${rec.email}`,
              "success",
              true,
            );
          } else {
            // Less verbose success log for every single email to avoid clutter,
            // but strictly logging failures
            addLog(`Sent: ${rec.email}`, "info", false);
          }
        } catch (err: any) {
          addLog(
            `Failure: [${batch.sender.email}] -> ${rec.email} : ${err.message}`,
            "error",
            true,
          );
        }

        // Delay between switching senders (Rotational Delay)
        // Adjust this for speed. 100ms means smooth rotation.
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    setStatus(AppStatus.COMPLETED);
    addLog("RELAY: Round-Robin Campaign complete.", "success");
  };

  return (
    <div className="lg:col-span-8 space-y-8">
      <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-6 w-full mr-4">
            {/* Subject Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 flex items-center gap-2">
                <i className="fas fa-pen-fancy text-indigo-500"></i> Email
                Subject
              </label>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 rounded-2xl p-4 text-lg font-black text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                placeholder="Subject..."
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
                className="w-full bg-black/40 border border-slate-800 rounded-3xl p-7 h-[350px] text-sm text-slate-300 custom-scrollbar font-medium focus:border-indigo-500 outline-none transition-all shadow-inner leading-relaxed"
              />
            </div>
            {/* Vars Helper */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-3">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                Dynamic Injection Keys
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

        {/* VISUALIZATION: ROUND ROBIN QUEUE */}
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
          <div className="space-y-4 overflow-y-auto pr-4 custom-scrollbar flex-1 max-h-[300px] mt-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-list-check"></i> Round-Robin Sequence
            </p>

            {batchPlans?.map((plan, idx) => {
              // Check if this specific node is currently the one firing in the loop
              const isFiringNow =
                status === AppStatus.PROCESSING && currentBatchIndex === idx;

              // Retrieve individual progress from state, or default to 0
              const progress = senderProgress[idx] || 0;

              // Check if this node is fully complete
              const isComplete =
                progress >= plan.receivers.length && plan.receivers.length > 0;

              // Determine styling state
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

                  {/* Always show progress bar in Round Robin mode so we see them fill up in parallel */}
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
        )}
      </div>
    </div>
  );
};

export default SendEmail;
