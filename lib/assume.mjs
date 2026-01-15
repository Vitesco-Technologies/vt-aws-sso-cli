import {
  SSOClient,
  GetRoleCredentialsCommand,
  SSOServiceException,
} from "@aws-sdk/client-sso";
import axios from "axios";
import open, { apps } from "open";
import { logSuccess, logWarning } from "./utils.mjs";
import {
  writeCredentials,
  writeProfile,
  getCurrentSession,
} from "./config.mjs";
import { getToken, refreshToken } from "./token.mjs";
import { getArgs } from "./cli.mjs";

async function getCredentials(accountId, roleName) {
  const session = await getCurrentSession();

  const client = new SSOClient({ region: session.sso_region });

  const token = await getToken();

  const input = {
    accessToken: token,
    accountId,
    roleName,
  };

  try {
    const command = new GetRoleCredentialsCommand(input);
    const result = await client.send(command);

    return result.roleCredentials;
  } catch (err) {
    if (err instanceof SSOServiceException && err.message === "No access") {
      logWarning(
        "User is not allowed to get credentials for account. Did you switch User? Please login again."
      );
      await refreshToken(true);
      await getCredentials(accountId, roleName);
    } else {
      throw err;
    }
  }
}

export async function getCredentialsAndWrite(account) {
  const { session, skipDefaultProfile } = await getArgs();

  const credentials = await getCredentials(account.accountId, account.role);
  const { vt_default_region, sso_start_url, sso_region } =
    await getCurrentSession();

  const name = account.shortId + "-" + account.role;

  if (!skipDefaultProfile) {
    await writeCredentials("default", credentials);
  }
  await writeCredentials(name, credentials);

  await writeProfile(name, {
    sso_session: session,
    sso_start_url: sso_start_url,
    sso_region: sso_region,
    sso_account_id: account.accountId,
    sso_role_name: account.role,
    region: vt_default_region || "eu-central-1",
  });

  if (!skipDefaultProfile) {
    logSuccess(
      `AWS credentials set for account ${account.name}.\nYou can use the credentials with your default profile or --profile ${name} in the aws cli.\n`
    );
  } else {
    logSuccess(
      `AWS credentials set for account ${account.name}.\nYou can use the credentials with --profile ${name} in the aws cli.\n`
    );
  }
}

function getRandomColor() {
  const colors = [
    "blue",
    "turquoise",
    "green",
    "yellow",
    "orange",
    "red",
    "pink",
    "purple",
  ];

  const randomIndex = Math.floor(Math.random() * colors.length);

  return colors[randomIndex];
}

export async function openConsole({ accountId, role, name }) {
  const { accessKeyId, secretAccessKey, sessionToken } = await getCredentials(
    accountId,
    role,
  );

  const credentials = {
    sessionId: accessKeyId,
    sessionKey: secretAccessKey,
    sessionToken,
  };

  const baseUrl = "https://signin.aws.amazon.com/federation";

  const tokenUrl = `${baseUrl}?Action=getSigninToken&SessionDuration=${
    60 * 60 * 8
  }&Session=${encodeURIComponent(JSON.stringify(credentials))}`;
  const { data } = await axios.get(tokenUrl);
  const { SigninToken } = data;

  const { vt_default_region } = await getCurrentSession();
  const destination = `https://${
    vt_default_region || "eu-central-1"
  }.console.aws.amazon.com/`;
  const loginUrl = `${baseUrl}?Action=login&Destination=${encodeURIComponent(
    destination,
  )}&SigninToken=${encodeURIComponent(SigninToken)}`;

  await open(
    `ext+container:name=${encodeURIComponent(
      name,
    )}&color=${getRandomColor()}&icon=fingerprint&url=${encodeURIComponent(
      loginUrl,
    )}`,
    { app: { name: apps.firefox } },
  );
}
