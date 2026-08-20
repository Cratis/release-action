# Release Action

This GitHub action handles versioning and releasing to GitHub releases.

## What does it do

The action releases pull requests that are **merged** into the target branch and carry one of the following
labels, adhering to [semantic versioning version 2](https://semver.org):

| Name | Description |
| ---- | ----------- |
| major | Breaking changes have been implemented in public APIs and/or behavior |
| minor | New capabilities have been added |
| patch | Bug fixes |

For a merged pull request the new version is the latest release - or the highest existing version tag when
there are no releases yet - incremented according to the label.

If none of these labels are present, it does not consider this to be a release: no GitHub release is produced
and `should-publish` is `false`.

The label names and the tag prefix are conventions you can change - see [Inputs](#inputs) (`major-labels`,
`minor-labels`, `patch-labels`, `tag-prefix`).

### A pull request must be merged, not merely closed

Nothing is ever released for a pull request that was **closed without being merged** - regardless of which
release labels it carries. This is worth stating explicitly because it is easy to get wrong: a closed,
unmerged pull request has `state: closed` just like a merged one, and GitHub keeps the SHA of the last
*test* merge commit in its `merge_commit_sha`. That SHA is exactly what a `pull_request` event reports as
`github.sha`, so anything that keys off the state or off the commit alone will mistake an abandoned pull
request for a merged one. The action keys off the merge itself (`merged` / `merged_at`).

Pull requests raised by Dependabot never produce a release either.

### Prereleases for pull requests

The action also looks at the branch refs of the pull request, which makes it possible to build and test
artifacts belonging to a pull request before it is merged.

* If the **head** branch is named after a semantic version - `1.2.3` - the version becomes
  `1.2.3-pr<number>.<short sha>` and `isolated-for-pull-request` is `true`: the artifact belongs to that pull
  request alone.
* If the head branch is named after a semantic version that already carries a prerelease - `1.2.3-alpha` -
  the version becomes `1.2.3-alpha.<short sha>` and `isolated-for-pull-request` is `false`: the artifact lands
  on a channel shared with everything else built from that branch.
* If the head branch is not named after a version, the **base** branch is looked at the same way.
* Otherwise the version is derived from the latest release of the repository. In this case an open pull
  request only produces a prerelease while it is a **draft**; a non-draft open pull request sets
  `should-publish` to `false`.

A prerelease publishes artifacts but never creates a GitHub release - `should-publish` is `true` while no
release is cut.

### Release notes

When a release is created without notes of its own - a merged pull request with an empty body, or an explicit
`version` without `release-notes` - GitHub's own generated release notes are used, so the release always has a
meaningful body rather than an empty one.

Every run also writes a short decision table to the job summary, so you can see at a glance what the action
decided and why.

### The two stages

The action runs a **main** stage and a **post** stage:

* The **main** stage decides everything: whether this run publishes at all, which version it publishes, and
  whether a GitHub release should be created. It sets the outputs and records the decision.
* The **post** stage runs only on `success()` and carries that decision out, creating the GitHub release.

The post stage never works the version out for itself - it only acts on what the main stage decided. That is
what guarantees the two stages cannot disagree, and that a run which decided against publishing cannot end up
creating a release anyway. If the main stage never recorded a decision, the post stage releases nothing.

Release creation is idempotent: an existing release for the same tag, or for the same commit, is left alone.

## Usage

Below is an example of use with a .NET pipeline:

```yml
name: Publish

env:
  NUGET_OUTPUT: ./Artifacts/NuGet

on:
  pull_request:
    types: [closed]

# Creating the GitHub release needs a write-capable token. See "Permissions" below.
permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v7

      - name: Setup .NET
        uses: actions/setup-dotnet@v5
        with:
          dotnet-version: '9.0.x'

      - name: Build .NET
        run: dotnet build --configuration Release

      # No inputs are needed - the version comes from the merged pull request's label. Optionally set
      # `version:` and `release-notes:` to override that.
      - name: Release
        id: release
        uses: cratis/release-action@v1

      - name: Remove any existing artifacts
        run: rm -rf ${{ env.NUGET_OUTPUT }}

      - name: Create NuGet packages
        if: ${{ steps.release.outputs.should-publish == 'true' }}
        run: dotnet pack --no-build --configuration Release -o ${{ env.NUGET_OUTPUT }} -p:PackageVersion=${{ steps.release.outputs.version }} -p:IncludeSymbols=true -p:SymbolPackageFormat=snupkg

      - name: Push NuGet packages
        if: ${{ steps.release.outputs.should-publish == 'true' }}
        run: dotnet nuget push --skip-duplicate '${{ env.NUGET_OUTPUT }}/*.nupkg' --api-key ${{ secrets.NUGET_API_KEY }} --source https://api.nuget.org/v3/index.json
```

## Permissions

Creating the GitHub release is a write to the repository, so the job's `GITHUB_TOKEN` needs `contents: write`.
Grant it at the workflow level, or on the job that runs the action:

```yml
permissions:
  contents: write
```

If your organization or repository defaults workflow permissions to read-only (the recommended hardening),
a workflow with no `permissions:` block cannot create the release and the run fails with a 403 - so declare
it explicitly rather than relying on the default. The action reads everything else it needs (pull requests,
releases, tags) through this same token. Reading is done entirely through the GitHub API, so no `fetch-depth`
or tag checkout is needed.

Closing resolved issues additionally needs `issues: write`:

```yaml
permissions:
  contents: write
  issues: write
```

Without it the release is still created; the action logs a warning per issue it could not close and carries on,
because a release that succeeded must never be reported as a failed run. Set `close-resolved-issues: false` to
turn the behavior off instead of granting the scope.

## Closing the issues a release resolves

When the release notes say a release delivers an issue, the action closes that issue and comments with the
release tag.

Only the trailing parenthesized form is read - a note bullet **ending** in `(#123)`:

```markdown
## Fixed

- Roles declared with the constructor form are read (#2381)
```

That form is the whole of the contract, and everything looser is deliberately left alone:

| Written as | Read? | Why |
| ---------- | ----- | --- |
| `- Fixed it (#123)` | yes | the bullet says the release delivers it |
| `- Fixed it, see #123` | no | prose refers to an issue, it does not deliver it |
| `- Fixed it. Related: #123` | no | same - a mention is not a delivery |
| `- Fixed it (Cratis/Screenplay#32)` | no | another repository's, out of token reach |

A reference inside code - a fenced example, or an inline mention of the syntax itself - is being shown rather
than made, and is not read. These very notes are the reason: they document the form by writing it out, and the
number in that example belongs to an unrelated issue.

An issue that is already closed is left exactly as it was, and a number that turns out to be a pull request is
skipped - a release does not close a pull request.

## Choosing a trigger

Two triggers work, and the difference matters for repositories that accept **fork** pull requests:

* `on: pull_request` with `types: [closed]` - simplest, and fine when every pull request comes from a branch
  in the same repository. But a pull request from a **fork** runs with a **read-only** `GITHUB_TOKEN` (and no
  secrets), even on merge, so creating the release fails with a 403 and publishing steps have no credentials.
* `on: push` to the default branch - **recommended for public repositories or any repo that takes fork
  contributions.** A push to the default branch always runs with a full-permission token. The action finds the
  merged pull request (and its label) from the commit, so nothing else changes. This is how the action
  releases itself - see [`.github/workflows/release.yml`](./.github/workflows/release.yml).

```yml
on:
  push:
    branches: [main]

permissions:
  contents: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
```

No `paths:` filter is needed with either trigger: the action releases nothing unless the merged pull request
carries a release label, so unlabeled merges are already no-ops.

`cancel-in-progress: false` is not optional when moving to `push`. Under `pull_request` every run has its own
`github.ref` (`refs/pull/<number>/merge`), so a concurrency group keyed on it only ever cancels re-runs of the
same pull request. On `push` every merge shares `refs/heads/main`, so `cancel-in-progress: true` means the next
merge cancels the release in flight - possibly after it has tagged and cut the release but before it has
finished publishing.

## Manual runs

The action is built to run automatically on merges, but you can also trigger it by hand with a
`workflow_dispatch` that passes an explicit `version`. Leave `version` empty (or at the `0.0.0` placeholder the
publish templates ship) and the action releases nothing - it never cuts a `0.0.0` release from an unfilled
default. Pass a real version to force a release; pass `release-notes` too, or GitHub generates the notes.

## Inputs

| Property | Description | Default value | Required |
| -------- | ----------- | ------------- | -------- |
| github-token | Token for the GitHub API calls the action makes (reading pull requests, creating the release). | ${{ github.token }} | - |
| version | Version to release. When set to a real version it overrides working the version out from the pull request and its labels. Empty (or the `0.0.0` placeholder) means "work it out from the pull request" and never forces a release. | | - |
| release-notes | Release notes to use when creating the release. When omitted, GitHub's generated notes are used. | | - |
| tag-prefix | Prefix put in front of the version to form the release tag. | `v` | - |
| major-labels | Comma-separated label names that mean a major version bump. | `major` | - |
| minor-labels | Comma-separated label names that mean a minor version bump. | `minor` | - |
| patch-labels | Comma-separated label names that mean a patch version bump. | `patch` | - |
| close-resolved-issues | Whether to close the issues the release notes name as resolved. Needs `issues: write`. | `true` | - |

## Outputs

| Property | Description |
| -------- | ----------- |
| should-publish | Boolean telling whether or not a publish should be done |
| version | Version number to publish with |
| tag | The release tag (the version with the tag prefix, e.g. `v1.2.3`) |
| prerelease | Boolean telling whether or not it is a prerelease |
| isolated-for-pull-request | Boolean telling whether or not it should be an isolated release for the pull request only |
| previous-version | The version the new version was bumped from, or empty when there is no predecessor |
| reason | Why the action decided what it decided - see [Acting on the reason](#acting-on-the-reason) |

## Acting on the reason

`should-publish` on its own cannot be acted on. A run that publishes nothing is sometimes exactly right and
sometimes a mistake that quietly costs a release, and as a boolean the two are identical - both leave a green
run behind. The `reason` output says which it was.

| Reason | Meaning | Expected? |
| ------ | ------- | --------- |
| `release` | A release of the repository is being cut | published |
| `prerelease` | A prerelease artifact for a pull request is being published; no GitHub release | published |
| `no-pull-request` | No merged pull request for the commit - pushed straight to the branch | yes |
| `not-merged` | The pull request was closed without being merged | yes |
| `dependabot` | The pull request was raised by Dependabot | yes |
| `already-released` | A release already exists for this commit - a re-run | yes |
| `no-prerelease-version` | An open pull request that yields no prerelease | yes |
| `placeholder-version` | A manual run left at the `0.0.0` placeholder | yes |
| **`no-label`** | **Merged, but carries no version label - the release was lost** | **no** |
| **`error`** | **Working out the version failed; the action failed closed** | **no** |

The two in bold are the ones worth failing a workflow over. Everything else is a legitimate reason to publish
nothing, and failing on those would cry wolf on every commit pushed straight to the branch.

```yml
  verify-published:
    # A merged pull request that publishes nothing is the failure mode that silently costs a release: the
    # release job succeeds, every publish job is skipped for want of should-publish, and the run reports green.
    if: always() && needs.release.result == 'success' && contains(fromJSON('["no-label", "error"]'), needs.release.outputs.reason)
    runs-on: ubuntu-latest
    needs: [release]
    steps:
      - name: Report that nothing was published
        run: |
          echo "::error::Nothing was published (reason: ${{ needs.release.outputs.reason }})."
          exit 1
```

For that to work the `release` job has to expose the output:

```yml
    outputs:
      reason: ${{ steps.release.outputs.reason }}
```

## Re-running a release

Working the version out again after a release has been cut would bump from the version just released and cut a
second, higher one from the same commit. The action does not: when a release already exists for the commit it
resolves to `already-released` with `should-publish` false, so the publishing jobs skip along with it. That
makes re-running a completed run safe - which matters most on `push`, where re-running the workflow is the
natural response to a publishing step that failed for its own reasons.

## Developing

The action runs from the bundle committed to `dist/`, so the bundle has to be rebuilt and committed whenever
the source changes - CI fails if `dist/` is out of date.

```shell
yarn install
yarn ci       # typecheck, lint, specs and build
yarn test     # specs only
```

Specs live next to the source in `for_*/when_*/` folders and follow the Cratis spec conventions - see
[.ai/rules/specs.typescript.md](./.ai/rules/specs.typescript.md).

## Releasing

This action releases itself. Label a pull request `major`, `minor` or `patch`, and when it is merged the
[Release workflow](./.github/workflows/release.yml) runs the action on the merge commit: it works out the next
version, creates the `vX.Y.Z` GitHub release, and moves the floating `vX` and `vX.Y` tags to it so that
consumers tracking `@v1` pick it up. A merge without one of those labels releases nothing.

The release tags point at a **lean commit** whose tree is only what is needed to run the action -
`action.yml`, the `dist/` bundle, `LICENSE` and `README.md`. The source, specs and tooling (about 4 MB,
including the Yarn release) are not shipped to consumers, so a `uses:` checkout is roughly 2.7 MB instead of
6.6 MB. The lean commit is parented to the merge commit, so its provenance is intact.

The first release bootstraps automatically from the highest existing version tag (a floating `v1`, say), so
versioning stays continuous rather than restarting from `0.0.0`. There is nothing to run by hand - no tags to
push and no version to bump manually.
