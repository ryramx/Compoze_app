export type FeedItemType = "post" | "song-released" | "project-update" | "follow";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  userId: string;
  timestamp: string;
  content?: string;
  songId?: string;
  projectId?: string;
  image?: string;
  likes: number;
  comments: number;
}
