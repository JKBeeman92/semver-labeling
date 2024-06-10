const core = require('@actions/core');
const github = require("@actions/github");

async function run() {
  try {
    const token = core.getInput('token');
    const semverLabelsInput = core.getInput('semver_labels');
    const semverLabels = JSON.parse(semverLabelsInput);
    const pr = github.context.payload.pull_request;

    if (!pr) {
      console.log('No pull request, exiting');
      return;
    }

    const regex = /\b\d+\.\d+\.\d+\b/;
    const match = pr.title.match(regex);

    if (match) {
      const semver = match[0];
      const [major, minor, patch] = semver.split('.');
      let labelToAdd;

      if (patch !== '0') {
        labelToAdd = semverLabels.patchLabel;
      } else if (minor !== '0') {
        labelToAdd = semverLabels.minorLabel;
      } else {
        labelToAdd = semverLabels.majorLabel;
      }

      const octokit = github.getOctokit(token);
      await octokit.rest.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pr.number,
        labels: [labelToAdd],
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
