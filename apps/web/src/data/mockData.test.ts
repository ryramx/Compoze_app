import { describe, expect, it } from "vitest";
import { conversations, feed, folders, follows, projects, songs, users } from "./mockData";

// Os dados de exemplo alimentam o modo demonstração; referências quebradas
// entre canções, projetos e pastas apareceriam como telas incoerentes.
describe("mockData integrity", () => {
  const userIds = new Set(users.map((u) => u.id));
  const songIds = new Set(songs.map((s) => s.id));
  const folderIds = new Set(folders.map((f) => f.id));
  const projectIds = new Set(projects.map((p) => p.id));

  it("every song.projectId matches a project that lists it back in songIds", () => {
    for (const song of songs) {
      if (!song.projectId) continue;
      const project = projects.find((p) => p.id === song.projectId);
      expect(project, `song ${song.id} references missing project ${song.projectId}`).toBeDefined();
      expect(project!.songIds).toContain(song.id);
    }
  });

  it("every project.songIds entry has a matching song.projectId back-reference", () => {
    for (const project of projects) {
      for (const songId of project.songIds) {
        const song = songs.find((s) => s.id === songId);
        expect(song, `project ${project.id} references missing song ${songId}`).toBeDefined();
        expect(song!.projectId).toBe(project.id);
      }
    }
  });

  it("every subfolder's parentId points to an existing folder", () => {
    for (const folder of folders) {
      if (!folder.parentId) continue;
      expect(folderIds.has(folder.parentId)).toBe(true);
    }
  });

  it("every song.folderId (when present) points to an existing folder", () => {
    for (const song of songs) {
      if (!song.folderId) continue;
      expect(folderIds.has(song.folderId)).toBe(true);
    }
  });

  it("every song.collaborators userId resolves to an existing user", () => {
    for (const song of songs) {
      for (const c of song.collaborators) {
        expect(userIds.has(c.userId), `song ${song.id} has unknown collaborator ${c.userId}`).toBe(true);
      }
    }
  });

  it("every follow edge resolves to existing users", () => {
    for (const f of follows) {
      expect(userIds.has(f.followerId)).toBe(true);
      expect(userIds.has(f.followingId)).toBe(true);
    }
  });

  it("every conversation/message references existing users", () => {
    for (const c of conversations) {
      expect(userIds.has(c.withUserId)).toBe(true);
      for (const m of c.messages) {
        expect(userIds.has(m.fromId)).toBe(true);
        expect(userIds.has(m.toId)).toBe(true);
      }
    }
  });

  it("every feed item references existing users/songs/projects", () => {
    for (const item of feed) {
      expect(userIds.has(item.userId)).toBe(true);
      if (item.songId) expect(songIds.has(item.songId)).toBe(true);
      if (item.projectId) expect(projectIds.has(item.projectId)).toBe(true);
    }
  });
});
