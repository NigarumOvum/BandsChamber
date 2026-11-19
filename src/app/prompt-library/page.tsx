import { AppShell } from "@/components/app-shell";
import { TemplatesClient } from "@/components/music/templates-client";

type PromptLibraryPageProps = {
  searchParams: Promise<{ templateId?: string }>;
};

export default async function PromptLibraryPage({ searchParams }: PromptLibraryPageProps) {
  const { templateId } = await searchParams;

  return (
    <AppShell
      title="Prompt Library"
      eyebrow="Creative Recipes"
      description="Create and edit reusable prompts for songwriting passes, arrangement direction, bilingual adaptation, and production cleanup."
      pageKey="prompt-library"
    >
      <TemplatesClient
        libraryEyebrow="Prompt library"
        libraryTitle="Editable prompt workflows"
        editorEyebrow="Prompt editor"
        createTitle="Create prompt"
        editTitle="Edit prompt"
        itemLabel="Prompt"
        namePlaceholder="Prompt name"
        instructionsPlaceholder="Prompt text"
        initialTemplateId={templateId}
      />
    </AppShell>
  );
}