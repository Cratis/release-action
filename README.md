# Release Action

This GitHub action handles versioning and releasing to GitHub releases.

## What does it do

The action is based around the concept of releasing pull requests that are merged down to the main branch that has
one of the following labels adhering to [semantic versioning version 2](https://semver.org) :

| Name | Description |
| ---- | ----------- |
| Major | Breaking changes has been implemented in public APIs and/or behavior |
| Minor | New capabilities has been added |
| Patch | Bug fixes |

If none of these labels are present, it doesn't consider this to be a release and will not produce a GitHub release and returns
the property of `should-publish` with `false`. This condition is only valid for a **closed** GitHub event.

In addition it will look at the branch ref the pull request lives in. If the branch name is a semantic version number, it will use this as the
basis for a version number and generate a prerelease version number based on the PR number and the sha of the commit:

<major>.<minor>.<patch>-PR<number>.<short sha>.

Similar if the target branch has a name that is a semantic version number, it will use this to form a prerelease version number.
The output property `isolated-for-pull-request` will be set to true.

It will only generate a valid `PR` pre-release if the pull request is in draft. If the pull request is not in draft the `should-publish` will be
set to `false` and there will be no version info in the `version` output.

If any of the branch names happen to be a semantic version number with a prerelease included in it, it will produce a version number
based on the full version and just adding the short sha of the commit at the end. In this case the output property `isolated-for-pull-request` will be set to false.

This behavior can be useful for building artifacts that is linked to a pull request and one wants to test them out before they are actually
merged down to the target branch.

The action is running a **main** stage and a post stage. The **main** stage runs the following steps.

* Establishes the context by looking at the GitHub context in which the action is running in. Decides if this is a publishable build.
* Increments the version by looking at the latest version tag of the repository and increases according to what the context decided the build type was.

The post stage is only running if successful and runs the following steps:

* Releases a snapshot of the source code to GitHub releases with the calculated version number.

## Usage

Below is an example of use with a .NET 6 pipeline:

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
        uses: actions/checkout@v4

      - name: Setup .Net
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: '6.0.100-preview.7.21379.14'
      - name: Build .NET
        run: dotnet build --configuration Release

      - name: Release
        id: release
        uses: cratis/release-action@v1
        with:
          version: 'Optional SemVer'
          release-notes: 'Optional descriptive release notes'

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
| github-token | The GitHub token to use for any GitHub actions | ${{ secrets.GITHUB_TOKEN }} | - |
| version | Version number to use when creating the release. If there is a value and the value is not an empty string, it will override the logic of deducting the version number based on tags on the PR. | | - |
| release-notes | Release notes to use when creating the release. |  | - |

## Outputs

| Property | Description |
| -------- | ----------- |
| should-publish | Boolean telling whether or not a publish should be done |
| version | Version number to publish with |
| prerelease | Boolean telling whether or not a it is a prerelease |
| isolated-for-pull-request | Boolean telling whether or not it should be an isolated release for the pull request only |
