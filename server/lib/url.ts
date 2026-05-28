/** Strip one or more trailing slashes so we can append path segments cleanly. */
export function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
