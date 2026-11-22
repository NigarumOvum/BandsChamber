import { useEffect, useCallback } from "react";

// ── Global Keyboard Shortcuts Hook ─────────────────────────────────────────

/**
 * A React hook that registers global keyboard shortcuts.
 * Supports modifier keys (Ctrl/Cmd, Shift, Alt) and custom key combinations.
 */

export interface KeyboardShortcut {
  key: string; // Key code (e.g., "k", "f", " ")
  modifier?: "ctrl" | "meta" | "shift" | "alt"; // Optional modifier
  action: () => void; // Callback when shortcut is triggered
  enabled?: boolean; // Whether the shortcut is active
  description?: string; // Description for help display
}

/**
 * Hook to register global keyboard shortcuts.
 *
 * @param shortcuts Array of keyboard shortcut configurations
 * @param deps Dependencies that should update the shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], deps: React.DependencyList = []) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // Check modifier
        let modifierMatch = true;
        if (shortcut.modifier) {
          switch (shortcut.modifier) {
            case "ctrl":
              modifierMatch = event.ctrlKey || event.metaKey;
              break;
            case "meta":
              modifierMatch = event.metaKey;
              break;
            case "shift":
              modifierMatch = event.shiftKey;
              break;
            case "alt":
              modifierMatch = event.altKey;
              break;
          }
        } else {
          // No modifier specified — ensure no modifier is pressed
          modifierMatch = !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
        }

        if (keyMatch && modifierMatch) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Hook for common music-related keyboard shortcuts.
 * Provides shortcuts for play/stop, navigation, and fullscreen.
 */
export function useMusicShortcuts(options: {
  onPlayStop?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onFullscreen?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}) {
  const { onPlayStop, onPrevious, onNext, onFullscreen, onSearch, enabled = true } = options;

  const shortcuts: KeyboardShortcut[] = [
    {
      key: " ",
      action: () => onPlayStop?.(),
      enabled: enabled && !!onPlayStop,
      description: "Play/Stop",
    },
    {
      key: "ArrowLeft",
      action: () => onPrevious?.(),
      enabled: enabled && !!onPrevious,
      description: "Previous",
    },
    {
      key: "ArrowRight",
      action: () => onNext?.(),
      enabled: enabled && !!onNext,
      description: "Next",
    },
    {
      key: "f",
      modifier: "meta",
      action: () => onFullscreen?.(),
      enabled: enabled && !!onFullscreen,
      description: "Toggle Fullscreen (⌘F)",
    },
    {
      key: "k",
      modifier: "meta",
      action: () => onSearch?.(),
      enabled: enabled && !!onSearch,
      description: "Global Search (⌘K)",
    },
  ];

  useKeyboardShortcuts(shortcuts, [onPlayStop, onPrevious, onNext, onFullscreen, onSearch, enabled]);
}

/**
 * Get the display label for a keyboard shortcut.
 */
export function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const modifierLabels: Record<string, string> = {
    ctrl: "Ctrl",
    meta: "⌘",
    shift: "Shift",
    alt: "Alt",
  };

  const keyLabels: Record<string, string> = {
    " ": "Space",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
  };

  const modifier = shortcut.modifier ? `${modifierLabels[shortcut.modifier]} + ` : "";
  const key = keyLabels[shortcut.key] || shortcut.key.toUpperCase();
  return `${modifier}${key}`;
}

/**
 * Get all default shortcut descriptions for help display.
 */
export function getDefaultShortcutDescriptions(): { key: string; label: string; description: string }[] {
  return [
    {
      key: "Space",
      label: "Space",
      description: "Play/Stop metronome, progression, or DAW playback",
    },
    {
      key: "←",
      label: "←",
      description: "Previous chord in progression or previous step",
    },
    {
      key: "→",
      label: "→",
      description: "Next chord in progression or next step",
    },
    {
      key: "⌘F",
      label: "⌘ + F",
      description: "Toggle fullscreen mode",
    },
    {
      key: "⌘K",
      label: "⌘ + K",
      description: "Open global search",
    },
  ];
}
