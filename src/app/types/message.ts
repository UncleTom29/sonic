// src/app/types/message.ts
import { Message as AIMessage } from 'ai';

export interface ExtendedMessage extends AIMessage {
  action?: string;
}