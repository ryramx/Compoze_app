// Funções puras para Conversation/Message — ver comentário em songService.ts.
import type { Conversation } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function send(
  conversations: Conversation[],
  fromId: string,
  toUserId: string,
  content: string,
): Conversation[] {
  const conv = conversations.find((c) => c.withUserId === toUserId);
  const msg = {
    id: uid(),
    fromId,
    toId: toUserId,
    content,
    timestamp: new Date().toISOString(),
  };
  if (conv) {
    return conversations.map((c) =>
      c.withUserId === toUserId ? { ...c, messages: [...c.messages, msg] } : c,
    );
  }
  return [...conversations, { id: uid(), withUserId: toUserId, messages: [msg] }];
}
