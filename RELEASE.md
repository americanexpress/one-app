# One App release process

This defines the One App release process. 

Releases can be triggered in two ways:

  - [Automated release process](#automated-release-process)
  - [Manual release process](#manual-release-process)

## Automated release process

 1. An automated pull request will be raised every Wednesday at 16:00 UTC, from a `prepare-release` branch to master. This uses [pull_request_release workflow](.github/workflows/pull_request_release.yml) and updates the [package.json](package.json), [package-lock.json](package-lock.json), [one-app-statics package.json](one-app-statics/package.json) and the changelog. Behind the scene it uses [standard-version](https://github.com/conventional-changelog/standard-version) to generate and update these files with the changes for released. The commit message contains will be in the following format `chore(release): X.X.X` . You can update this pull request to remove or add any new changes.
 2. Once a pull request is reviewed merge the pull request and please ensure that the commit message is updated to follow this pattern  

   ``` bash
   #chore(release): 5.0.0
   chore(release): <semantic-version>

   ```

   > Integration tests will continue to run in Travis as they currently do, after the automated pull request is created it would run the tests on `prepare-release` branch.

1. The merge will trigger the automatic generation of a new tag using the semantic version provided during the merging of the pull request above.

2. After the the generated tag is pushed to the branch this will trigger the docker build and publish the statics and push the images to Docker Hub. The development and production images would be accessible in docker [https://hub.docker.com/u/oneamex](https://hub.docker.com/u/oneamex)

3. We are currently using [https://github.com/release-drafter/release-drafter](https://github.com/release-drafter/release-drafter) to generate release notes. Please add the labels specified within [release-drafter](.github/release-drafter.yml) to categorize different pull requests. Update the draft release notes and tie it to the release tag above, you can also link this to different artifacts. The statics assets will be published and added to a tag that has been released.

## Manual release process

This process can be used to make ad hoc releases outside of wednesday release cycle.

 1. Run `npm run release` locally within your branch, this would update the changelog, [package.json](package.json), [package-lock.json](package-lock.json)and [one-app-statics package.json](one-app-statics/package.json) with the new version to be released. Push your changes and create a pull request to master.
 2. When the changes are merged and reviewed. The same process from step 3 above will be followed.

## FAQs

### How can I revert a release?

If changes were made and need to be reverted. Please use the [manual release process](#manual-release-process) to revert the changes and raise a patch release.

### How can I run the first release?

For the first release please use the [manual release process](#manual-release-process). Run `npm run release -- --first-release` to generate the initial changelog and update the package.json files.

### How can I create a prerelease?

For the first release please use the [manual release process](#manual-release-process). Run `npm run release -- --prerelease` to generate the initial changelog and update the package.json files.

### What happens if a pull request merged after the automated pull request is created?

We should try to prevent this from happening, but if it does happen, trigger the pull request to update by typing `/prepare-release` once that has completed a 🚀 and 👀 reaction would be added to the comment.

### How can I do a dry run to test out the files to be changed locally

Locally you can run  `npm run release -- --dry-run`, this would show the new version to be released, the files that would changed and a view of the changelog without changing any of the files.
