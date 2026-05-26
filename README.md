# Semver Labeling

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
