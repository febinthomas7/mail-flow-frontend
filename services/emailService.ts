import { Sender, Receiver } from "../types";

export enum SMTPStage {
  CONNECTING = "NODE_CONNECT",
  AUTHENTICATING = "AUTH_HANDSHAKE",
  PREPARING_MIME = "MIME_GEN",
  TRANSMITTING = "UPSTREAM_SEND",
  ACK_RECEIVED = "ACK_OK",
}

interface EmailPayload {
  sender: Sender;
  receiver: Receiver;
  subject: string;
  body: string;
  html?: string; // Optional HTML content
  attachment?: {
    content: string; // Base64
    filename: string;
    type: string;
  };
  onStageChange?: (stage: SMTPStage) => void;
}

const backendUrl = import.meta.env.VITE_BASE_URL;

/**
 * Functional SMTP Dispatcher
 * Forwards mail requests to the professional Node.js backend.
 */
// Updated for Batch Processing
export const sendBatchEmails = async (
  allTargets: any[],
  allSenders: any[],
  options: any,
): Promise<{ success: boolean; total: number }> => {
  // Construct the payload to match your backend's expected 'req.body'
  const requestBody = {
    targets: allTargets, // The 20,000 objects (email, name, invoice)
    smtpConfigs: allSenders, // The extracted (email, username, password)
    subjects: options.subjects,
    senderNames: options.senderNames,
    textBody: options.textBody,
    generationOptions: {
      body: options.generationOptions.body,
      html: options.generationOptions.html,
      format: options.generationOptions.format,
      invoices: options.generationOptions.invoices,
      receiverNames: options.generationOptions.receiverNames,
      directFiles: options.generationOptions.directFiles,
      // Pass any other dynamic data needed for createTags
    },
  };

  const response = await fetch(`${backendUrl}/api/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  if (response.ok && result.success) {
    return {
      success: true,
      total: result.total,
    };
  } else {
    throw new Error(result.error || "BATCH_FAILED");
  }
};

export const verifySmtpBatch = async (senders: Sender[]) => {
  try {
    const response = await fetch(`${backendUrl}/api/verify/smtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        // Match the key 'configs' that your backend expects
        configs: senders,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }
    // Returns { success: true, results: [{ user, status, error }, ...] }
    return data;
  } catch (err: any) {
    console.error("Batch Verify Error:", err);
    return { success: false, error: "Network/Server Error" };
  }
};

interface VerificationResponse {
  success: boolean;
  status?: "valid" | "invalid";
  error?: string;
  details?: any;
}

export const verifyTargetEmail = async (
  email: string,
): Promise<VerificationResponse> => {
  try {
    // Ensure port 5000 matches your backend port
    const response = await fetch(`${backendUrl}/api/verify/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    const data = await response.json();

    if (!data.success) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
