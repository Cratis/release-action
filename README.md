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

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v5

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

## Inputs

| Property | Description | Default value | Required |
| -------- | ----------- | ------------- | -------- |
| github-token | Token for the GitHub API calls the action makes (reading pull requests, creating the release). | ${{ github.token }} | - |
| version | Version to release. When set to a non-empty value it overrides working the version out from the pull request and its labels. | | - |
| release-notes | Release notes to use when creating the release. When omitted, GitHub's generated notes are used. | | - |
| tag-prefix | Prefix put in front of the version to form the release tag. | `v` | - |
| major-labels | Comma-separated label names that mean a major version bump. | `major` | - |
| minor-labels | Comma-separated label names that mean a minor version bump. | `minor` | - |
| patch-labels | Comma-separated label names that mean a patch version bump. | `patch` | - |

## Outputs

| Property | Description |
| -------- | ----------- |
| should-publish | Boolean telling whether or not a publish should be done |
| version | Version number to publish with |
| tag | The release tag (the version with the tag prefix, e.g. `v1.2.3`) |
| prerelease | Boolean telling whether or not it is a prerelease |
| isolated-for-pull-request | Boolean telling whether or not it should be an isolated release for the pull request only |
| previous-version | The version the new version was bumped from, or empty when there is no predecessor |

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
version, creates the `vX.Y.Z` GitHub release, and moves the floating `vX` and `vX.Y` tags to the release so
that consumers tracking `@v1` pick it up. A merge without one of those labels releases nothing.

The first release bootstraps automatically from the highest existing version tag (a floating `v1`, say), so
versioning stays continuous rather than restarting from `0.0.0`. There is nothing to run by hand - no tags to
push and no version to bump manually.
