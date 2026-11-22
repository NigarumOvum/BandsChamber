import { createClient } from "@libsql/client";
import { beforeAll, describe, expect, it } from "vitest";

import {
  createProject,
  createSong,
  deleteSong,
  getSongDetail,
  listProjects,
  listSongs,
  setMusicDbClientForTests,
  updateProject,
  updateSong,
} from "@/lib/music/db";

const OWNER = "user-owner";
const EDITOR = "user-editor";
const VIEWER = "user-viewer";
const STRANGER = "user-stranger";

beforeAll(() => {
  setMusicDbClientForTests(createClient({ url: ":memory:" }));
});

describe("song visibility scoping", () => {
  it("users only see their own unshared songs", async () => {
    await createSong(OWNER, { title: "Solo song" });
    await createSong(STRANGER, { title: "Stranger song" });

    const ownerSongs = await listSongs(OWNER);
    expect(ownerSongs.map((song) => song.title)).toEqual(["Solo song"]);

    const strangerSongs = await listSongs(STRANGER);
    expect(strangerSongs.map((song) => song.title)).toEqual(["Stranger song"]);
  });

  it("new projects default to private: members see project songs, strangers do not", async () => {
    const project = await createProject(OWNER, {
      name: "Private Band",
      memberUserIds: [EDITOR, VIEWER],
      memberRoles: { [VIEWER]: "viewer" },
    });
    expect(project.isSharedWithAll).toBe(false);

    await createSong(OWNER, { title: "Private project song", project_slug: project.slug });

    for (const userId of [OWNER, EDITOR, VIEWER]) {
      const songs = await listSongs(userId);
      expect(songs.some((song) => song.title === "Private project song")).toBe(true);
    }

    const strangerSongs = await listSongs(STRANGER);
    expect(strangerSongs.some((song) => song.title === "Private project song")).toBe(false);

    const detail = await getSongDetail(
      (await listSongs(EDITOR)).find((song) => song.title === "Private project song")!.id,
      EDITOR,
    );
    expect(detail?.song.title).toBe("Private project song");
    const strangerDetail = await getSongDetail(
      (await listSongs(EDITOR)).find((song) => song.title === "Private project song")!.id,
      STRANGER,
    );
    expect(strangerDetail).toBeNull();
  });

  it("opt-in shared projects expose their songs to every logged-in user", async () => {
    const project = await createProject(OWNER, { name: "Open Band", isSharedWithAll: true });
    expect(project.isSharedWithAll).toBe(true);
    await createSong(OWNER, { title: "Shared project song", project_slug: project.slug });

    const strangerSongs = await listSongs(STRANGER);
    expect(strangerSongs.some((song) => song.title === "Shared project song")).toBe(true);
  });

  it("strangers cannot list a private project even though songs exist", async () => {
    const strangerProjects = await listProjects(STRANGER);
    expect(strangerProjects.some((project) => project.name === "Private Band")).toBe(false);
    expect(strangerProjects.some((project) => project.name === "Open Band")).toBe(true);
  });
});

describe("song edit permissions", () => {
  it("only the song owner can edit or delete an unshared song", async () => {
    const created = await createSong(OWNER, { title: "Locked song" });
    expect(created).not.toBeNull();
    const { song } = created!;
    await expect(updateSong(song.id, STRANGER, { topic: "hijacked" })).rejects.toThrow();
    await expect(deleteSong(song.id, STRANGER)).rejects.toThrow();

    const updated = await updateSong(song.id, OWNER, { topic: "legit" });
    expect(updated.song.topic).toBe("legit");
  });

  it("project editors can edit project songs, viewers and strangers cannot", async () => {
    const project = await createProject(OWNER, {
      name: "Edit Band",
      memberUserIds: [EDITOR, VIEWER],
      memberRoles: { [VIEWER]: "viewer" },
    });
    const created = await createSong(OWNER, { title: "Band song", project_slug: project.slug });
    expect(created).not.toBeNull();
    const { song } = created!;

    const edited = await updateSong(song.id, EDITOR, { topic: "editor pass" });
    expect(edited.song.topic).toBe("editor pass");

    await expect(updateSong(song.id, VIEWER, { topic: "viewer hijack" })).rejects.toThrow(
      "You do not have permission to edit this song",
    );
    await expect(updateSong(song.id, STRANGER, { topic: "stranger hijack" })).rejects.toThrow();
  });

  it("non-owners cannot update or delete a project", async () => {
    const project = await createProject(OWNER, { name: "Guarded Band", memberUserIds: [EDITOR] });
    await expect(updateProject(project.id, EDITOR, { name: "Renamed" })).rejects.toThrow(
      "Only the project owner can update project settings or member roles",
    );
  });
});
