import { nanoid } from 'nanoid';

/**
 * Generate a short, URL-safe id.
 * Wrapped so tests can mock or replace the implementation.
 */
export function newId(size = 12): string {
  return nanoid(size);
}
