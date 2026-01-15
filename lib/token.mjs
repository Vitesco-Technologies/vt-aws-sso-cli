import TTLCache from "@isaacs/ttlcache";
import { createSpinner } from "nanospinner";
import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
} from "@aws-sdk/client-sso-oidc";
import open from "open";
import { deleteCache, getSession, readCache, writeCache } from "./config.mjs";
import { getArgs } from "./cli.mjs";
import { getRequestHandler } from "./utils.mjs";

const spinner = createSpinner("Waiting for aws token...");

function addTokenToConfig(config, token) {
  const { accessToken, expiresIn, refreshToken } = token;

  const expiresAt =
    new Date(new Date().getTime() + expiresIn * 1000)
      .toISOString()
      .split(".")[0] + "Z";

  Object.assign(config, { expiresAt, refreshToken, accessToken });
}

class AwsAssume {
  config = {
    clientId: "",
    clientSecret: "",
    clientSecretExpiresAt: 0,
    deviceCode: "",
    accessToken: "",
    expiresIn: 0,
    refreshToken: "",
  };

  deviceConfig = { deviceCode: "" };
  session = { name: "", startUrl: "", registrationScopes: "" };

  client = new SSOOIDCClient({ requestHandler: getRequestHandler() });

  constructor(sessionName) {
    this.session.name = sessionName;
  }

  async register() {
    const command = new RegisterClientCommand({
      clientName: "vt-aws-sso-cli",
      clientType: "public",
      scopes: [this.session.registrationScopes],
    });
    const { clientId, clientSecret, clientSecretExpiresAt } =
      await this.client.send(command);
    const registrationExpiresAt =
      new Date(clientSecretExpiresAt * 1000).toISOString().split(".")[0] + "Z";

    Object.assign(this.config, {
      clientId,
      clientSecret,
      registrationExpiresAt,
    });
  }

  async startDeviceAuthorization() {
    const input = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      startUrl: this.session.startUrl,
    };

    const command = new StartDeviceAuthorizationCommand(input);
    this.deviceConfig = await this.client.send(command);
    console.log(
      `Browser should open ${this.deviceConfig.verificationUriComplete} automatically. If not please click the url.`,
    );

    open(this.deviceConfig.verificationUriComplete, {
      wait: true,
    })
      .catch(() => {
        spinner.start();
      })
      .then(() => {
        spinner.start();
      });
  }

  async createToken() {
    const input = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      grantType: "urn:ietf:params:oauth:grant-type:device_code",
      deviceCode: this.deviceConfig.deviceCode,
    };
    const command = new CreateTokenCommand(input);
    const token = await this.client.send(command);
    addTokenToConfig(this.config, token);
  }

  async refreshToken() {
    const input = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      grantType: "refresh_token",
      refreshToken: this.config.refreshToken,
    };
    const command = new CreateTokenCommand(input);
    const token = await this.client.send(command);
    addTokenToConfig(this.config, token);
  }

  async waitForToken() {
    const promise = new Promise((resolve, reject) => {
      const intervalToken = setInterval(async () => {
        try {
          await this.createToken();

          resolve();
          clearInterval(intervalToken);

          spinner.success();
        } catch (err) {}
      }, 1000);
    });

    return promise;
  }

  async loadSession() {
    const session = await getSession(this.session.name);
    this.session.startUrl = session.sso_start_url;
    this.session.registrationScopes = session.sso_registration_scopes;
    this.client = new SSOOIDCClient({
      region: session.sso_region,
      requestHandler: getRequestHandler(),
    });
  }

  async handle() {
    await this.loadSession();
    this.config = await readCache(this.session.name);

    try {
      await this.refreshToken();
    } catch (err) {
      const registerNew = ["expired_token", "invalid_grant", "invalid_client"];
      if (registerNew.includes(err.error)) {
        await this.register();
        await this.startDeviceAuthorization();
        await this.waitForToken();
      } else {
        throw err;
      }
    }
    await writeCache(this.session.name, this.config);
  }
}

const cache = new TTLCache({ ttl: 15 * 60 * 1000 }); // cache token for 15 minutes

export async function refreshToken(refresh = false) {
  const { session } = await getArgs();

  if (refresh) {
    await deleteCache(session);
  }

  const instance = new AwsAssume(session);
  await instance.handle();

  cache.set("token", instance.config.accessToken);
}

export async function getToken() {
  const cachedToken = cache.get("token");
  if (cachedToken) {
    return cachedToken;
  }

  await refreshToken();

  return cache.get("token");
}
