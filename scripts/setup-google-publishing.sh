#!/usr/bin/env bash
# Run only after reviewing the trust grant described in docs/PUBLISHING.md.
# Intended for Google Cloud Shell (gcloud is preinstalled); no private key is made.
set -euo pipefail

publishing_project="${1:?Usage: setup-google-publishing.sh PROJECT_ID}"
service_account="souffleur-publisher@${publishing_project}.iam.gserviceaccount.com"
identity_pool="souffleur-github"
identity_provider="souffleur"
repository_id="953732969"
owner_id="55131509"

# Keep this project dedicated to publishing. Do not attach a billing account here.
gcloud projects describe "$publishing_project" --format='value(projectId)' >/dev/null
gcloud services enable chromewebstore.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$publishing_project"
if ! gcloud iam service-accounts describe "$service_account" --project="$publishing_project" >/dev/null 2>&1; then
  gcloud iam service-accounts create souffleur-publisher --display-name='Souffleur store publisher' --project="$publishing_project"
fi
if ! gcloud iam workload-identity-pools describe "$identity_pool" --location=global --project="$publishing_project" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$identity_pool" --location=global --display-name='Souffleur GitHub Actions' --project="$publishing_project"
fi

mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.workflow_ref=assertion.workflow_ref,attribute.ref=assertion.ref,attribute.event_name=assertion.event_name'
condition="assertion.repository_id == '${repository_id}' && assertion.repository_owner_id == '${owner_id}' && ((assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'piotrowskiadam/souffleur/.github/workflows/deploy.yml@refs/heads/main' && assertion.event_name == 'workflow_dispatch') || (assertion.ref.startsWith('refs/tags/v') && assertion.workflow_ref.startsWith('piotrowskiadam/souffleur/.github/workflows/deploy.yml@refs/tags/v') && assertion.event_name == 'release'))"
if gcloud iam workload-identity-pools providers describe "$identity_provider" --workload-identity-pool="$identity_pool" --location=global --project="$publishing_project" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$identity_provider" --workload-identity-pool="$identity_pool" --location=global --project="$publishing_project" --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping="$mapping" --attribute-condition="$condition"
else
  gcloud iam workload-identity-pools providers create-oidc "$identity_provider" --workload-identity-pool="$identity_pool" --location=global --project="$publishing_project" --display-name='Souffleur release workflow' --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping="$mapping" --attribute-condition="$condition"
fi
pool_name="$(gcloud iam workload-identity-pools describe "$identity_pool" --location=global --project="$publishing_project" --format='value(name)')"
gcloud iam service-accounts add-iam-policy-binding "$service_account" --project="$publishing_project" --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/${pool_name}/attribute.repository_id/${repository_id}"

# These identifiers are public configuration, not credentials.
printf '\nGOOGLE_CLOUD_PROJECT=%s\nGOOGLE_SERVICE_ACCOUNT=%s\n' "$publishing_project" "$service_account"
printf 'GOOGLE_WORKLOAD_IDENTITY_PROVIDER=%s/providers/%s\n' "$pool_name" "$identity_provider"
printf '\nAdd this service account to Chrome Web Store publisher settings, then run the GitHub verify operation.\n'
