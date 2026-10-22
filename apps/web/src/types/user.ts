export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: { city: string; country: string; lat: number; lng: number };
  instagram?: string;
  followers: number;
  following: number;
  authorColor: 1 | 2 | 3 | 4 | 5;
}

// Grafo social simples: uma aresta "followerId segue followingId".
export interface Follow {
  followerId: string;
  followingId: string;
}
