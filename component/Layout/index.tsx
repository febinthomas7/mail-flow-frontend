import React, { useState, useCallback, useMemo } from "react";
import { Sender, Receiver, BatchPlan, LogEntry, AppStatus } from "../../types";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { useMail } from "@/utils/MailContext";
import { Link, useLocation } from "react-router-dom";

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
const Layout = ({ children }) => {
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

  // Navigation State
  const location = useLocation();

  // State: Files & Assets
  const [senderFileName, setSenderFileName] = useState<string>("");
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templateFileName, setTemplateFileName] = useState<string>("");

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
    console.log("Uploading template file:", file);
    // 2. Set the file name immediately
    setTemplateFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlTemplate(content);

      // 3. Update the log to include the name
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
            <Link
              to="/send-email"
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === "/send-email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              Dispatcher
            </Link>
            <Link
              to="/verify-email"
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === "/verify-email" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
            >
              SMTP Verifier
            </Link>
            <Link
              to="/verify-target"
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === "/verify-target" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
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
                {backendLogs?.length === 0 ? (
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
          <div className="lg:col-span-8 space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
