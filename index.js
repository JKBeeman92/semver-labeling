const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('token');
    const labelsInput = core.getInput('labels');
    const labels = JSON.parse(labelsInput);
    const { context } = github;
    const { pull_request: pr } = context.payload;

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
        labelToAdd = labels.patchLabel;
      } else if (minor !== '0') {
        labelToAdd = labels.minorLabel;
      } else {
        labelToAdd = labels.majorLabel;
      }

      const octokit = github.getOctokit(token);
      await octokit.issues.addLabels({
        ...context.repo,
        issue_number: pr.number,
        labels: [labelToAdd],
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
