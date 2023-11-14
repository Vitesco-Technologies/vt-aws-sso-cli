import { SSOClient, GetRoleCredentialsCommand } from "@aws-sdk/client-sso";
import axios from "axios";
import chalk from "chalk";
import open, { apps } from "open";
import {
  writeCredentials,
  writeProfile,
  getCurrentSession,
} from "./config.mjs";
import { getToken } from "./token.mjs";
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

  const command = new GetRoleCredentialsCommand(input);
  const result = await client.send(command);

  return result.roleCredentials;
}

export async function getCredentialsAndWrite(account) {
  const { session } = await getArgs();

  const credentials = await getCredentials(account.accountId, account.role);
  const { vt_default_region } = await getCurrentSession();

  const name = account.shortId + "-" + account.role;

  await writeCredentials("default", credentials);
  await writeCredentials(name, credentials);

  await writeProfile(name, {
    sso_session: session,
    sso_account_id: account.accountId,
    sso_role_name: account.role,
    region: vt_default_region,
  });

  console.log(
    chalk.green(
      `AWS credentials set for account ${account.name}.\nYou can use credentials with your default profile or --profile ${name}\n`,
    ),
  );
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
  const destination = `https://${vt_default_region}.console.aws.amazon.com/`;
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
