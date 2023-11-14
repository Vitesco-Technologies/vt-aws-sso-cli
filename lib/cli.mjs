import { program } from "commander";
import { getVersion } from "./version.mjs";
import { getCliConfig } from "./config.mjs";

let opts;
export async function getArgs() {
  if (opts) {
    return opts;
  }

  const version = await getVersion();

  program.version(version);

  const config = await getCliConfig();

  program
    .option(
      "-s, --session [value]",
      "A sso-session from ~/.aws/config.",
      config.default_session,
    )
    .option(
      "-r, --role [value]",
      "The name of a role which can be assumed. For example VT-DevOps. Must be used in combination with -a.",
    )

    .option(
      "-a, --account [value]",
      "The account in which the role should be assumed. For example 015572128213.",
    );

  program.option("-l, --logout", "Logout the defined sso-session.");

  opts = await program.parse(process.argv).opts();

  return opts;
}
