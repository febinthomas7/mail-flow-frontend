import React, { useState, useCallback, useMemo } from "react";
import { Sender, Receiver, BatchPlan, LogEntry, AppStatus } from "./types";
import { sendEmail, verifySmtpCredential } from "./services/emailService";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";

// Declare html2pdf for TypeScript if using the CDN/external script
declare const html2pdf: any;

// --- COMPONENT: STAT CARD ---
const StatCard = ({
  title,
  value,
  icon,
  color,
  subValue,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subValue?: string;
}) => (
  <div className="glass p-5 rounded-2xl flex items-center gap-4 flex-1 border-slate-800/50 hover:border-slate-700 transition-all group">
    <div
      className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform`}
    >
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="overflow-hidden">
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
        {title}
      </p>
      <h3 className="text-2xl font-black text-white leading-tight truncate">
        {value}
      </h3>
      {subValue && (
        <p className="text-[10px] text-slate-400 font-mono truncate italic opacity-60">
          {subValue}
        </p>
      )}
    </div>
  </div>
);

// --- COMPONENT: FILE DROP ZONE ---
const FileDropZone = ({
  id,
  label,
  icon,
  color,
  onFile,
  loading = false,
  fileName,
  count,
}: {
  id: string;
  label: string;
  icon: string;
  color: string;
  onFile: (file: File) => void;
  loading?: boolean;
  fileName?: string;
  count?: number;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative group transition-all duration-300 ${isDragging ? "scale-[1.02]" : ""}`}
    >
      <input
        type="file"
        id={id}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <label
        htmlFor={id}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${
          fileName
            ? `bg-${color}-500/5 border-${color}-500/50 shadow-inner`
            : isDragging
              ? `bg-${color}-500/10 border-${color}-500 shadow-2xl`
              : `bg-slate-900/40 border-slate-800 group-hover:border-slate-700 hover:bg-slate-900/60`
        }`}
      >
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3 relative ${
            fileName
              ? `bg-${color}-500 text-white`
              : isDragging
                ? `bg-${color}-500 text-white shadow-lg`
                : `bg-slate-800 text-slate-400 group-hover:text-slate-200 transition-colors`
          }`}
        >
          {loading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className={`fas ${fileName ? "fa-check" : icon}`}></i>
          )}
          {count !== undefined && count > 0 && (
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-950">
              {count}
            </span>
          )}
        </div>
        <span
          className={`text-[11px] font-black uppercase tracking-widest ${fileName ? `text-${color}-400` : "text-slate-400 group-hover:text-slate-200"} transition-colors text-center`}
        >
          {fileName
            ? fileName.length > 20
              ? fileName.substring(0, 17) + "..."
              : fileName
            : label}
        </span>
        <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          {fileName ? "Drop to Update" : "Drop File or Click"}
        </p>
      </label>
    </div>
  );
};

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
    if (senders.length === 0) return;
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
          disabled={verifying || senders.length === 0}
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
        {senders.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <i className="fas fa-server text-6xl mb-4 text-slate-500"></i>
            <p className="font-bold uppercase text-slate-400">
              No Senders Loaded
            </p>
          </div>
        ) : (
          senders.map((sender, idx) => {
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
const App: React.FC = () => {
  // Navigation State
  const [showVerifier, setShowVerifier] = useState(false);

  // State: Data
  const [senders, setSenders] = useState<Sender[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);

  // State: App Flow
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
  const [sendLimit, setSendLimit] = useState<number>(100);

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

  // State: Files & Assets
  const [htmlTemplate, setHtmlTemplate] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const [senderFileName, setSenderFileName] = useState<string>("");
  const [receiverFileName, setReceiverFileName] = useState<string>("");
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  // State: Progress Tracking (Round-Robin specific)
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0); // Tracks which sender is currently "firing"
  const [senderProgress, setSenderProgress] = useState<Record<number, number>>(
    {},
  ); // Tracks progress per sender
  const [throughput, setThroughput] = useState(0);

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

  const parseDataFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const extension = file.name.split(".").pop()?.toLowerCase();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (extension === "json") resolve(JSON.parse(data as string));
          else {
            const workbook = XLSX.read(data, { type: "binary" });
            resolve(
              XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]),
            );
          }
        } catch (err) {
          reject(err);
        }
      };
      if (extension === "json") reader.readAsText(file);
      else reader.readAsBinaryString(file);
    });
  };

  const mapObjectKeys = (obj: any, mapping: Record<string, string>) => {
    const newObj: any = {};
    const objKeys = Object.keys(obj);
    Object.entries(mapping).forEach(([internalKey, possibleNames]) => {
      const names = possibleNames.split("|");
      const foundKey = objKeys.find((k) =>
        names.some((n) => k.toLowerCase() === n.toLowerCase()),
      );
      if (foundKey) newObj[internalKey] = obj[foundKey];
    });
    return newObj;
  };

  const injectVariables = (content: string, vars: Record<string, string>) => {
    let result = content;
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, value || "");
    });
    return result;
  };

  // --- HANDLERS ---
  const handleSenderUpload = async (file: File) => {
    try {
      const rawData = await parseDataFile(file);
      const mapped = rawData.map((item) =>
        mapObjectKeys(item, {
          email: "email|mail|address",
          name: "name|sender|from",
          host: "host|server|smtp_host",
          port: "port|smtp_port",
          username: "username|user|login",
          password: "password|pass|secret",
        }),
      ) as Sender[];
      const valid = mapped.filter(
        (s) => s.email || s.username || s.password || s.host,
      );
      setSenders(valid);
      setSenderFileName(file.name);
      addLog(
        `Nodes: ${valid.length} senders authenticated from ${file.name}.`,
        "success",
      );
    } catch (err) {
      addLog(`Error: Failed to process sender dataset`, "error");
    }
  };

  const handleReceiverUpload = async (file: File) => {
    try {
      const rawData = await parseDataFile(file);
      const mapped = rawData.map((item) =>
        mapObjectKeys(item, {
          email: "email|mail|address|recipient",
          name: "name|receiver|to|full_name",
          company: "company|organization|org|business",
        }),
      ) as Receiver[];
      const valid = mapped.filter((r) => r.email);
      setReceivers(valid);
      setReceiverFileName(file.name);
      addLog(
        `Targets: ${valid.length} recipients loaded from ${file.name}.`,
        "success",
      );
    } catch (err) {
      addLog(`Error: Failed to process recipient dataset`, "error");
    }
  };

  const handleHtmlTemplateUpload = (file: File) => {
    setIsTemplateLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlTemplate(content);

      addLog(`Template: HTML email body configured.`, "success");
      setIsTemplateLoading(false);
    };
    reader.readAsText(file);
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
          const personalizedBody = injectVariables(emailBody, vars);

          // Prepare PDF
          let attachment = undefined;
          if (htmlTemplate) {
            const injectedHtml = injectVariables(htmlTemplate, vars);
            const el = document.createElement("div");
            el.innerHTML = injectedHtml;
            const opt = {
              margin: 0.5,
              html2canvas: { scale: 2 },
              jsPDF: { unit: "in", format: "letter" },
            };
            const blob = await html2pdf().from(el).set(opt).output("blob");
            const base64 = await new Promise((res) => {
              const r = new FileReader();
              r.onloadend = () => res((r.result as string).split(",")[1]);
              r.readAsDataURL(blob);
            });

            attachment = {
              content: base64 as string,
              // CHANGED: Filename is now the invoice number + .pdf
              filename: `${invoice}.pdf`,
              type: "application/pdf",
            };
          }

          // Send
          await sendEmail({
            sender: batch.sender,
            receiver: rec,
            subject: personalizedSubject,
            body: personalizedBody,
            attachment,
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
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-3xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(79,70,229,0.3)] border border-white/10">
              <i className="fas fa-heart-pulse text-2xl animate-pulse"></i>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
                Alam <span className="text-indigo-500">Secure</span>
              </h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">
                Email Dispatcher
              </p>
            </div>
          </div>

          <div className="flex bg-slate-900/60 p-2 rounded-2xl border border-white/5 shadow-2xl">
            <button
              onClick={() => setShowVerifier(false)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showVerifier ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              Dispatcher
            </button>
            <button
              onClick={() => setShowVerifier(true)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showVerifier ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              SMTP Verifier
            </button>
          </div>
        </header>

        {/* STATS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="SMTP CLUSTER"
            value={senders.length}
            icon="fa-server"
            color="bg-indigo-500/10 text-indigo-400"
            subValue="Active Relay Nodes"
          />
          <StatCard
            title="RECIPIENT LIST"
            value={receivers.length}
            icon="fa-users"
            color="bg-emerald-500/10 text-emerald-400"
            subValue="Targets Loaded"
          />
          <StatCard
            title="VELOCITY"
            value={`${throughput} m/m`}
            icon="fa-bolt"
            color="bg-amber-500/10 text-amber-400"
            subValue="Flow Rate"
          />
          <StatCard
            title="BATCH LIMIT"
            value={sendLimit}
            icon="fa-rotate"
            color="bg-blue-500/10 text-blue-400"
            subValue="Recipients per Sender"
          />
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT COLUMN: ASSETS & LOGS */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 rounded-[2.5rem] space-y-8 border-white/5 relative overflow-hidden">
              <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                <i className="fas fa-file-import text-indigo-500"></i> Assets
              </h2>

              <div className="space-y-4">
                <div className="p-5 bg-black/40 rounded-2xl border border-slate-800 group focus-within:border-indigo-500 transition-colors">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">
                    Sender Limit (Load Balancing)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={sendLimit}
                      onChange={(e) =>
                        setSendLimit(Math.max(1, Number(e.target.value)))
                      }
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white font-bold outline-none group-focus-within:bg-black transition-all"
                    />
                    <span className="text-[10px] font-black text-slate-600 uppercase">
                      Mails/Node
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <FileDropZone
                  id="sender-file"
                  label="1. Senders (JSON/CSV)"
                  icon="fa-key"
                  color="indigo"
                  onFile={handleSenderUpload}
                  fileName={senderFileName}
                  count={senders.length}
                />
                <FileDropZone
                  id="target-file"
                  label="2. Recipients (CSV)"
                  icon="fa-users"
                  color="blue"
                  onFile={handleReceiverUpload}
                  fileName={receiverFileName}
                  count={receivers.length}
                />
                <FileDropZone
                  id="html-file"
                  label="3. HTML Template"
                  icon="fa-file-code"
                  color="rose"
                  onFile={handleHtmlTemplateUpload}
                  loading={isTemplateLoading}
                  fileName={pdfName ? `Sync: ${pdfName}` : ""}
                />
              </div>
            </div>

            <div className="glass p-8 rounded-[2.5rem] bg-black/20 border-white/5">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-6 flex items-center justify-between">
                <span>Relay Logs</span>
                <i className="fas fa-terminal opacity-50"></i>
              </h3>
              <div className="bg-black/95 rounded-2xl p-5 h-64 font-mono text-[9px] overflow-y-auto custom-scrollbar border border-slate-800/50 shadow-inner">
                {backendLogs.length === 0 ? (
                  <div className="text-slate-800 flex items-center justify-center h-full italic select-none">
                    Ready for sequence start...
                  </div>
                ) : (
                  backendLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border-b border-slate-900 py-2 flex gap-3 animate-in fade-in slide-in-from-left-2"
                    >
                      <span
                        className={`font-black flex-shrink-0 ${log.level === "error" ? "text-rose-500" : "text-emerald-500"}`}
                      >
                        [{log.level[0].toUpperCase()}]
                      </span>
                      <span className="text-slate-400 leading-relaxed">
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: EDITOR OR VERIFIER */}
          <div className="lg:col-span-8 space-y-8">
            {showVerifier ? (
              // --- VIEW: SMTP VERIFIER ---
              <SmtpVerifier senders={senders} addLog={addLog} />
            ) : (
              // --- VIEW: CAMPAIGN EDITOR (Existing) ---
              <div className="glass rounded-[3.5rem] p-10 min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-6 w-full mr-4">
                    {/* Subject Input */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 flex items-center gap-2">
                        <i className="fas fa-pen-fancy text-indigo-500"></i>{" "}
                        Email Subject
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
                        <i className="fas fa-align-left text-indigo-500"></i>{" "}
                        Email Content
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
                          status === AppStatus.PROCESSING ||
                          batchPlans.length === 0
                        }
                        className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          status === AppStatus.PROCESSING ||
                          batchPlans.length === 0
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
                {batchPlans.length === 0 ? (
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

                    {batchPlans.map((plan, idx) => {
                      // Check if this specific node is currently the one firing in the loop
                      const isFiringNow =
                        status === AppStatus.PROCESSING &&
                        currentBatchIndex === idx;

                      // Retrieve individual progress from state, or default to 0
                      const progress = senderProgress[idx] || 0;

                      // Check if this node is fully complete
                      const isComplete =
                        progress >= plan.receivers.length &&
                        plan.receivers.length > 0;

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
                                  ? Math.round(
                                      (progress / plan.receivers.length) * 100,
                                    )
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
