#!/usr/bin/env bash
set -e

npm install && sudo npx playwright install-deps && npx playwright install

# 1. Load local .env if present
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
elif [ -f .env.example ] && [ ! -f .env ]; then
  echo "⚠️ Warning: No .env file found. Copying .env.example to .env..."
  cp .env.example .env
  export $(grep -v '^#' .env | xargs)
fi

# 2. Check if required variables are set

if [ -z "$AWS_PROJECT_ACCOUNT_ID" ] || [ "$AWS_PROJECT_ACCOUNT_ID" = "your-project-account-id-here" ]; then
  echo "⚠️ Notice: AWS_PROJECT_ACCOUNT_ID is not configured yet in .env."
  echo " Please edit your local .env file and update AWS_PROJECT_ACCOUNT_ID."
  exit 0
fi

if [ -z "$AWS_SSO_START_URL" ] || [ "$AWS_SSO_START_URL" = "your-sso-start-url-here" ]; then
  echo "⚠️ Notice: AWS_SSO_START_URL is not configured yet in .env."
  echo " Please edit your local .env file and update AWS_SSO_START_URL."
  exit 0
fi

echo "Using ${AWS_SSO_ROLE_NAME:-AdministratorAccess} as the sso_role_name"
mkdir -p $HOME/.aws

cat << EOF > $HOME/.aws/config
[profile default]
sso_session = spatineo
sso_account_id = ${AWS_PROJECT_ACCOUNT_ID}
sso_role_name = ${AWS_SSO_ROLE_NAME:-AdministratorAccess}
region = eu-north-1
output = json

[sso-session spatineo]
sso_start_url = ${AWS_SSO_START_URL}
sso_region = ${AWS_SSO_REGION:-eu-north-1}
EOF

echo "✅ AWS config generated successfully."