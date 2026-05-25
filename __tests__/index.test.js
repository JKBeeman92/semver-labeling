/**
 * Tests for semver-labeling GitHub Action (v2)
 *
 * Strategy: mock @actions/core and @actions/github so the action logic
 * can run without a real GitHub context or token.
 */

const mockSetOutput  = jest.fn();
const mockSetFailed  = jest.fn();
const mockInfo       = jest.fn();
const mockAddLabels  = jest.fn().mockResolvedValue({});
const mockGetOctokit = jest.fn(() => ({
  rest: { issues: { addLabels: mockAddLabels } },
}));

// Mutable context — tests overwrite .payload to simulate different PRs
const mockContext = {
  payload: {},
  repo: { owner: 'test-owner', repo: 'test-repo' },
};

jest.mock('@actions/core', () => ({
  getInput:  jest.fn(),
  setOutput: mockSetOutput,
  setFailed: mockSetFailed,
  info:      mockInfo,
}));

jest.mock('@actions/github', () => ({
  getOctokit: mockGetOctokit,
  context:    mockContext,
}));

const core        = require('@actions/core');
const { run }     = require('../index');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setInputs({ token = 'fake-token', majorLabel, minorLabel, patchLabel } = {}) {
  core.getInput.mockImplementation((name) => {
    const map = {
      token,
      major_label: majorLabel ?? 'major-release',
      minor_label: minorLabel ?? 'minor-release',
      patch_label: patchLabel ?? 'patch-release',
    };
    return map[name] ?? '';
  });
}

function setPRTitle(title) {
  mockContext.payload = { pull_request: { number: 42, title } };
}

beforeEach(() => {
  jest.clearAllMocks();
  setInputs();
});

// ---------------------------------------------------------------------------
// Patch releases
// ---------------------------------------------------------------------------
describe('patch release (x.y.z where z != 0)', () => {
  test('applies patch_label and sets all outputs', async () => {
    setPRTitle('Release 1.0.1');
    await run();

    expect(mockAddLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: ['patch-release'],
    }));
    expect(mockSetOutput).toHaveBeenCalledWith('matched',     'true');
    expect(mockSetOutput).toHaveBeenCalledWith('semver',      '1.0.1');
    expect(mockSetOutput).toHaveBeenCalledWith('major',       '1');
    expect(mockSetOutput).toHaveBeenCalledWith('minor',       '0');
    expect(mockSetOutput).toHaveBeenCalledWith('patch',       '1');
    expect(mockSetOutput).toHaveBeenCalledWith('semver_type', 'patch');
    expect(mockSetOutput).toHaveBeenCalledWith('label',       'patch-release');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  test('matches semver embedded in surrounding text', async () => {
    setPRTitle('chore: bump version to 2.3.7 for hotfix');
    await run();

    expect(mockSetOutput).toHaveBeenCalledWith('semver_type', 'patch');
    expect(mockSetOutput).toHaveBeenCalledWith('semver',      '2.3.7');
  });
});

// ---------------------------------------------------------------------------
// Minor releases
// ---------------------------------------------------------------------------
describe('minor release (x.y.0 where y != 0)', () => {
  test('applies minor_label and sets all outputs', async () => {
    setPRTitle('Release 1.2.0');
    await run();

    expect(mockAddLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: ['minor-release'],
    }));
    expect(mockSetOutput).toHaveBeenCalledWith('semver_type', 'minor');
    expect(mockSetOutput).toHaveBeenCalledWith('semver',      '1.2.0');
    expect(mockSetOutput).toHaveBeenCalledWith('patch',       '0');
    expect(mockSetOutput).toHaveBeenCalledWith('minor',       '2');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Major releases
// ---------------------------------------------------------------------------
describe('major release (x.0.0)', () => {
  test('applies major_label and sets all outputs', async () => {
    setPRTitle('Release 2.0.0');
    await run();

    expect(mockAddLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: ['major-release'],
    }));
    expect(mockSetOutput).toHaveBeenCalledWith('semver_type', 'major');
    expect(mockSetOutput).toHaveBeenCalledWith('semver',      '2.0.0');
    expect(mockSetOutput).toHaveBeenCalledWith('major',       '2');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom label overrides
// ---------------------------------------------------------------------------
describe('custom label overrides', () => {
  test('uses caller-supplied labels instead of defaults', async () => {
    setInputs({ majorLabel: 'breaking-change', minorLabel: 'enhancement', patchLabel: 'bug-fix' });
    setPRTitle('Release 1.2.0');
    await run();

    expect(mockAddLabels).toHaveBeenCalledWith(expect.objectContaining({
      labels: ['enhancement'],
    }));
    expect(mockSetOutput).toHaveBeenCalledWith('label', 'enhancement');
  });
});

// ---------------------------------------------------------------------------
// No semver in title
// ---------------------------------------------------------------------------
describe('no semver in PR title', () => {
  test('sets matched=false, does not add a label, does not fail', async () => {
    setPRTitle('Fix typo in README');
    await run();

    expect(mockSetOutput).toHaveBeenCalledWith('matched', 'false');
    expect(mockSetOutput).toHaveBeenCalledTimes(1);
    expect(mockAddLabels).not.toHaveBeenCalled();
    expect(mockSetFailed).not.toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('No semver found'));
  });
});

// ---------------------------------------------------------------------------
// No pull_request context
// ---------------------------------------------------------------------------
describe('no pull request context', () => {
  test('exits early without error when not running on a PR', async () => {
    mockContext.payload = {};
    await run();

    expect(mockAddLabels).not.toHaveBeenCalled();
    expect(mockSetFailed).not.toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('No pull request context'));
  });
});
