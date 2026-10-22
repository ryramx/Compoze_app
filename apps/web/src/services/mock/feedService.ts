// Funções puras para FeedItem — ver comentário em songService.ts.
import type { FeedItem } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export function post(feed: FeedItem[], userId: string, content: string): FeedItem[] {
  return [
    {
      id: uid(),
      type: "post",
      userId,
      timestamp: new Date().toISOString(),
      content,
      likes: 0,
      comments: 0,
    },
    ...feed,
  ];
}
