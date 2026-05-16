import { create } from 'zustand';
import { persist, makePersistOptions } from './persist';
import { newId } from '../lib/id';
import type { Session, Turn, CommentAnnotation, DrawAnnotation, DrawStroke } from '../types/domain';

export interface DesignStoreState {
  sessions: Record<string, Session>;
  sessionOrder: string[];
  activeSessionId: string | null;
  /** Ordered list of session ids currently open as tabs. */
  openTabIds: string[];

  isStreaming: boolean;
  streamError: string | null;

  createSession(): string;
  deleteSession(id: string): void;
  selectSession(id: string): void;
  openTab(id: string): void;
  closeTab(id: string): void;
  reorderTabs(ids: string[]): void;
  renameSession(id: string, title: string): void;
  setSessionNotes(id: string, notes: string): void;
  appendUserTurn(text: string): void;
  appendAssistantDelta(delta: string): void;
  finalizeAssistantTurn(opts?: { sdkSessionId?: string }): void;
  setCurrentHtml(html: string): void;
  setStreaming(value: boolean): void;
  setStreamError(message: string | null): void;

  addComment(input: { x: number; y: number; text: string }): string | null;
  markCommentSent(id: string): void;
  deleteComment(id: string): void;
  clearComments(status?: 'open' | 'sent'): void;

  addDrawing(input: { note: string; strokes: DrawStroke[] }): string | null;
  markDrawingSent(id: string): void;
  deleteDrawing(id: string): void;
  clearDrawings(status?: 'open' | 'sent'): void;
}

const DEFAULT_TITLE = 'Untitled design';

function makeSession(): Session {
  const now = Date.now();
  return {
    id: newId(),
    title: DEFAULT_TITLE,
    turns: [],
    currentHtml: '',
    createdAt: now,
    updatedAt: now,
  };
}

function makeTurn(role: Turn['role'], content: string): Turn {
  return {
    id: newId(),
    role,
    content,
    createdAt: Date.now(),
  };
}

export const useDesignStore = create<DesignStoreState>()(
  persist(
    (set, get) => ({
      sessions: {},
      sessionOrder: [],
      activeSessionId: null,
      openTabIds: [],
      isStreaming: false,
      streamError: null,

      createSession() {
        const session = makeSession();
        set((s) => ({
          sessions: { ...s.sessions, [session.id]: session },
          sessionOrder: [session.id, ...s.sessionOrder],
          openTabIds: s.openTabIds.includes(session.id) ? s.openTabIds : [...s.openTabIds, session.id],
          activeSessionId: session.id,
        }));
        return session.id;
      },

      deleteSession(id) {
        const state = get();
        if (!state.sessions[id]) return;
        const { [id]: _removed, ...remaining } = state.sessions;
        const order = state.sessionOrder.filter((sid) => sid !== id);
        const tabs = state.openTabIds.filter((sid) => sid !== id);
        let nextActive = state.activeSessionId;
        if (state.activeSessionId === id) {
          nextActive = tabs[tabs.length - 1] ?? order[0] ?? null;
        }
        set({
          sessions: remaining,
          sessionOrder: order,
          openTabIds: tabs,
          activeSessionId: nextActive,
        });
      },

      selectSession(id) {
        if (!get().sessions[id]) return;
        set((s) => ({
          activeSessionId: id,
          openTabIds: s.openTabIds.includes(id) ? s.openTabIds : [...s.openTabIds, id],
        }));
      },

      openTab(id) {
        if (!get().sessions[id]) return;
        set((s) => ({
          activeSessionId: id,
          openTabIds: s.openTabIds.includes(id) ? s.openTabIds : [...s.openTabIds, id],
        }));
      },

      closeTab(id) {
        const state = get();
        if (!state.openTabIds.includes(id)) return;
        const idx = state.openTabIds.indexOf(id);
        const tabs = state.openTabIds.filter((sid) => sid !== id);
        let nextActive = state.activeSessionId;
        if (state.activeSessionId === id) {
          // Prefer the tab to the right, else to the left, else null.
          nextActive = tabs[idx] ?? tabs[idx - 1] ?? null;
        }
        set({ openTabIds: tabs, activeSessionId: nextActive });
      },

      reorderTabs(ids) {
        // Only accept ids that exist as open tabs (preserve invariant).
        const current = get().openTabIds;
        const valid = ids.filter((id) => current.includes(id));
        if (valid.length !== current.length) return;
        set({ openTabIds: valid });
      },

      appendUserTurn(text) {
        const trimmed = text.trim();
        if (!trimmed) return;
        let { activeSessionId } = get();
        if (!activeSessionId) {
          activeSessionId = get().createSession();
        }
        const turn = makeTurn('user', trimmed);
        const now = Date.now();
        set((s) => {
          const session = s.sessions[activeSessionId!];
          if (!session) return s;
          const isFirstUserTurn = !session.turns.some((t) => t.role === 'user');
          const nextTitle =
            isFirstUserTurn && session.title === DEFAULT_TITLE
              ? trimmed.slice(0, 40)
              : session.title;
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId!]: {
                ...session,
                title: nextTitle,
                turns: [...session.turns, turn],
                updatedAt: now,
              },
            },
          };
        });
      },

      appendAssistantDelta(delta) {
        if (!delta) return;
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        const now = Date.now();
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session) return s;
          const turns = [...session.turns];
          const last = turns[turns.length - 1];
          if (last && last.role === 'assistant') {
            turns[turns.length - 1] = { ...last, content: last.content + delta };
          } else {
            turns.push(makeTurn('assistant', delta));
          }
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: {
                ...session,
                turns,
                updatedAt: now,
              },
            },
          };
        });
      },

      finalizeAssistantTurn(opts) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session) return s;
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: {
                ...session,
                sdkSessionId: opts?.sdkSessionId ?? session.sdkSessionId,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      setCurrentHtml(html) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session) return s;
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: {
                ...session,
                currentHtml: html,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      setStreaming(value) {
        set({ isStreaming: value });
      },

      setStreamError(message) {
        set({ streamError: message });
      },

      renameSession(id, title) {
        const next = title.trim();
        if (!next) return;
        set((s) => {
          const session = s.sessions[id];
          if (!session) return s;
          return {
            sessions: {
              ...s.sessions,
              [id]: { ...session, title: next, updatedAt: Date.now() },
            },
          };
        });
      },

      setSessionNotes(id, notes) {
        set((s) => {
          const session = s.sessions[id];
          if (!session) return s;
          return {
            sessions: {
              ...s.sessions,
              [id]: { ...session, notes, updatedAt: Date.now() },
            },
          };
        });
      },

      addComment({ x, y, text }) {
        const body = text.trim();
        if (!body) return null;
        const { activeSessionId } = get();
        if (!activeSessionId) return null;
        const comment: CommentAnnotation = {
          id: newId(),
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          text: body,
          status: 'open',
          createdAt: Date.now(),
        };
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session) return s;
          const comments = [...(session.comments ?? []), comment];
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, comments, updatedAt: Date.now() },
            },
          };
        });
        return comment.id;
      },

      markCommentSent(id) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session?.comments) return s;
          const comments = session.comments.map((c) =>
            c.id === id ? { ...c, status: 'sent' as const } : c,
          );
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, comments },
            },
          };
        });
      },

      deleteComment(id) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session?.comments) return s;
          const comments = session.comments.filter((c) => c.id !== id);
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, comments },
            },
          };
        });
      },

      clearComments(status) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session?.comments) return s;
          const comments = status
            ? session.comments.filter((c) => c.status !== status)
            : [];
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, comments },
            },
          };
        });
      },

      addDrawing({ note, strokes }) {
        if (strokes.length === 0) return null;
        const { activeSessionId } = get();
        if (!activeSessionId) return null;
        const drawing: DrawAnnotation = {
          id: newId(),
          note: note.trim(),
          strokes,
          status: 'open',
          createdAt: Date.now(),
        };
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session) return s;
          const drawings = [...(session.drawings ?? []), drawing];
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, drawings, updatedAt: Date.now() },
            },
          };
        });
        return drawing.id;
      },

      markDrawingSent(id) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session?.drawings) return s;
          const drawings = session.drawings.map((d) =>
            d.id === id ? { ...d, status: 'sent' as const } : d,
          );
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, drawings },
            },
          };
        });
      },

      deleteDrawing(id) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session?.drawings) return s;
          const drawings = session.drawings.filter((d) => d.id !== id);
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, drawings },
            },
          };
        });
      },

      clearDrawings(status) {
        const { activeSessionId } = get();
        if (!activeSessionId) return;
        set((s) => {
          const session = s.sessions[activeSessionId];
          if (!session?.drawings) return s;
          const drawings = status
            ? session.drawings.filter((d) => d.status !== status)
            : [];
          return {
            sessions: {
              ...s.sessions,
              [activeSessionId]: { ...session, drawings },
            },
          };
        });
      },
    }),
    makePersistOptions<DesignStoreState>({
      name: 'cds:design',
      partialize: (state) => ({
        sessions: state.sessions,
        sessionOrder: state.sessionOrder,
        activeSessionId: state.activeSessionId,
        openTabIds: state.openTabIds,
      }),
    }),
  ),
);
