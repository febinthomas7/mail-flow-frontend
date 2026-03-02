import { useMail } from "@/utils/MailContext";
// import { LogOut } from "lucide-react";
import React, { useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import * as XLSX from "xlsx";
import WorldClocks from "../WorldClock";
// --- COMPONENT: STAT CARD ---
const StatCard = ({ title, value, icon, color, subValue }: any) => (
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
  fileName,
  count,
}: any) => {
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
    if (e.dataTransfer.files && e.dataTransfer.files[0])
      onFile(e.dataTransfer.files[0]);
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
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${fileName ? `bg-${color}-500/5 border-${color}-500/50 shadow-inner` : isDragging ? `bg-${color}-500/10 border-${color}-500 shadow-2xl` : `bg-slate-900/40 border-slate-800 group-hover:border-slate-700 hover:bg-slate-900/60`}`}
      >
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3 relative ${fileName ? `bg-${color}-500 text-white` : isDragging ? `bg-${color}-500 text-white shadow-lg` : `bg-slate-800 text-slate-400 group-hover:text-slate-200 transition-colors`}`}
        >
          <i className={`fas ${fileName ? "fa-check" : icon}`}></i>
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

// --- MAIN LAYOUT COMPONENT ---
export default function Layout({ children }: any) {
  const location =
    typeof window !== "undefined"
      ? window.location
      : { pathname: "/send-email" };

  const {
    includeBody,
    setIncludeBody,
    senderFile,
    backendLogs,
    senders,
    setSenders, // Added from context
    receiverFile,
    receivers,
    setReceivers, // Added from context
    templateFile,
    htmlTemplate,
    directFiles,
    recMode,
    addLog,
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
    setHtmlTemplate,
    setSendLimit,
    setDirectFiles,
  } = useMail();

  // --- NEW: UNIVERSAL FILE PARSER ---
  const handleFileProcess = (
    file: File,
    type: "sender" | "receiver" | "html",
  ) => {
    if (type === "sender") setSenderFile(file);
    if (type === "receiver") setReceiverFile(file);
    if (type === "html") setTemplateFile(file);

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;

      // --- CASE 1: EXCEL (.xlsx, .xls) ---
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".csv")
      ) {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0]; // Get first sheet
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet); // Convert to Array of Objects

        if (type === "sender") {
          if (
            type === "sender" &&
            parsedData.length > 0 &&
            (parsedData[0] as any).username &&
            (parsedData[0] as any).password
          ) {
            setSenders(parsedData);
          } else {
            alert("Excel Error: First column must be 'username' for senders.");
            return;
          }
        }

        if (type === "receiver") {
          if (
            type === "receiver" &&
            parsedData.length > 0 &&
            (parsedData[0] as any).email
          ) {
            setReceivers(parsedData);
          } else {
            alert("Excel Error: No valid data found for receivers.");
            return;
          }
        }
      }

      // --- CASE 3: JSON (.json) ---
      else if (file.name.endsWith(".json")) {
        try {
          const jsonData = JSON.parse(data as string);
          const rawArray = Array.isArray(jsonData) ? jsonData : [jsonData];

          if (type === "sender") {
            // Check if every object has the required keys for a sender
            const validSenders = rawArray.filter(
              (item) => "username" in item && "password" in item,
            );

            if (validSenders.length > 0) {
              setSenders(validSenders);
              addLog(
                `Imported ${validSenders.length} Senders (Keys: username, password)`,
                "info",
                true,
              );
            } else {
              addLog(
                "Error: Senders must have  'username', and 'password' keys.",
                "error",
                true,
              );
            }
          } else if (type === "receiver") {
            // Check if every object has the 'email' key
            const validReceivers = rawArray.filter((item) => "email" in item);

            if (validReceivers.length > 0) {
              setReceivers(validReceivers);
              addLog(
                `Imported ${validReceivers.length} Receivers (Key: email)`,
                "info",
                true,
              );
            } else {
              addLog(
                "Error: Receivers must have an 'email' key.",
                "error",
                true,
              );
            }
          }
        } catch (err) {
          addLog("JSON Parse Error: File is not a valid JSON", "error", true);
        }
      }

      // --- CASE 4: HTML ---
      else if (type === "html") {
        setHtmlTemplate(data as string);
      }
    };

    // Binary for Excel, Text for others
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleFileProcessForDirFiles = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;

      // Add to the list of files
      setDirectFiles((prev) => [
        ...prev,
        { name: file.name, base64: base64Data },
      ]);
    };
    reader.readAsDataURL(file);
  };

  // Helper to remove a file if the user made a mistake
  const removeFile = (index: number) => {
    setDirectFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const manualReceiversCount = useMemo(
    () =>
      manualText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s !== "").length,
    [manualText],
  );
  const LogOut = () => {
    localStorage.clear();

    window.location.href = "/";
  };

  // UPDATED: Now shows actual counts from the parsed data arrays
  const sendersCount = senders?.length || 0;
  const directFilesCount = directFiles?.length || 0;
  const receiversCount =
    recMode === "text" ? manualReceiversCount : receivers?.length || 0;

  const formatOptions = [
    { id: "pdf", label: "HTML - PDF", icon: "fa-file-pdf" },
    { id: "png", label: "HTML - PNG", icon: "fa-file-image" },
    { id: "html", label: "Direct HTML", icon: "fa-code" },
    { id: "word", label: "HTML - Word", icon: "fa-file-word" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            <button
              onClick={LogOut}
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

          <div className="flex bg-slate-900/60 p-2 rounded-2xl border border-white/5 shadow-2xl overflow-x-auto max-w-full">
            <Link
              to="/send-email"
              className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/send-email" || location.pathname === "/" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
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
            value={sendersCount}
            icon="fa-server"
            color="bg-indigo-500/10 text-indigo-400"
            subValue={senderFile ? "Data Initialized" : "No Files"}
          />
          <StatCard
            title="RECIPIENT LIST"
            value={receiversCount}
            icon="fa-users"
            color="bg-emerald-500/10 text-emerald-400"
            subValue={recMode === "text" ? "Manual Targets" : "Parsed Targets"}
          />
          <StatCard
            title="DIRECT FILES"
            value={directFilesCount}
            icon="fa-file"
            color="bg-amber-500/10 text-amber-400"
            subValue="FILES"
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
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 rounded-[2.5rem] space-y-8 border-white/5 relative overflow-hidden">
              <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                <i className="fas fa-file-import text-indigo-500"></i> Assets
              </h2>
              <div className="space-y-4">
                <div className="p-5 bg-black/40 rounded-2xl border border-slate-800 group focus-within:border-indigo-500 transition-colors">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">
                    Sender Limit
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

                <div className="p-5 bg-black/40 rounded-2xl border border-slate-800 transition-colors">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3">
                    Delivery Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {formatOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDeliveryFormat(opt.id)}
                        className={`py-2 px-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${deliveryFormat === opt.id ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
                      >
                        <i className={`fas ${opt.icon} text-sm mb-1`}></i>
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  id="textbody-toggle"
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  checked={includeBody}
                  onChange={(e) => setIncludeBody(e.target.checked)}
                />
                <label
                  htmlFor="textbody-toggle"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Include a personalized text message in the email body
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    {[
                      { id: "gmail", label: "Gmail", icon: "fab fa-google" },
                      {
                        id: "outlook",
                        label: "Outlook",
                        icon: "fab fa-windows",
                      },
                      { id: "icloud", label: "iCloud", icon: "fab fa-apple" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSmtpType(opt.id)}
                        className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${smtpType === opt.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
                      >
                        <i className={`${opt.icon} text-sm`}></i>
                        <span className="text-[8px] font-black uppercase tracking-wider">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <FileDropZone
                    id="sender-file"
                    label="1. Senders (JSON/CSV)"
                    icon="fa-key"
                    color="indigo"
                    onFile={(file: File) => handleFileProcess(file, "sender")}
                    fileName={senderFile?.name}
                    count={sendersCount}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    <button
                      onClick={() => setRecMode("text")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${recMode === "text" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
                    >
                      Manual List
                    </button>
                    <button
                      onClick={() => setRecMode("file")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${recMode === "file" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
                    >
                      CSV / JSON
                    </button>
                  </div>
                  {recMode === "text" ? (
                    <div className="relative group">
                      <textarea
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="Enter emails..."
                        className="w-full bg-slate-900/40 border-2 border-slate-800 group-hover:border-slate-700 rounded-[2rem] p-6 text-xs font-mono text-slate-300 focus:border-blue-500 outline-none transition-all shadow-inner h-[132px] custom-scrollbar"
                        spellCheck={false}
                      />
                      {manualReceiversCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-950 pointer-events-none">
                          {manualReceiversCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <FileDropZone
                      id="target-file"
                      label="2. Recipients (CSV)"
                      icon="fa-users"
                      color="blue"
                      onFile={(file: File) =>
                        handleFileProcess(file, "receiver")
                      }
                      fileName={receiverFile?.name}
                      count={receiversCount}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    <button
                      onClick={() => setHtmlMode("text")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${htmlMode === "text" ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
                    >
                      Raw HTML
                    </button>
                    <button
                      onClick={() => setHtmlMode("file")}
                      className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${htmlMode === "file" ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}
                    >
                      HTML File
                    </button>
                  </div>
                  {htmlMode === "text" ? (
                    <div className="relative group">
                      <textarea
                        value={htmlTemplate}
                        onChange={(e) => setHtmlTemplate(e.target.value)}
                        placeholder="<html>..."
                        className="w-full bg-slate-900/40 border-2 border-slate-800 group-hover:border-slate-700 rounded-[2rem] p-6 text-xs font-mono text-slate-300 focus:border-rose-500 outline-none transition-all shadow-inner h-[132px] custom-scrollbar"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <FileDropZone
                      id="html-file"
                      label="3. HTML Template"
                      icon="fa-file-code"
                      color="rose"
                      onFile={(file: File) => handleFileProcess(file, "html")}
                      fileName={templateFile?.name}
                      count={htmlTemplate ? 1 : 0}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <FileDropZone
                      id="dir-file"
                      label="4. Add Direct files"
                      icon="fa-file-text"
                      color="indigo"
                      onFile={(file: File) =>
                        handleFileProcessForDirFiles(file)
                      }
                      // We show the name of the last file uploaded or a summary
                      fileName={
                        directFiles.length > 0
                          ? `${directFiles.length} files selected`
                          : ""
                      }
                      count={directFiles.length}
                    />
                  </div>

                  {/* NEW: File List Display */}
                  {directFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-rose-50 rounded-md border border-rose-100">
                      {directFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center bg-white px-3 py-1 rounded-full text-xs border border-rose-200 shadow-sm"
                        >
                          <i className="fa-solid fa-file-circle-check text-rose-500 mr-2"></i>
                          <span className="truncate max-w-[150px] font-medium text-gray-700">
                            {file.name}
                          </span>
                          <button
                            onClick={() => removeFile(idx)}
                            className="ml-2 text-gray-400 hover:text-rose-600 transition-colors"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex w-full gap-3">
              <WorldClocks />
              <div className="bg-black/95 rounded-2xl p-5 w-full font-mono text-[9px] overflow-y-auto custom-scrollbar border border-slate-800/50 shadow-inner">
                {backendLogs.length === 0 ? (
                  <div className="text-slate-800 flex items-center justify-center h-full italic select-none">
                    Ready for sequence start...
                  </div>
                ) : (
                  backendLogs.map((log) => (
                    <div
                      key={log.id}
                      className="mb-1 flex gap-2 animate-in fade-in slide-in-from-left-1 duration-300"
                    >
                      <span className="text-slate-500">
                        [{log.timestamp.toLocaleTimeString()}]
                      </span>
                      <span
                        className={
                          log.level === "error"
                            ? "text-red-400"
                            : log.level === "warn"
                              ? "text-yellow-400"
                              : "text-emerald-400"
                        }
                      >
                        {log.level.toUpperCase()}:
                      </span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {children ? (
              children
            ) : (
              <div className="glass p-10 rounded-[3.5rem] min-h-[750px] shadow-2xl flex flex-col relative border-white/5 overflow-hidden items-center justify-center text-slate-500">
                <p>Please select a module from the top navigation.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
