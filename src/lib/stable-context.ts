import { createContext, type Context } from "react";

/**
 * Creates a React context whose identity survives dev-time hot module
 * replacement. Without this, editing a context module hands the consumer a
 * freshly created context object while the provider higher up the tree still
 * holds the previous one, which surfaces as
 * "useX must be used inside XProvider" and a blank screen until a full reload.
 */
const registry: Map<string, Context<unknown>> = ((
  globalThis as unknown as { __payflowContexts?: Map<string, Context<unknown>> }
).__payflowContexts ??= new Map());

export function createStableContext<T>(key: string, defaultValue: T): Context<T> {
  const existing = registry.get(key);
  if (existing) return existing as Context<T>;
  const created = createContext<T>(defaultValue);
  registry.set(key, created as Context<unknown>);
  return created;
}
