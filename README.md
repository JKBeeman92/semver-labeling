# Semver Labeling

A reusable GitHub Action that detects a semantic version in a PR title, applies a label based on the release type, and exposes the parsed version data as step outputs — so downstream steps can branch on it without re-parsing.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `token` | ✅ | — | GitHub token for API access (`secrets.GITHUB_TOKEN`) |
| `major_label` | ❌ | `major-release` | Label to apply for major version bumps (e.g. `2.0.0`) |
| `minor_label` | ❌ | `minor-release` | Label to apply for minor version bumps (e.g. `1.1.0`) |
| `patch_label` | ❌ | `patch-release` | Label to apply for patch version bumps (e.g. `1.0.1`) |

Only `token` is required. Override any label input to match your project's labeling convention.

## Outputs

| Output | Example | Description |
|---|---|---|
| `matched` | `"true"` | `"true"` if a semver was found in the PR title, `"false"` otherwise |
| `semver` | `"2.3.1"` | Full version string extracted from the PR title |
| `major` | `"2"` | Major version component |
| `minor` | `"3"` | Minor version component |
| `patch` | `"1"` | Patch version component |
| `semver_type` | `"patch"` | Detected release type: `"major"`, `"minor"`, or `"patch"` |
| `label` | `"patch-release"` | The label that was applied to the PR |

## Release type detection

The release type is determined from the version string itself:

| Version | `semver_type` |
|---|---|
| `x.y.z` where `z != 0` | `patch` |
| `x.y.0` where `y != 0` | `minor` |
| `x.0.0` | `major` |

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
          echo "Version:  ${{ steps.semver.outputs.semver }}"
          echo "Type:     ${{ steps.semver.outputs.semver_type }}"
          echo "Label:    ${{ steps.semver.outputs.label }}"

      - name: Trigger release pipeline for major bumps
        if: steps.semver.outputs.semver_type == 'major'
        run: echo "Major release detected — triggering extra checks"
```

## Migration from v1

The `semver_labels` JSON input has been replaced with three individual inputs (`major_label`, `minor_label`, `patch_label`), each with sensible defaults.

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
