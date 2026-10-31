# Store publishing

The **Deploy extensions to web stores** workflow validates the source and UI before submitting the same validated packages to the existing Chrome and Firefox listings. Jobs run independently: a Chrome failure does not prevent Firefox submission, or vice versa.

## Normal releases

1. Update `package.json` and both manifests together, and write the changelog.
2. Merge to `main` with passing CI. Download and smoke-test the Chrome/Firefox packages.
3. Create a stable GitHub release tagged `v<package version>` at that commit, e.g. `v4.8.0`. Publishing it submits both stores automatically.
4. Check both store dashboards for review results, warnings, and any changed listing/privacy requirements. Store acceptance and rollout are separate from a successful GitHub upload.

A source push, draft release or GitHub prerelease does not submit stores. The tag must match the package version. Store versions must increase; to undo a bad release, publish a corrected build with a higher version.

For credential checks, run **Actions → Deploy extensions to web stores → Run workflow** on `main`, leave **operation = verify**, and choose `both` or one store. Verification performs authenticated GET requests only; it does not upload or submit a build. For an explicit manual submission choose **publish**. The workflow serializes deployments to avoid simultaneous uploads.

If one store fails, rerun only the failed job or dispatch `publish` for that store. Chrome skips the same version already published or awaiting review. Firefox skips a listed version already approved or awaiting review. A disabled/rejected existing Firefox version requires dashboard attention and a new version number; the workflow never silently replaces or withdraws another submission.

## Google: short-lived credentials, no private key

Chrome uses the official Web Store **API v2**. GitHub exchanges an OIDC identity for a service account access token lasting ten minutes. No Google refresh token or service account key is stored in GitHub.

The dedicated project is `souffleur-publishing-2026`. Run the reviewed setup script with an account permitted to manage this project:

```sh
bash scripts/setup-google-publishing.sh souffleur-publishing-2026
```

The script enables Chrome Web Store, IAM Credentials and Security Token Service APIs; creates the dedicated service account, identity pool and OIDC provider; then grants `roles/iam.workloadIdentityUser` on that service account to this repository's identity. It grants **no project-level roles**, creates no private key and attaches no billing account. The provider condition requires all of:

- Immutable GitHub owner ID `55131509` and repository ID `953732969`.
- `.github/workflows/deploy.yml` in `piotrowskiadam/souffleur`.
- A manual dispatch on `main`, or a release on a `v*` tag.

PRs, forks, other workflows and branch pushes cannot authenticate through this provider. Protect repository write/release access accordingly: someone able to change the trusted workflow or publish its release tags controls store publishing.

In **Chrome Web Store Developer Dashboard → Settings → Service account**, add:

```
souffleur-publisher@souffleur-publishing-2026.iam.gserviceaccount.com
```

Google grants this service account API management access to **all items under the Tingler publisher**, currently Souffleur. The workflow addresses only Souffleur's existing extension ID; the dashboard grant itself is publisher-wide.

Set these **GitHub Actions repository variables**, using the provider resource printed by the setup script:

| Variable | Value |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT` | `souffleur-publishing-2026` |
| `GOOGLE_SERVICE_ACCOUNT` | `souffleur-publisher@souffleur-publishing-2026.iam.gserviceaccount.com` |
| `GOOGLE_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project number>/locations/global/workloadIdentityPools/souffleur-github/providers/souffleur` |
| `CHROME_PUBLISHER_ID` | `4f0fffd3-8066-448a-a5a8-b1398c6c37d5` |
| `CHROME_EXTENSION_ID` | `jpencajlhojahjjokfkjbjnchdbacpfn` |

These identifiers are public configuration. Only the Chrome job can request GitHub OIDC tokens. Verification requests Google's read-only Chrome scope; publishing requests the Chrome management scope. Allow several minutes for a new Google IAM binding to propagate, then run `verify`.

To revoke access, remove the service account from the Chrome publisher settings and disable/remove its identity provider. Keep the dedicated project separate from unrelated Cloud resources.

## Firefox: existing AMO secrets

The workflow uses repository Actions secrets **`AMO_JWT_ISSUER`** and **`AMO_JWT_SECRET`**, matching the names already configured for this repository. They must belong to an author of the existing add-on GUID `{0f0bacc8-3712-4a6a-8e2f-a7a900d91b2f}`. Do not rename them to `MOZILLA_JWT_*`. Keys are managed at [AMO API credentials](https://addons.mozilla.org/en-US/developers/addon/api/key/).

The verification script authenticates against the private account-profile endpoint and checks add-on authorship; fetching a public listing alone would not prove credentials work. Publication uses the locked `web-ext` version with `channel: listed` and supplies the reviewer source ZIP. It unpacks the validated Firefox package rather than rebuilding source in the publishing job. `web-ext` rearchives those validated files for submission.

## Reviewer source and reproducibility

`npm run package` builds both extension ZIPs. After committing all source/build inputs, `npm run package:source` creates `artifacts/souffleur-source-<version>.zip` with `git archive HEAD` and an explicit allowlist of tracked source, build tools, lockfile, tests and documentation. It refuses dirty inputs, excludes credentials, browser profiles, dependencies, historical release ZIPs and generated output, and gives reviewers the exact release commit's build inputs.

To reproduce from that source archive with Node 22.12+:

```sh
npm ci
npm run build
npm run lint:firefox
```

`dist/firefox` contains the submitted extension files. ZIP timestamps/compression may differ; the source and bundled file contents are the review inputs. CI uploads both extension ZIPs and the source ZIP together.

## References

- [Chrome service account access](https://developer.chrome.com/docs/webstore/service-accounts)
- [Chrome Web Store API v2](https://developer.chrome.com/docs/webstore/api/reference/rest)
- [GitHub Actions Google authentication](https://github.com/google-github-actions/auth)
- [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc)
- [Mozilla API account authentication](https://mozilla.github.io/addons-server/topics/api/accounts.html)
- [Mozilla add-on version API](https://mozilla.github.io/addons-server/topics/api/addons.html)
