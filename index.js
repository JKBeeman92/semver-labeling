const core   = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token      = core.getInput('token');
    const majorLabel = core.getInput('major_label');
    const minorLabel = core.getInput('minor_label');
    const patchLabel = core.getInput('patch_label');

    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.info('No pull request context — skipping.');
      return;
    }

    const match = pr.title.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
    if (!match) {
      core.info('No semver found in PR title — skipping.');
      core.setOutput('matched', 'false');
      return;
    }

    const [, major, minor, patch] = match;
    const semver = `${major}.${minor}.${patch}`;

    let semverType;
    if (patch !== '0')      semverType = 'patch';
    else if (minor !== '0') semverType = 'minor';
    else                    semverType = 'major';

    const labelMap   = { major: majorLabel, minor: minorLabel, patch: patchLabel };
    const labelToAdd = labelMap[semverType];

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.addLabels({
      owner:        github.context.repo.owner,
      repo:         github.context.repo.repo,
      issue_number: pr.number,
      labels:       [labelToAdd],
    });

    core.setOutput('matched',     'true');
    core.setOutput('semver',      semver);
    core.setOutput('major',       major);
    core.setOutput('minor',       minor);
    core.setOutput('patch',       patch);
    core.setOutput('semver_type', semverType);
    core.setOutput('label',       labelToAdd);

  } catch (error) {
    core.setFailed(error.message);
  }
}

// Only auto-run when executed directly as a GitHub Action entry point
if (require.main === module) {
  run();
}

module.exports = { run };
