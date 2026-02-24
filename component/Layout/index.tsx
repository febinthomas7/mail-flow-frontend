import React, { useState, useCallback, useMemo, useEffect } from "react";

// --- MOCKED DEPENDENCIES FOR PREVIEW ---
export interface Sender { email: string; name?: string; host?: string; port?: string; username?: string; password?: string; }
export interface Receiver { email: string; name?: string; company?: string; }
export interface LogEntry { id: string; timestamp: Date; level: "info" | "warning" | "error" | "success"; message: string; }
export enum AppStatus { IDLE = "IDLE", PROCESSING = "PROCESSING", COMPLETED = "COMPLETED" }

const uuidv4 = () => crypto.randomUUID();

// Interactive Mock for react-router-dom
let currentRoute = "/send-email";
const routeListeners = new Set<() => void>();
const navigate = (path: string) => { 
  currentRoute = path; 
  routeListeners.forEach(fn => fn()); 
};

const Link = ({ children, to, className }: any) => (
  <a href={to} onClick={(e) => { e.preventDefault(); navigate(to); }} className={className}>
    {children}
  </a>
);

const useLocation = () => {
  const [loc, setLoc] = useState({ pathname: currentRoute });
  useEffect(() => {
    const update = () => setLoc({ pathname: currentRoute });
    routeListeners.add(update);
    return () => { routeListeners.delete(update); };
  }, []);
  return loc;
};

// Mock XLSX for preview compilation
const XLSX = {
  read: (data: any, opts: any) => ({ Sheets: { Sheet1: {} }, SheetNames: ["Sheet1"] }),
  utils: { sheet_to_json: (sheet: any) => [] as any[] }
};

// Mock MailContext
const useMail = () => {
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [receiverFileName, setReceiverFileName] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState("");
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
  const [pdfName, setPdfName] = useState("");
  const [throughput, setThroughput] = useState(0);
  const [sendLimit, setSendLimit] = useState(50);

  return {
    receivers, setReceivers,
    logs, setLogs,
    senders, setSenders,
    receiverFileName, setReceiverFileName,
    htmlTemplate, setHtmlTemplate,
    backendLogs, setBackendLogs,
    pdfName, setPdfName,
    throughput, setThroughput,
    sendLimit, setSendLimit,
  };
};

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
    console.log("File dropped:", e.dataTransfer.files);
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

// --- MAIN APP COMPONENT ---
export default function Layout({ children }: any) {
  const {
    receivers,
    setReceivers,
    logs,
    setLogs,
    senders,
    setSenders,
    receiverFileName,
    setReceiverFileName,
    htmlTemplate,
    setHtmlTemplate,
    backendLogs,
    setBackendLogs,
    pdfName,
    setPdfName,
    throughput,
    setThroughput,
    sendLimit,
    setSendLimit,
  } = useMail();

  // State: Files & Assets
  const [senderFileName, setSenderFileName] = useState<string>("");
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templateFileName, setTemplateFileName] = useState<string>("");
  
  // State: Delivery Format Selection
  const [deliveryFormat, setDeliveryFormat] = useState<string>("html");
  
  // State: Recipient Management (Manual + File)
  const [recMode, setRecMode] = useState<"text" | "file">("text");
  const [manualText, setManualText] = useState("demo1@secure.local\ndemo2@secure.local\nclient@domain.com");
  const [fileReceivers, setFileReceivers] = useState<Receiver[]>([]);

  // State: HTML Template Management (Manual + File)
  const [htmlMode, setHtmlMode] = useState<"text" | "file">("file");

  // State: SMTP Provider Type (Removed Custom, Default to Gmail)
  const [smtpType, setSmtpType] = useState<string>("gmail");

  // Format options mapping
  const formatOptions = [
    { id: "html", label: "Direct HTML", icon: "fa-code" },
    { id: "pdf", label: "HTML - PDF", icon: "fa-file-pdf" },
    { id: "word", label: "HTML - Word", icon: "fa-file-word" },
    { id: "png", label: "HTML - PNG", icon: "fa-file-image" },
  ];

  // --- MERGE MANUAL EMAILS & FILE EMAILS ---
  useEffect(() => {
    // 1. Parse manual emails
    const manualEmails = manualText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s !== "");
    
    const manualMapped = manualEmails.map((email) => ({
      email,
      name: email.split("@")[0], // Basic fallback name
    }));

    // 2. Combine with file uploads and deduplicate by email
    const combined = [...fileReceivers, ...manualMapped];
    const unique = Array.from(new Map(combined.map((r) => [r.email, r])).values());

    setReceivers(unique);
  }, [manualText, fileReceivers, setReceivers]);


  // --- LOGGING UTILITY ---
  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info", isBackend = false) => {
      const newLog = { id: uuidv4(), timestamp: new Date(), level, message };
      if (isBackend) {
        setBackendLogs((prev: any) => [newLog, ...prev].slice(0, 50));
      }
    },
    [setBackendLogs],
  );

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
      setFileReceivers(valid); // Keep track of file receivers independently
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
    console.log("Uploading template file:", file);
    setTemplateFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlTemplate(content);
      addLog(`Template: HTML email body "${file.name}" configured.`, "success");
      setIsTemplateLoading(false);
    };

    reader.onerror = () => {
      addLog(`Error: Could not read template file.`, "error");
      setIsTemplateLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            {/* LOGOUT BUTTON - TOP LEFT */}
            <button 
              onClick={() => alert("Logout clicked")}
              className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 shadow-lg"
            >
              <i className="fas fa-sign-out-alt md:mr-2"></i>
              <span className="hidden md:inline">Logout</span>
            </button>

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

          {/* NAVIGATION LINKS */}
          <div className="flex bg-slate-900/60 p-2 rounded-2xl border border-white/5 shadow-2xl overflow-x-auto max-w-full">
            <Link
              to="/send-email"
              className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/send-email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              Dispatcher
            </Link>
            <Link
              to="/verify-email"
              className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/verify-email" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              SMTP Verifier
            </Link>
            <Link
              to="/verify-target"
              className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/verify-target" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              Target Verifier
            </Link>
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
                
                {/* DELIVERY FORMAT SELECTOR */}
                <div className="p-5 bg-black/40 rounded-2xl border border-slate-800 transition-colors">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3">
                    Delivery Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {formatOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDeliveryFormat(opt.id)}
                        className={`py-2 px-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                          deliveryFormat === opt.id
                            ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <i className={`fas ${opt.icon} text-sm mb-1`}></i>
                        <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* 1. Senders & SMTP Type */}
                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    {[
                      { id: "gmail", label: "Gmail", icon: "fab fa-google" },
                      { id: "outlook", label: "Outlook", icon: "fab fa-windows" },
                      { id: "icloud", label: "iCloud", icon: "fab fa-apple" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSmtpType(opt.id)}
                        className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${
                          smtpType === opt.id
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                        }`}
                      >
                        <i className={`${opt.icon} text-sm`}></i>
                        <span className="text-[8px] font-black uppercase tracking-wider">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <FileDropZone
                    id="sender-file"
                    label="1. Senders (JSON/CSV)"
                    icon="fa-key"
                    color="indigo"
                    onFile={handleSenderUpload}
                    fileName={senderFileName}
                    count={senders.length}
                  />
                </div>

                {/* 2. RECIPIENTS (Manual + CSV Toggles) */}
                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    <button
                      onClick={() => setRecMode("text")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                        recMode === "text"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      Manual List
                    </button>
                    <button
                      onClick={() => setRecMode("file")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                        recMode === "file"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      CSV / JSON
                    </button>
                  </div>

                  {recMode === "text" ? (
                    <div className="relative group">
                      <textarea
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="Enter emails (one per line)...&#10;client1@domain.com&#10;client2@domain.com"
                        className="w-full bg-slate-900/40 border-2 border-slate-800 group-hover:border-slate-700 rounded-[2rem] p-6 text-xs font-mono text-slate-300 focus:border-blue-500 outline-none transition-all shadow-inner h-[132px] custom-scrollbar"
                        spellCheck={false}
                      />
                      {receivers.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-950 pointer-events-none">
                          {receivers.length}
                        </span>
                      )}
                    </div>
                  ) : (
                    <FileDropZone
                      id="target-file"
                      label="2. Recipients (CSV)"
                      icon="fa-users"
                      color="blue"
                      onFile={handleReceiverUpload}
                      fileName={receiverFileName}
                      count={receivers.length}
                    />
                  )}
                </div>

                {/* 3. HTML TEMPLATE (Manual + File Toggles) */}
                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    <button
                      onClick={() => setHtmlMode("text")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                        htmlMode === "text"
                          ? "bg-rose-600 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      Raw HTML
                    </button>
                    <button
                      onClick={() => setHtmlMode("file")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                        htmlMode === "file"
                          ? "bg-rose-600 text-white shadow-md"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      HTML File
                    </button>
                  </div>

                  {htmlMode === "text" ? (
                    <div className="relative group">
                      <textarea
                        value={htmlTemplate}
                        onChange={(e) => setHtmlTemplate(e.target.value)}
                        placeholder="<html>&#10;  <body>&#10;    <h1>Hello {name}</h1>&#10;  </body>&#10;</html>"
                        className="w-full bg-slate-900/40 border-2 border-slate-800 group-hover:border-slate-700 rounded-[2rem] p-6 text-xs font-mono text-slate-300 focus:border-rose-500 outline-none transition-all shadow-inner h-[132px] custom-scrollbar"
                        spellCheck={false}
                      />
                      {htmlTemplate.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-950 pointer-events-none">
                          {htmlTemplate.length} chars
                        </span>
                      )}
                    </div>
                  ) : (
                    <FileDropZone
                      id="html-file"
                      label="3. HTML Template"
                      icon="fa-file-code"
                      color="rose"
                      onFile={handleHtmlTemplateUpload}
                      loading={isTemplateLoading}
                      fileName={templateFileName || (pdfName ? `Sync: ${pdfName}` : "")}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-[2.5rem] bg-black/20 border-white/5">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-6 flex items-center justify-between">
                <span>Relay Logs</span>
                <i className="fas fa-terminal opacity-50"></i>
              </h3>
              <div className="bg-black/95 rounded-2xl p-5 h-64 font-mono text-[9px] overflow-y-auto custom-scrollbar border border-slate-800/50 shadow-inner">
                {backendLogs?.length === 0 ? (
                  <div className="text-slate-800 flex items-center justify-center h-full italic select-none">
                    Ready for sequence start...
                  </div>
                ) : (
                  backendLogs.map((log: any) => (
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
            {children ? (
              children
            ) : (
              <div className="glass p-10 rounded-[3.5rem] min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden">
                {location.pathname === "/send-email" && (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center select-none py-20 animate-in fade-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center mb-8 border border-indigo-500/20 shadow-[0_0_50px_rgba(79,70,229,0.2)]">
                      <i className="fas fa-paper-plane text-6xl text-indigo-400"></i>
                    </div>
                    <p className="text-3xl font-black uppercase tracking-[0.3em] text-white">Dispatcher</p>
                    <p className="text-xs mt-4 uppercase font-bold tracking-widest text-indigo-400 max-w-sm">
                      Ready for Dispatch. Load your assets on the left to begin the sequence.
                    </p>
                  </div>
                )}
                {location.pathname === "/verify-email" && (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center select-none py-20 animate-in fade-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                      <i className="fas fa-shield-check text-6xl text-emerald-400"></i>
                    </div>
                    <p className="text-3xl font-black uppercase tracking-[0.3em] text-white">SMTP Verifier</p>
                    <p className="text-xs mt-4 uppercase font-bold tracking-widest text-emerald-400 max-w-sm">
                      Route active. Node validation module will mount here.
                    </p>
                  </div>
                )}
                {location.pathname === "/verify-target" && (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center select-none py-20 animate-in fade-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                      <i className="fas fa-bullseye text-6xl text-blue-400"></i>
                    </div>
                    <p className="text-3xl font-black uppercase tracking-[0.3em] text-white">Target Verifier</p>
                    <p className="text-xs mt-4 uppercase font-bold tracking-widest text-blue-400 max-w-sm">
                      Route active. Target sanitization module will mount here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}