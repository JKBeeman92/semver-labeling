const core = require('@actions/core');

const title = process.env.PR_TITLE;
const semverRegex = /\b\d+(\.\d+){2}\b/;
const versionMatch = title.match(semverRegex);

const [major, minor, patch] = versionMatch[0].split('.');
let labelToApply = '';
let foundMatch = true;

if (!versionMatch) {
  foundMatch = false;
} else if (patch !== '0') {
  labelToApply = process.env.SEMVER_LABELS.patchLabel;
} else if (minor !== '0') {
  labelToApply = process.env.SEMVER_LABELS.minorLabel;
} else if (major !== '0') {
  labelToApply = process.env.SEMVER_LABELS.majorLabel;
}

console.log(`This is a ${labelToApply} version`);
core.setOutput('label_to_apply', labelToApply);
core.setOutput('found_match', foundMatch);
