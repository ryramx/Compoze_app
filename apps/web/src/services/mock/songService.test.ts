import { describe, expect, it } from "vitest";
import type { Project, Song } from "@/types";
import { daysRemaining, purgeExpired, TRASH_RETENTION_DAYS } from "./songService";

function makeSong(overrides: Partial<Song>): Song {
  return {
    id: "s_test",
    title: "Teste",
    status: "ideia",
    creatorId: "u1",
    collaborators: [{ userId: "u1", percentage: 100 }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    blocks: [],
    ...overrides,
  };
}

const noProjects: Project[] = [];

describe("songService — RN07/RN08 (soft delete e expiração simulada)", () => {
  it("daysRemaining counts down from the retention window", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    const deletedAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const song = makeSong({ deletedAt });
    expect(daysRemaining(song, now)).toBe(TRASH_RETENTION_DAYS - 10);
  });

  it("purgeExpired removes songs whose retention window has passed (simulated automated process)", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    const expiredAt = new Date(now.getTime() - (TRASH_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    const stillWithinWindowAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const songs = [
      makeSong({ id: "expired", deletedAt: expiredAt, projectId: "p1" }),
      makeSong({ id: "recent", deletedAt: stillWithinWindowAt }),
      makeSong({ id: "active" }), // not trashed at all
    ];
    const projects: Project[] = [
      {
        id: "p1",
        name: "Projeto",
        type: "ep",
        style: "banda",
        description: "",
        cover: "",
        releaseDate: now.toISOString(),
        estimatedCost: 0,
        fundingGoal: 0,
        fundingProgress: 0,
        status: "planejamento",
        songIds: ["expired"],
        collaboratorIds: ["u1"],
        ownerId: "u1",
      },
    ];

    const result = purgeExpired(songs, projects, now);

    expect(result.songs.map((s) => s.id)).toEqual(["recent", "active"]);
    expect(result.projects[0].songIds).not.toContain("expired");
  });

  it("purgeExpired is a no-op when nothing has expired", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    const songs = [makeSong({ id: "recent", deletedAt: now.toISOString() })];
    const result = purgeExpired(songs, noProjects, now);
    expect(result.songs).toEqual(songs);
  });
});
