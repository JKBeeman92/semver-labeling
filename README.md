# Semver Labeling

This is a reusable GitHub Action that does something useful.

## Inputs

This action accepts the following inputs:

- `semver_labels`: A json object defining the labels to be applied if Semver is in the PR Text. Required.

## Example usage

Here's an example of how to use this action in a workflow:

```yaml
name: PR Semver Labeling

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  check-pr-title:
    runs-on: ubuntu-latest

    steps:

      - name: Apply Semver Label
        uses: JKBeeman92/semver-labeling@latest
        with:
          semver_labels: '{"majorLabel": "major-release","minorLabel": "minor-release", "patchLabel": "patch-release"}'
