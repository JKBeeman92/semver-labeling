const core = require('@actions/core');

const title = process.env.PR_TITLE;
const semverRegex = /\b\d+(\.\d+){2}\b/;
const versionMatch = title.match(semverRegex);

let labelToApply = '';
let foundMatch = false;

if (versionMatch) {
  const [major, minor, patch] = versionMatch[0].split('.');
  const semverLabels = JSON.parse(process.env.SEMVER_LABELS);

  foundMatch = true;
  if (patch !== '0') {
    labelToApply = semverLabels.patchLabel;
  } else if (minor !== '0') {
    labelToApply = semverLabels.minorLabel;
  } else if (major !== '0') {
    labelToApply = semverLabels.majorLabel;
  }
}

console.log(`This is a ${labelToApply} version`);
core.setOutput('label_to_apply', labelToApply);
core.setOutput('found_match', foundMatch);
