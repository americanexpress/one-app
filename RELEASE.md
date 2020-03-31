# One App release process

This defines the One App release process. 

Releases can be triggered in two ways:

  - [Automated release process](#automated-release-process)
  - [Manual release process](#manual-release-process)

## Automated release process

 1. An automated pull request will be raised every Wednesday at 16:00 UTC, this would be from the `prerelease` branch to master. This uses this [pull_request_release workflow](.github/workflows/pull_request_release.yml)and updates [package.json](package.json), [package-lock.json](package-lock.json), [one-app-statics package.json](one-app-statics/package.json) and the changelog(Behind the scene it uses [standard-version](https://github.com/conventional-changelog/standard-version) to generate and update this files) with the changes to be released. The commit message contains the version to be released. Updated this pull request to remove or add any new changes.
 2. Once a pull request is reviewed merge the pull request and please ensure that the commit message is updated to follow this pattern  

   ``` bash
   #chore(release): v5.0.0
   chore(release): v<semantic-version>

   ```

   > Integration tests will continue to run in Travis as they currently do, after the automated pull request is created it would run the tests on `prerelease` branch.

1. The merge will trigger the automatic generation of a new tag using the semantic version provided during the merging of the pull request above.

2. After the the generated tag is pushed to the branch this will trigger the docker build and push of the images and statics to the docker hub. The development and production images would be accessible in docker [https://hub.docker.com/u/oneamex](https://hub.docker.com/u/oneamex)

3. For the github release notes we are currently using [https://github.com/release-drafter/release-drafter](https://github.com/release-drafter/release-drafter) to generate release notes. Please use the labels specified within [release-drafter](.github/release-drafter.yml) to categorize the different pull requests by adding the labels to them. Update the draft release notes and tie it to the released tag above you can also link this to different artifacts. 

## Manual release process

This process can be used to make ad hoc releases outside of wednesday release cycle.

 1. Run `npm run release` locally within your branch, this would update the changelog, [package.json](package.json), [package-lock.json](package-lock.json)and [one-app-statics package.json](one-app-statics/package.json) with the new version to be released. Push your changes and create a pull request to master.
 2. When the changes are merged and reviewed. The same process from step 3 above will be followed.

## FAQs

### How can i revert a release?

If changes were made and need to be reverted. Please use the [manual release process](#manual-release-process) to revert the changes.

### How can i run the first release?

For the first release please use the [manual release process](#manual-release-process). Run `npm run release -- --first-release` to generate the initial changelog and update the package.json files.

### How can i create a prerelease?

For the first release please use the [manual release process](#manual-release-process). Run `npm run release -- --prerelease` to generate the initial changelog and update the package.json files.

### What happens if a pull request merged after the automated pull request is created?

We should try to prevent this from happening, but if it does happen, since the pull request runs every wednesday it won't be triggered again and updated. Follow the above [manual release process](#manual-release-process) to include the changes that have been merged.

### How can i do a dry run to test out the files to be changed locally

Locally you can run  `run release -- --dry-run`, this would show the new version to be released, the files that would changed and a view of the changelog without changing any of the files.
