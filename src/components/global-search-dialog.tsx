"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, FolderKanban, LoaderCircle, Search, X } from "lucide-react";

import { useI18n } from "@/components/language-provider";
import { searchWorkspace, type WorkspaceSearchResult } from "@/lib/music/client";

const kindLabelKeys = {
  song: "globalSearch.song",
  project: "globalSearch.project",
  prompt: "globalSearch.prompt",
};

const kindIcons = {
  song: FileText,
  project: FolderKanban,
  prompt: Search,
} satisfies Record<WorkspaceSearchResult["kind"], typeof Search>;

export function GlobalSearchDialog() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  function close() {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setErrorMessage("");
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
        setResults([]);
        setErrorMessage("");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!isOpen || normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setErrorMessage("");
      void searchWorkspace(normalizedQuery, controller.signal)
        .then((payload) => setResults(payload.results))
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setResults([]);
            setErrorMessage(error instanceof Error ? error.message : "Search failed");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("globalSearch.label")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={`${t("globalSearch.open")} (Cmd/Ctrl+K)`}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-sand-2)] transition hover:text-[var(--color-foreground)]"
      >
        <Search className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/65 px-3 pt-[12vh] backdrop-blur-sm sm:px-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t("globalSearch.label")}
            ref={dialogRef}
            onKeyDown={(event) => {
              if (event.key !== "Tab" || !dialogRef.current) return;
              const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            className="panel glass-shine w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-modal-surface)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
              <Search className="h-5 w-5 shrink-0 text-[var(--color-brass)]" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setResults([]);
                  setIsLoading(false);
                  setErrorMessage("");
                }}
                placeholder={t("globalSearch.placeholder")}
                aria-label={t("globalSearch.label")}
                aria-describedby="workspace-search-hint"
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-sand-2)]"
              />
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-[var(--color-sand-2)]" aria-label="Searching" /> : null}
              <button
                type="button"
                onClick={close}
                aria-label={t("globalSearch.close")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-sand-2)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p id="workspace-search-hint" className="px-4 pt-3 text-xs text-[var(--color-sand-2)]">
              {t("globalSearch.hint")}
            </p>

            <div className="max-h-[55vh] overflow-y-auto p-2" aria-live="polite" aria-busy={isLoading}>
              {query.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-sand-2)]">
                  {t("globalSearch.initial")}
                </p>
              ) : errorMessage ? (
                <p role="alert" className="px-3 py-8 text-center text-sm text-red-300">{errorMessage}</p>
              ) : isLoading && results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-sand-2)]">{t("globalSearch.loading")}</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-sand-2)]">{t("globalSearch.empty")}</p>
              ) : (
                <ul className="space-y-1">
                  {results.map((result) => {
                    const Icon = kindIcons[result.kind];
                    return (
                      <li key={`${result.kind}:${result.id}`}>
                        <a
                          href={result.href}
                          onClick={close}
                          className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-mint)]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--color-brass)]">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--color-foreground)]">{result.title}</span>
                            <span className="block truncate text-xs text-[var(--color-sand-2)]">{result.description}</span>
                          </span>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--color-sand-2)]">
                            {t(kindLabelKeys[result.kind])}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
