import {
  SSOClient,
  ListAccountsCommand,
  ListAccountRolesCommand,
} from "@aws-sdk/client-sso";
import { createSpinner } from "nanospinner";
import { logWarning, httpGet, getRequestHandler } from "./utils.mjs";
import TTLCache from "@isaacs/ttlcache";
import {
  getCurrentSession,
  getSession,
  readAccountCache,
  writeAccountCache,
} from "./config.mjs";
import { getToken } from "./token.mjs";
import { getArgs } from "./cli.mjs";

const spinner = createSpinner("Waiting for accounts...");

export async function getAccountRoles(account) {
  const session = await getCurrentSession();
  const client = new SSOClient({
    region: session.sso_region,
    requestHandler: getRequestHandler(),
  });

  const token = await getToken();
  const command = new ListAccountRolesCommand({
    accessToken: token,
    accountId: account.accountId,
  });
  const response = await client.send(command);

  const roles = response.roleList
    .map((x) => {
      return {
        name: x.roleName,
        value: {
          role: x.roleName,
          accountId: account.accountId,
          shortId: account.shortId,
          name: account.name,
        },
      };
    })
    .sort((a, b) => (a.name > b.name ? 1 : -1));

  roles.push({ name: "← Go back" });
  return roles;
}

async function getAccountsInfo(sessionName, url) {
  try {
    const data = await httpGet(url);
    if (Array.isArray(data)) {
      await writeAccountCache(sessionName, data);
    } else {
      throw new Exception("invalid response.");
    }
  } catch (err) {
    logWarning("Warning: using accounts info from cache file.");
  }

  return readAccountCache(sessionName);
}

async function listAccounts(token, accounts = [], nextToken = "") {
  const session = await getCurrentSession();
  const client = new SSOClient({
    region: session.sso_region,
    requestHandler: getRequestHandler(),
  });

  const input = {
    maxResults: 100,
    accessToken: token,
  };

  if (nextToken) {
    input.nextToken = nextToken;
  }

  const command = new ListAccountsCommand(input);
  const result = await client.send(command);
  accounts.push(...result.accountList);

  if (result.nextToken) {
    await listAccounts(token, accounts, result.nextToken);
  }

  return accounts;
}

let infoCache = [];
export async function getAccountsWithoutCache({ showSpinner }) {
  const token = await getToken();
  const sessionName = (await getArgs()).session;

  if (showSpinner) {
    spinner.start();
  }

  const session = await getSession(sessionName);

  const accounts = await listAccounts(token);

  if (!infoCache.length) {
    infoCache = await getAccountsInfo(
      sessionName,
      session.vt_accounts_meta_url,
    );
  }

  if (showSpinner) {
    spinner.success();
  }

  return accounts
    .map((account) => {
      const found = infoCache.find(
        (x) => x.aws_account_id === account.accountId,
      );

      let name = account.accountId;
      if (found) {
        name = found
          ? `${found.account_id} - ${found.account_description}`
          : `${account.accountName}`;
      }

      return {
        value: {
          accountId: account.accountId,
          name,
          shortId: found ? found.account_id : account.accountId,
        },
        name,
      };
    })
    .sort((a, b) => (a.name > b.name ? 1 : -1));
}

const cache = new TTLCache({ ttl: 15 * 1000 });
export async function getAccounts({ showSpinner }) {
  const cached = cache.get("accounts");

  if (cached) {
    return cached;
  }

  const accounts = await getAccountsWithoutCache({ showSpinner });
  cache.set("accounts", accounts);

  return accounts;
}
