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
export const sendEmail = async (
  payload: EmailPayload,
): Promise<{ success: boolean; messageId: string; rtt: number }> => {
  const { sender, receiver, subject, body, html, attachment, onStageChange } =
    payload;
  const startTime = Date.now();

  const setStage = (stage: SMTPStage) => onStageChange?.(stage);

  setStage(SMTPStage.CONNECTING);

  try {
    setStage(SMTPStage.PREPARING_MIME);

    const requestBody = {
      smtpConfig: {
        host: sender.host,
        port: sender.port || 587,
        username: sender.username,
        password: sender.password,
        email: sender.email,
        name: sender.name,
      },
      mailOptions: {
        to: receiver.email,
        subject: subject,
        text: body,
        html: html,
        attachments: attachment
          ? [
              {
                filename: attachment.filename,
                content: attachment.content,
                type: attachment.type,
              },
            ]
          : [],
      },
    };

    setStage(SMTPStage.TRANSMITTING);

    const response = await fetch(`${backendUrl}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    const rtt = Date.now() - startTime;

    if (response.ok && result.success) {
      setStage(SMTPStage.ACK_RECEIVED);
      return {
        success: true,
        messageId: result.messageId,
        rtt,
      };
    } else {
      throw new Error(result.error || `HTTP_ERR_${response.status}`);
    }
  } catch (err: any) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(
        "BACKEND_OFFLINE: Ensure the Express server (server.js) is running on port 3001.",
      );
    }
    throw err;
  }
};

export const verifySmtpCredential = async (sender: Sender) => {
  try {
    const response = await fetch(`${backendUrl}/api/verify-smtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smtpConfig: {
          host: sender.host,
          port: sender.port,
          username: sender.email || sender.username,
          password: sender.password,
        },
      }),
    });
    const data = await response.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
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
    const response = await fetch(`${backendUrl}/api/verify-target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
