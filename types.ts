
export interface Sender {
  email: string;
  name: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface Receiver {
  email: string;
  name: string;
  company?: string;
}

export interface BatchPlan {
  sender: Sender;
  receivers: Receiver[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}
