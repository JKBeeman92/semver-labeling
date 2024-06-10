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
  semver labeling:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Use My Action
        uses: JKBeeman92/pr-semver-labeling@v1
        with:
          semver_labels: '{"majorLabel": "major-release","minorLabel": "minor-release", "patchLabel": "patch-release"}'
          pr_title: ${{ github.event.pull_request.title }}
          repository: ${{ github.repository }}
          pr_number: ${{ github.event.pull_request.number }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
