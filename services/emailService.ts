/// <reference types="vite/client" />
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
  attachment?: {
    content: string; // Base64
    filename: string;
    type: string;
  };
  onStageChange?: (stage: SMTPStage) => void;
}

const BACKEND_URL = `${import.meta.env.VITE_BASE_URL}/api/send-email`;

/**
 * Functional SMTP Dispatcher
 * Forwards mail requests to the professional Node.js backend.
 */
export const sendEmail = async (
  payload: EmailPayload,
): Promise<{ success: boolean; messageId: string; rtt: number }> => {
  const { sender, receiver, subject, body, attachment, onStageChange } =
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

    const response = await fetch(BACKEND_URL, {
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
