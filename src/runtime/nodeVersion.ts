const MINIMUM_MAJOR = 22;
const MINIMUM_MINOR = 19;

/** Pi needs Node 22.19 or newer. */
export function nodeVersionBlock(version = process.versions.node): string | null {
  const [major, minor] = version.split(".").map((part) => Number(part));
  if (!Number.isFinite(major) || !Number.isFinite(minor) || major < MINIMUM_MAJOR || (major === MINIMUM_MAJOR && minor < MINIMUM_MINOR)) {
    return `Warning: Node ${version} is older than 22.19.0. bb opened from the macOS Dock or Finder can miss the terminal Node. Tools stay available.`;
  }
  return null;
}
