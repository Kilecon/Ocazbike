export function trimTrailingSlashes(pathname: string): string {
  let end = pathname.length;

  while (end > 0 && pathname.charCodeAt(end - 1) === 47) {
    end--;
  }

  return pathname.slice(0, end) || "/";
}
