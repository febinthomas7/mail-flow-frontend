import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Receiver, LogEntry, Sender } from "../types"; // Adjust path to your types file

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
  const [deliveryFormat, setDeliveryFormat] = useState<string>("pdf");
  const [htmlMode, setHtmlMode] = useState<"text" | "file">("file");
  const [receiverFile, setReceiverFile] = useState<File | null>(null);
  const [recMode, setRecMode] = useState<"text" | "file">("file");
  const [smtpType, setSmtpType] = useState<string>("gmail");
  const [senderFile, setSenderFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [includeBody, setIncludeBody] = useState(true);
  const [directFiles, setDirectFiles] = useState([]); // Array of { name, base64 }
  // const addLog = (message: string, level: LogEntry["level"]) => {
  // const newLog: LogEntry = {
  //   id: crypto.randomUUID(),
  //   timestamp: new Date().toISOString(),
  //   message,
  //   level,
  // };
  // setLogs((prev) => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  // };
  const uuidv4 = () => crypto.randomUUID();

  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info", isBackend = false) => {
      const newLog = { id: uuidv4(), timestamp: new Date(), level, message };
      if (isBackend) {
        setBackendLogs((prev: any) => [newLog, ...prev].slice(0, 50));
      }
    },
    [setBackendLogs],
  );

  return (
    <MailContext.Provider
      value={{
        receivers,
        addLog,
        setReceivers,
        logs,
        includeBody,
        setIncludeBody,
        setDirectFiles,
        htmlTemplate,
        setHtmlTemplate,
        setLogs,
        receiverFileName,
        setReceiverFileName,
        senders,
        setSenders,
        backendLogs,
        directFiles,
        setBackendLogs,
        pdfName,
        setPdfName,
        throughput,
        setThroughput,
        sendLimit,
        setSendLimit,
        manualText,
        setManualText,
        templateFile,
        setTemplateFile,
        senderFile,
        setSenderFile,
        deliveryFormat,
        setDeliveryFormat,
        htmlMode,
        setHtmlMode,
        recMode,
        setRecMode,
        receiverFile,
        setReceiverFile,
        smtpType,
        setSmtpType,
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
