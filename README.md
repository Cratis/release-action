# Release Action

This is a [composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action) to encapsulate
a standard way to do release, tailored for the needs we have for Cratis.

## What does it do

The action is based around the concept of releasing pull requests that are merged down to the main branch that has
one of the following labels adhering to [semantic versioning version 2](https://semver.org) :

| Name | Description |
| ---- | ----------- |
| Major | Breaking changes has been implemented in public APIs and/or behavior |
| Minor | New capabilities has been added |
| Patch | Bug fixes |

If none of these labels are present, it doesn't consider this to be a release and will not produce a GitHub release and returns
the property of `should-publish` with `false`.

It runs the following steps:

* Establishes the context by looking at the GitHub context in which the action is running in. Decides if this is a publishable build.
* Increments the version by looking at the latest version tag of the repository and increases according to what the context decided the build type was.
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
        uses: actions/checkout@v2

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
          user-name: 'Cratis Build'
          user-email: 'build@cratis.no'

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

## Outputs

| Property | Description |
| -------- | ----------- |
| should-publish | Whether or not a publish should be done |
| version | Version number to publish with |
