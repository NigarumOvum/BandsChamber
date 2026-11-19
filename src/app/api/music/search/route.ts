import { errorResponse, jsonResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listMusicTaskTemplates, listProjects, listSongs } from "@/lib/music/db";

type SearchResult = {
  id: string;
  kind: "song" | "project" | "prompt";
  title: string;
  description: string;
  href: string;
};

function matches(query: string, values: Array<string | number | null | undefined>) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(query));
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase().slice(0, 100) ?? "";

    if (query.length < 2) {
      return jsonResponse({ results: [] satisfies SearchResult[] });
    }

    const [songs, projects, templates] = await Promise.all([
      listSongs(user.id, query),
      listProjects(user.id),
      listMusicTaskTemplates(user.id),
    ]);
    const accessibleProjectSlugs = new Set(projects.map((project) => project.slug));

    const results: SearchResult[] = [
      ...songs
        .filter((song) => !song.project_slug || accessibleProjectSlugs.has(song.project_slug))
        .slice(0, 8)
        .map((song): SearchResult => ({
          id: song.id,
          kind: "song",
          title: song.title,
          description: [song.genre, song.project_slug].filter(Boolean).join(" · ") || "Song",
          href: `/production-studio?songId=${encodeURIComponent(song.id)}`,
        })),
      ...projects
        .filter((project) => matches(query, [project.name, project.slug, project.description]))
        .slice(0, 5)
        .map((project): SearchResult => ({
          id: project.id,
          kind: "project",
          title: project.name,
          description: project.description || `${project.songCount} songs · ${project.memberCount} members`,
          href: `/production-studio?projectId=${encodeURIComponent(project.id)}`,
        })),
      ...templates
        .filter((template) => matches(query, [
          template.name,
          template.category,
          template.genre,
          template.description,
          template.instructions,
          template.targetField,
          template.targetKinds.join(" "),
        ]))
        .slice(0, 5)
        .map((template): SearchResult => ({
          id: template.id,
          kind: "prompt",
          title: template.name,
          description: template.description || template.category || "Reusable prompt",
          href: `/prompt-library?templateId=${encodeURIComponent(template.id)}`,
        })),
    ];

    return jsonResponse({ results });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to search workspace");
  }
}
