# Semver Labeling

This is a reusable GitHub Action that does something useful.

## Inputs

This action accepts the following inputs:

- `semver_labels`: A json object defining the labels to be applied if Semver is in the PR Text. Required.

## Example usage

Here's an example of how to use this action in a workflow:

```yaml
name: PR Semver Labeler
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run PR Labeler
        uses: JKBeeman92/semver-labeling@1.0.3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          semver_labels: '{"majorLabel": "major-release","minorLabel": "minor-release", "patchLabel": "patch-release"}'
