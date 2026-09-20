# Semver Labeling

[![CI](https://github.com/JKBeeman92/semver-labeling/actions/workflows/ci.yml/badge.svg)](https://github.com/JKBeeman92/semver-labeling/actions/workflows/ci.yml)

A reusable GitHub Action that detects a semantic version in a PR title, applies a label based on the release type, and exposes the parsed version data as step outputs — so downstream steps can branch on it without re-parsing.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `token` | ✅ | — | GitHub token for API access (`secrets.GITHUB_TOKEN`) |
| `major_label` | ❌ | `major-release` | Label for major version bumps (e.g. `2.0.0`) |
| `minor_label` | ❌ | `minor-release` | Label for minor version bumps (e.g. `1.1.0`) |
| `patch_label` | ❌ | `patch-release` | Label for patch version bumps (e.g. `1.0.1`) |
| `pre_release_label` | ❌ | `pre-release` | Label for pre-release versions (e.g. `1.2.3-beta.1`, `2.0.0-rc.2`) |

Only `token` is required. Override any label input to match your project's labeling convention.

## Outputs

| Output | Example | Description |
|---|---|---|
| `matched` | `"true"` | `"true"` if a semver was found in the PR title, `"false"` otherwise |
| `semver` | `"2.3.1-beta.1"` | Full version string including any pre-release identifier |
| `major` | `"2"` | Major version component |
| `minor` | `"3"` | Minor version component |
| `patch` | `"1"` | Patch version component |
| `pre_release` | `"-beta.1"` | Pre-release identifier if present, empty string otherwise |
| `semver_type` | `"pre-release"` | Release type: `"major"`, `"minor"`, `"patch"`, or `"pre-release"` |
| `label` | `"pre-release"` | The label that was applied to the PR |

> **Note:** Outputs are always set before the labeling API call, so downstream steps receive version data even if the labeling step itself fails (e.g. the label doesn't exist in the repo yet).

## Release type detection

| Version | `semver_type` |
|---|---|
| `x.y.z-<identifier>` (any pre-release suffix) | `pre-release` |
| `x.y.z` where `z != 0` | `patch` |
| `x.y.0` where `y != 0` | `minor` |
| `x.0.0` | `major` |

Pre-release is detected first, so `2.0.0-rc.1` gets `pre-release`, not `major`.

## Dependabot / "from X to Y" titles

When a PR title contains two version strings (e.g. Dependabot's `bump lodash from 2.0.0 to 2.0.1`), the action matches the **last** version found — the new version — so the label always reflects the actual bump.

## Example usage

### Minimal — use all defaults

```yaml
name: PR Semver Labeler
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Run PR Labeler
        uses: JKBeeman92/semver-labeling@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### With custom labels

```yaml
- name: Run PR Labeler
  uses: JKBeeman92/semver-labeling@v2
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    major_label: 'breaking-change'
    minor_label: 'enhancement'
    patch_label: 'bug-fix'
    pre_release_label: 'do-not-merge'
```

### Using outputs in downstream steps

Give the step an `id`, then reference `steps.<id>.outputs.<name>`:

```yaml
name: PR Semver Labeler
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Run PR Labeler
        id: semver
        uses: JKBeeman92/semver-labeling@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Log version info
        if: steps.semver.outputs.matched == 'true'
        run: |
          echo "Version:     ${{ steps.semver.outputs.semver }}"
          echo "Type:        ${{ steps.semver.outputs.semver_type }}"
          echo "Label:       ${{ steps.semver.outputs.label }}"
          echo "Pre-release: ${{ steps.semver.outputs.pre_release }}"

      - name: Block pre-release merges to main
        if: steps.semver.outputs.semver_type == 'pre-release'
        run: |
          echo "Pre-release detected — blocking merge to main"
          exit 1

      - name: Trigger release pipeline for major bumps
        if: steps.semver.outputs.semver_type == 'major'
        run: echo "Major release — running extra checks"
```

## Development

### Branching

- **`main`** — always releasable. Every merge to `main` is evaluated for release by [release-please](https://github.com/googleapis/release-please) (see below). Protected; changes land via pull request only.
- **`develop`** — integration branch for work in progress. Feature and fix branches target `develop`; `develop` is periodically merged into `main` (or individual fixes are cherry-picked/PR'd to `main` directly for hotfixes).

### Pull request titles

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, etc.) — this is enforced by the `PR Title` workflow. Since PRs are squash-merged, the PR title becomes the commit message on `main`, which is what [release-please](https://github.com/googleapis/release-please) reads to determine the next version:

| Prefix | Effect |
|---|---|
| `fix:` | patch release |
| `feat:` | minor release |
| `feat!:` / `fix!:` / any type with `!` / a `BREAKING CHANGE:` footer | major release |
| `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `build:`, `ci:` | no release, included in changelog per type |

### Releasing

Releasing is automatic — there is no manual version bump or tag push:

1. Merge conventional-commit PRs to `main`.
2. `release-please` opens (and keeps up to date) a "release PR" that bumps `package.json`'s version and updates `CHANGELOG.md` based on the commits since the last release.
3. Merging that release PR triggers the `Release` workflow, which tags the commit (e.g. `v2.2.0`), publishes a GitHub Release, rebuilds `dist/` for that tag, and moves the floating major-version tag (e.g. `v2`) to point at it — so consumers pinned to `uses: JKBeeman92/semver-labeling@v2` automatically pick up non-breaking releases.

**Do not use GitHub's "Draft a new release" screen to cut a release for this repo.** It creates a tag directly, bypassing release-please entirely — `package.json`/`CHANGELOG.md`/the manifest are left pointing at a version that no longer matches the actual latest tag, and the open release-please PR becomes stale (its own tag creation then fails or conflicts). If that ever happens again, realign `package.json`, `package-lock.json`, and `.release-please-manifest.json` to the tag that got published, in a normal PR, before merging anything else.

### Publishing to the GitHub Marketplace

Marketplace publishing is a separate, manual, browser-only step — GitHub requires 2FA confirmation through the web UI for it, so nothing in this repo's automation can do it for you. Once release-please has published a release (per above):

1. Go to that release on the **Releases** page and click **Edit**.
2. Check **"Publish this [name] to the GitHub Marketplace."**
3. Save — do **not** start a new draft release to do this; editing the existing one keeps its tag as the single source of truth.

The floating major tag (e.g. `v2`) is unrelated to Marketplace listing — it's what makes `uses: ...@v2` resolve at all, and `release.yml` maintains it automatically after every release. It only needs manual attention once, when a major line is first created (see the `v2` tag's own history for how that was bootstrapped: `git tag v2 v2.0.1 && git push origin v2`, or the equivalent through the Releases UI by publishing a pre-release tagged `v2` targeting the desired commit).

### Building

This is a JavaScript action with no build step at runtime — GitHub checks out the repo as-is and runs `dist/index.js` directly (`node_modules` is **not** committed; see `action.yml`'s `main:`). `dist/index.js` is a bundled, dependency-inlined copy of `index.js`, produced with [`@vercel/ncc`](https://github.com/vercel/ncc):

```bash
npm run build   # regenerates dist/
npm test        # runs the Jest suite against the unbundled index.js
```

CI fails any PR where `dist/` doesn't match a fresh `npm run build` of `index.js`, so always run `npm run build` and commit the result after touching `index.js` or its dependencies.

## Migration from v1

The `semver_labels` JSON input has been replaced with four individual inputs (`major_label`, `minor_label`, `patch_label`, `pre_release_label`), each with sensible defaults.

**v1:**
```yaml
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  semver_labels: '{"majorLabel":"major-release","minorLabel":"minor-release","patchLabel":"patch-release"}'
```

**v2:**
```yaml
with:
  token: ${{ secrets.GITHUB_TOKEN }}
  # defaults match the v1 JSON values — no other changes needed
```
