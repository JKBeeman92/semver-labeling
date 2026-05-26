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

    // Use the LAST semver match in the title so that "from X to Y" style titles
    // (e.g. Dependabot) resolve to the new version (Y) rather than the old one (X).
    const matches = [...pr.title.matchAll(/\b(\d+)\.(\d+)\.(\d+)\b/g)];
    if (matches.length === 0) {
      core.info('No semver found in PR title — skipping.');
      core.setOutput('matched', 'false');
      return;
    }

    const [, major, minor, patch] = matches[matches.length - 1];
    const semver = `${major}.${minor}.${patch}`;

    let semverType;
    if (patch !== '0')      semverType = 'patch';
    else if (minor !== '0') semverType = 'minor';
    else                    semverType = 'major';

    const labelMap   = { major: majorLabel, minor: minorLabel, patch: patchLabel };
    const labelToAdd = labelMap[semverType];

    // Set outputs before the API call so callers always receive version data,
    // even if the labeling step fails (e.g. label doesn't exist in the repo).
    core.setOutput('matched',     'true');
    core.setOutput('semver',      semver);
    core.setOutput('major',       major);
    core.setOutput('minor',       minor);
    core.setOutput('patch',       patch);
    core.setOutput('semver_type', semverType);
    core.setOutput('label',       labelToAdd);

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.addLabels({
      owner:        github.context.repo.owner,
      repo:         github.context.repo.repo,
      issue_number: pr.number,
      labels:       [labelToAdd],
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

// Only auto-run when executed directly as a GitHub Action entry point
if (require.main === module) {
  run();
}

module.exports = { run };
