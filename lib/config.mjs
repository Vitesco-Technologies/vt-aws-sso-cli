import os from "os";
import { readFile, writeFile, access, mkdir, unlink } from "fs/promises";
import { join } from "path";
import ini from "ini";
import crypto from "crypto";
import { getArgs } from "./cli.mjs";

const oshome = os.homedir();
const awsDir = join(oshome, "/.aws/");
const cacheDir = join(awsDir, "/sso/cache/");
const configFile = join(awsDir, "config");
const credentialsFile = join(awsDir, "credentials");

function getHash(sessionName) {
  const shasum = crypto.createHash("sha1");
  shasum.update(sessionName);
  return shasum.digest("hex");
}

async function prepareConfig() {
  try {
    await access(cacheDir);
  } catch (_) {
    await mkdir(cacheDir, { recursive: true });
  }
  try {
    await access(configFile);
  } catch (_) {
    await writeFile(configFile, "");
  }
  try {
    await access(credentialsFile);
  } catch (_) {
    await writeFile(credentialsFile, "");
  }
}

export async function getCliConfig() {
 return import("../config.json")
}

export async function writeDefaultSessions() {
  await prepareConfig();

  const awsConfig = ini.parse(await readFile(configFile, "utf-8"));

  const sessions = (await getCliConfig()).sessions;

  Object.keys(sessions).forEach((key) => {
    if (!awsConfig[key]) {
      awsConfig[key] = sessions[key];
    } else {
      awsConfig[key] = {...sessions[key], ...awsConfig[key]};
    }
  });

  await writeFile(configFile, ini.stringify(awsConfig));
}

export async function writeCredentials(profileName, credentials) {
  const config = ini.parse(await readFile(credentialsFile, "utf-8"));

  const formatted = {
    aws_access_key_id: credentials.accessKeyId,
    aws_secret_access_key: credentials.secretAccessKey,
    aws_session_token: credentials.sessionToken,
  };
  config["default"] = formatted;
  config[profileName] = formatted;

  await writeFile(credentialsFile, ini.stringify(config));
}

export async function writeProfile(profileName, profileConfig) {
  const config = ini.parse(await readFile(configFile, "utf-8"));

  config[`profile ${profileName}`] = profileConfig;

  await writeFile(configFile, ini.stringify(config));
}

export async function getSession(sessioName) {
  const config = ini.parse(await readFile(configFile, "utf-8"));

  return config["sso-session " + sessioName];
}

export async function getCurrentSession() {
  const sessionName = (await getArgs()).session;

  return await getSession(sessionName);
}

export async function writeCache(sessionName, config) {
  const session = await getSession(sessionName);
  const cache = {
    startUrl: session.sso_start_url,
    region: session.sso_region,
    ...config,
  };

  const cacheFile = join(cacheDir, getHash(sessionName) + ".json");
  await writeFile(cacheFile, JSON.stringify(cache, null, 2));
}

export async function deleteCache(sessionName) {
  const cacheFile = join(cacheDir, getHash(sessionName) + ".json");
  try {
    await unlink(cacheFile);
  } catch (_) {}
}

export async function readCache(sessionName) {
  const cacheFile = join(cacheDir, getHash(sessionName) + ".json");
  try {
    await access(cacheFile);
  } catch (_) {
    return {};
  }
  return JSON.parse(await readFile(cacheFile, "utf8"));
}

export async function readAccountCache(sessionName) {
  const cacheFile = join(cacheDir, sessionName + "-accounts.json");
  try {
    await access(cacheFile);
  } catch (_) {
    return [];
  }
  return JSON.parse(await readFile(cacheFile, "utf8"));
}

export async function writeAccountCache(sessionName, accounts) {
  const cacheFile = join(cacheDir, sessionName + "-accounts.json");

  return await writeFile(cacheFile, JSON.stringify(accounts));
}
