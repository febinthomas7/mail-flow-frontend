import React, { createContext, useContext, useState, ReactNode } from "react";
import { Receiver, LogEntry } from "../types"; // Adjust path to your types file

interface MailContextType {
  receivers: Receiver[];
  setReceivers: React.Dispatch<React.SetStateAction<Receiver[]>>;
  logs: LogEntry[];
  addLog: (message: string, level: LogEntry["level"]) => void;
  receiverFileName: string;
  setReceiverFileName: (name: string) => void;
}

const MailContext = createContext<MailContextType | undefined>(undefined);

export const MailProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [htmlTemplate, setHtmlTemplate] = useState<string | null>(null);
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
  const [receiverFileName, setReceiverFileName] = useState<string>("");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [pdfName, setPdfName] = useState<string>("");
  const [throughput, setThroughput] = useState(0);
  const [sendLimit, setSendLimit] = useState<number>(100);

  const addLog = (message: string, level: LogEntry["level"]) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      message,
      level,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  return (
    <MailContext.Provider
      value={{
        receivers,
        setReceivers,
        logs,
        addLog,
        htmlTemplate,
        setHtmlTemplate,
        setLogs,
        receiverFileName,
        setReceiverFileName,
        senders,
        setSenders,
        backendLogs,
        setBackendLogs,
        pdfName,
        setPdfName,
        throughput,
        setThroughput,
        sendLimit,
        setSendLimit,
      }}
    >
      {children}
    </MailContext.Provider>
  );
};

// Custom hook for easy access
export const useMail = () => {
  const context = useContext(MailContext);
  if (!context) {
    throw new Error("useMail must be used within a MailProvider");
  }
  return context;
};
