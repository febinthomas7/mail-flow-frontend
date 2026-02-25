import { useMail } from "@/utils/MailContext";
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom"; 

// --- COMPONENT: STAT CARD ---
const StatCard = ({ title, value, icon, color, subValue }: any) => (
  <div className="glass p-5 rounded-2xl flex items-center gap-4 flex-1 border-slate-800/50 hover:border-slate-700 transition-all group">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="overflow-hidden">
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-2xl font-black text-white leading-tight truncate">{value}</h3>
      {subValue && <p className="text-[10px] text-slate-400 font-mono truncate italic opacity-60">{subValue}</p>}
    </div>
  </div>
);

// --- COMPONENT: FILE DROP ZONE ---
const FileDropZone = ({ id, label, icon, color, onFile, fileName, count }: any) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  };

  return (
    <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`relative group transition-all duration-300 ${isDragging ? "scale-[1.02]" : ""}`}>
      <input type="file" id={id} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <label htmlFor={id} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${fileName ? `bg-${color}-500/5 border-${color}-500/50 shadow-inner` : isDragging ? `bg-${color}-500/10 border-${color}-500 shadow-2xl` : `bg-slate-900/40 border-slate-800 group-hover:border-slate-700 hover:bg-slate-900/60`}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3 relative ${fileName ? `bg-${color}-500 text-white` : isDragging ? `bg-${color}-500 text-white shadow-lg` : `bg-slate-800 text-slate-400 group-hover:text-slate-200 transition-colors`}`}>
          <i className={`fas ${fileName ? "fa-check" : icon}`}></i>
          {count !== undefined && count > 0 && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-950">{count}</span>}
        </div>
        <span className={`text-[11px] font-black uppercase tracking-widest ${fileName ? `text-${color}-400` : "text-slate-400 group-hover:text-slate-200"} transition-colors text-center`}>
          {fileName ? (fileName.length > 20 ? fileName.substring(0, 17) + "..." : fileName) : label}
        </span>
        <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">{fileName ? "Drop to Update" : "Drop File or Click"}</p>
      </label>
    </div>
  );
};

// --- MAIN LAYOUT COMPONENT ---
export default function Layout({ children }: any) {
  const location = typeof window !== "undefined" ? window.location : { pathname: "/send-email" };

  // const [senderFile, setSenderFile] = useState<File | null>(null);
  // const [receiverFile, setReceiverFile] = useState<File | null>(null);
  // const [templateFile, setTemplateFile] = useState<File | null>(null);
  // const [manualText, setManualText] = useState("");
  // const [htmlTemplate, setHtmlTemplate] = useState("");
  // const [deliveryFormat, setDeliveryFormat] = useState<string>("html");
  // const [recMode, setRecMode] = useState<"text" | "file">("text");
  // const [htmlMode, setHtmlMode] = useState<"text" | "file">("file");
  // const [smtpType, setSmtpType] = useState<string>("gmail");
  // const [sendLimit, setSendLimit] = useState(50);
  // const [throughput] = useState(0); 

  const {
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
       
        setHtmlTemplate,
       
        setSendLimit,
    } = useMail();

  const manualReceiversCount = useMemo(() => manualText.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== "").length, [manualText]);
  const sendersCount = senderFile ? 1 : 0;
  const receiversCount = recMode === "text" ? manualReceiversCount : (receiverFile ? 1 : 0);

  const formatOptions = [
    { id: "html", label: "Direct HTML", icon: "fa-code" },
    { id: "pdf", label: "HTML - PDF", icon: "fa-file-pdf" },
    { id: "word", label: "HTML - Word", icon: "fa-file-word" },
    { id: "png", label: "HTML - PNG", icon: "fa-file-image" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => alert("Logout clicked")} className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 shadow-lg">
              <i className="fas fa-sign-out-alt md:mr-2"></i>
              <span className="hidden md:inline">Logout</span>
            </button>
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-3xl flex items-center justify-center text-white shadow-[0_0_40px_rgba(79,70,229,0.3)] border border-white/10">
              <i className="fas fa-heart-pulse text-2xl animate-pulse"></i>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Alam <span className="text-indigo-500">Secure</span></h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Email Dispatcher</p>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <div className="flex bg-slate-900/60 p-2 rounded-2xl border border-white/5 shadow-2xl overflow-x-auto max-w-full">
            <Link to="/send-email" className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/send-email" || location.pathname === "/" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>Dispatcher</Link>
            <Link to="/verify-email" className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/verify-email" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>SMTP Verifier</Link>
            <Link to="/verify-target" className={`px-4 lg:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === "/verify-target" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>Target Verifier</Link>
          </div>
        </header>

        {/* STATS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="SMTP CLUSTER" value={sendersCount} icon="fa-server" color="bg-indigo-500/10 text-indigo-400" subValue={senderFile ? "Files Loaded" : "No Files"} />
          <StatCard title="RECIPIENT LIST" value={receiversCount} icon="fa-users" color="bg-emerald-500/10 text-emerald-400" subValue={recMode === "text" ? "Manual Targets" : "File Targets"} />
          <StatCard title="VELOCITY" value={`${throughput} m/m`} icon="fa-bolt" color="bg-amber-500/10 text-amber-400" subValue="Flow Rate" />
          <StatCard title="BATCH LIMIT" value={sendLimit} icon="fa-rotate" color="bg-blue-500/10 text-blue-400" subValue="Recipients per Sender" />
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT COLUMN: ASSETS & LOGS */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 rounded-[2.5rem] space-y-8 border-white/5 relative overflow-hidden">
              <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3"><i className="fas fa-file-import text-indigo-500"></i> Assets</h2>
              <div className="space-y-4">
                <div className="p-5 bg-black/40 rounded-2xl border border-slate-800 group focus-within:border-indigo-500 transition-colors">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Sender Limit</label>
                  <div className="flex items-center gap-3">
                    <input type="number" value={sendLimit} onChange={(e) => setSendLimit(Math.max(1, Number(e.target.value)))} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white font-bold outline-none group-focus-within:bg-black transition-all" />
                    <span className="text-[10px] font-black text-slate-600 uppercase">Mails/Node</span>
                  </div>
                </div>

                <div className="p-5 bg-black/40 rounded-2xl border border-slate-800 transition-colors">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3">Delivery Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {formatOptions.map((opt) => (
                      <button key={opt.id} onClick={() => setDeliveryFormat(opt.id)} className={`py-2 px-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${deliveryFormat === opt.id ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>
                        <i className={`fas ${opt.icon} text-sm mb-1`}></i>
                        <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    {[{ id: "gmail", label: "Gmail", icon: "fab fa-google" }, { id: "outlook", label: "Outlook", icon: "fab fa-windows" }, { id: "icloud", label: "iCloud", icon: "fab fa-apple" }].map((opt) => (
                      <button key={opt.id} onClick={() => setSmtpType(opt.id)} className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${smtpType === opt.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>
                        <i className={`${opt.icon} text-sm`}></i>
                        <span className="text-[8px] font-black uppercase tracking-wider">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <FileDropZone id="sender-file" label="1. Senders (JSON/CSV)" icon="fa-key" color="indigo" onFile={setSenderFile} fileName={senderFile?.name} count={sendersCount} />
                </div>

                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    <button onClick={() => setRecMode("text")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${recMode === "text" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>Manual List</button>
                    <button onClick={() => setRecMode("file")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${recMode === "file" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>CSV / JSON</button>
                  </div>
                  {recMode === "text" ? (
                    <div className="relative group">
                      <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Enter emails..." className="w-full bg-slate-900/40 border-2 border-slate-800 group-hover:border-slate-700 rounded-[2rem] p-6 text-xs font-mono text-slate-300 focus:border-blue-500 outline-none transition-all shadow-inner h-[132px] custom-scrollbar" spellCheck={false} />
                      {manualReceiversCount > 0 && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-slate-950 pointer-events-none">{manualReceiversCount}</span>}
                    </div>
                  ) : (
                    <FileDropZone id="target-file" label="2. Recipients (CSV)" icon="fa-users" color="blue" onFile={setReceiverFile} fileName={receiverFile?.name} count={receiversCount} />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                    <button onClick={() => setHtmlMode("text")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${htmlMode === "text" ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>Raw HTML</button>
                    <button onClick={() => setHtmlMode("file")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${htmlMode === "file" ? "bg-rose-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>HTML File</button>
                  </div>
                  {htmlMode === "text" ? (
                    <div className="relative group">
                      <textarea value={htmlTemplate} onChange={(e) => setHtmlTemplate(e.target.value)} placeholder="<html>..." className="w-full bg-slate-900/40 border-2 border-slate-800 group-hover:border-slate-700 rounded-[2rem] p-6 text-xs font-mono text-slate-300 focus:border-rose-500 outline-none transition-all shadow-inner h-[132px] custom-scrollbar" spellCheck={false} />
                    </div>
                  ) : (
                    <FileDropZone id="html-file" label="3. HTML Template" icon="fa-file-code" color="rose" onFile={setTemplateFile} fileName={templateFile?.name} count={templateFile ? 1 : 0} />
                  )}
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-[2.5rem] bg-black/20 border-white/5">
              <h3 className="text-[10px] font-black uppercase text-indigo-400 mb-6 flex items-center justify-between">
                <span>Relay Logs</span><i className="fas fa-terminal opacity-50"></i>
              </h3>
              <div className="bg-black/95 rounded-2xl p-5 h-64 font-mono text-[9px] overflow-y-auto custom-scrollbar border border-slate-800/50 shadow-inner">
                <div className="text-slate-800 flex items-center justify-center h-full italic select-none">Ready for sequence start...</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DYNAMIC CONTENT AREA */}
          <div className="lg:col-span-8 space-y-8">
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