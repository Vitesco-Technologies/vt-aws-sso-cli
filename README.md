# vt-aws-sso-cli

**vt-aws-sso-cli** is an easy to use tool for AWS account login on the commandline. **aws-sso** creates AWS credentials in your user profile. You can now use [awscli](https://aws.amazon.com/cli/) commands in your AWS account.

### Steps

1. Open a terminal, PowerShell window or DOS box and run **aws-sso**.
2. Open a **second** terminal, PowerShell window or DOS box to execute your [awscli](https://aws.amazon.com/cli/) commands.
3. There isn't actually a step 3. If you keep the **first** terminal, PowerShell window or DOS box open, it will refresh your session token automatically.

## Installation

### Windows

Download the [client](https://github.com/Vitesco-Technologies/vt-aws-sso-cli/releases/latest)

### Linux(x64)

```bash
sudo -E curl -sL https://github.com/Vitesco-Technologies/vt-aws-sso-cli/releases/latest | grep browser_download_url | grep linux-x64 | cut -d '"' -f4 | xargs -n1 sudo curl -sL -o /usr/local/bin/aws-sso && sudo chmod 755 /usr/local/bin/aws-sso
```

### Linux(arm64)

```bash
sudo -E curl -sL https://github.com/Vitesco-Technologies/vt-aws-sso-cli/releases/latest | grep browser_download_url | grep linux-arm64 | cut -d '"' -f4 | xargs -n1 sudo curl -sL -o /usr/local/bin/aws-sso && sudo chmod 755 /usr/local/bin/aws-sso
```

### macOS(x64)

```bash
sudo -E curl -sL https://github.com/Vitesco-Technologies/vt-aws-sso-cli/releases/latest | grep browser_download_url | grep macos-x64 | cut -d '"' -f4 | xargs -n1 sudo curl -sL -o /usr/local/bin/aws-sso && sudo chmod 755 /usr/local/bin/aws-sso
```

### macOS(arm64)

```bash
sudo -E curl -sL https://github.com/Vitesco-Technologies/vt-aws-sso-cli/releases/latest | grep browser_download_url | grep macos-arm64 | cut -d '"' -f4 | xargs -n1 sudo curl -sL -o /usr/local/bin/aws-sso && sudo chmod 755 /usr/local/bin/aws-sso
```

**Note** Due to mandatory code signing on macOS the executable has to be signed. An ad-hoc signature is sufficient. Sign your executable with the following command:

```bash
sudo codesign --sign - /usr/local/bin/aws-sso
```
