import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BASE_URL;

export const socket = io(backendUrl, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnectionAttempts: 10,
});
