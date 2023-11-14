import autocomplete from "./lib/autocomplete.mjs";
import { getArgs } from "./lib/cli.mjs";
import { getAccounts } from "./lib/accounts.mjs";
import { openConsole, getCredentialsAndWrite } from "./lib/assume.mjs";
import { getAccountRoles } from "./lib/accounts.mjs";
import { deleteCache, writeDefaultSessions } from "./lib/config.mjs";
import { showVersionInfo } from "./lib/version.mjs";

async function accountAutocomplete() {
  await getAccounts({ showSpinner: true });

  return autocomplete({
    message: "Which account?",
    pageSize: 7,
    source: async (input) => {
      const accounts = await getAccounts({
        showSpinner: false,
      });

      if (input && input.length) {
        return accounts.filter(
          (x) => x.name.search(new RegExp(input, "i")) !== -1,
        );
      } else {
        return accounts;
      }
    },
    rightKeyCallback() {},
  });
}

async function accountRolesAutocomplete(accountId) {
  const roles = await getAccountRoles(accountId);

  return autocomplete({
    message: "Which Role?",
    pageSize: 7,
    source: async (input) => {
      if (input && input.length) {
        return roles.filter((x) => x.search(new RegExp(input, "i")) !== -1);
      } else {
        return roles;
      }
    },
    rightKeyCallback(value) {
      openConsole(value);
    },
  });
}

async function handleAutocomplete() {
  const account = await accountAutocomplete();
  const result = await accountRolesAutocomplete(account);
  if (result) {
    await getCredentialsAndWrite(result);
  }
}

(async () => {
  await showVersionInfo();
  await writeDefaultSessions();

  const { session, logout, role, account } = await getArgs();
  if (logout) {
    await deleteCache(session);
    process.exit(0);
  }

  if (role && account) {
    const accounts = await getAccounts({ showSpinner: true });
    const found = accounts.find((x) => x.value.accountId === account);
    if (!found) {
      console.log(`Account with id ${account} not found`);
      process.exit(1);
    }

    const result = { ...found.value, role };
    await getCredentialsAndWrite(result);
    process.exit(0);
  }

  while (true) {
    await handleAutocomplete();
  }
})();

process.on("SIGINT", () => {
  process.exit();
});
