import { getCliConfig } from "./config.mjs";
import { httpGet, logWarning } from "./utils.mjs";

async function getLatestVersion() {
  const config = await getCliConfig();

  try {
    const data = await httpGet(config.version_url);
    return data.name;
  } catch (err) {
    return "";
  }
}

export async function getVersion() {
  const version = (await import("../package.json")).version;

  if (!version) {
    throw new Error("Could not detect version of cli.");
  }

  return version;
}

export async function showVersionInfo() {
  const config = await getCliConfig();
  const latest = await getLatestVersion();
  const current = await getVersion();

  if (latest && current && latest !== current) {
    logWarning(
      `New version ${latest} available: ${config.download_url}\nCurrent version: ${current}\n`
    );
  }
}
