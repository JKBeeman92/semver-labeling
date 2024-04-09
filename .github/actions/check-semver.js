const github = require('@actions/github');
const core = require('@actions/core');

const title = github.context.payload.pull_request.title;
const semverRegex = /\b\d+(\.\d+){2}\b/;
const versionMatch = title.match(semverRegex);

const [major, minor, patch] = versionMatch[0].split('.');
let labelToApply = '';
let foundMatch = true;

if (!versionMatch) {
  foundMatch = false;
} else if (patch !== '0') {
  labelToApply = process.env.semver_labels.patch_label;
} else if (minor !== '0') {
  labelToApply = process.env.semver_labels.minor_label;
} else if (major !== '0') {
  labelToApply = process.env.semver_labels.major_label;
}

console.log(`This is a ${labelToApply} version`);
core.setOutput('label_to_apply', labelToApply);
core.setOutput('found_match', foundMatch);
