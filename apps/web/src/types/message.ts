export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  withUserId: string;
  messages: Message[];
}
