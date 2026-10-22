// Funções puras para a entidade User e o grafo social (Follow) — ver
// comentário em songService.ts sobre a fronteira de serviço.
import type { Follow, User } from "@/types";

export function getById(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function getByUsername(users: User[], username: string): User | undefined {
  return users.find((u) => u.username === username);
}

export function getFollowingIds(follows: Follow[], userId: string): string[] {
  return follows.filter((f) => f.followerId === userId).map((f) => f.followingId);
}

export function isFollowing(follows: Follow[], followerId: string, followingId: string): boolean {
  return follows.some((f) => f.followerId === followerId && f.followingId === followingId);
}

export function toggleFollow(follows: Follow[], followerId: string, followingId: string): Follow[] {
  return isFollowing(follows, followerId, followingId)
    ? follows.filter((f) => !(f.followerId === followerId && f.followingId === followingId))
    : [...follows, { followerId, followingId }];
}

export function update(
  users: User[],
  id: string,
  patch: Partial<Pick<User, "name" | "bio" | "instagram">>,
): User[] {
  return users.map((u) => (u.id === id ? { ...u, ...patch } : u));
}
