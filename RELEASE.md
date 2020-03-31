# One App release process

This defines the One App release process. 

Releases can be triggered in two ways:

  - [Automated release process](#automated-release-process)
  - [Manual release process](#manual-release-process)

## Automated release process

 1. An automated pull request will be raised every Wednesday, this would be from the `release-automated` branch to master. This uses this [pull_request_release workflow](.github/workflows/pull_request_release.yml)and updates package.json, package-lock.json and the changelog(Behind the scene it uses [standard-version](https://github.com/conventional-changelog/standard-version) to generate and update this files) with the changes to be released. The commit message contains the version to be released. Updated this pull request to remove or add any new changes.
 2. Once a pull request is reviewed merge the pull request and please ensure that the commit message is updated to follow this pattern  

   ``` bash
   #chore(release): v5.0.0
   chore(release): v<semantic-version>

   ```

3. The merge will trigger the automatic generation of a new tag using the semantic version provided during the merging of the pull request above.

4. After the the generated tag is pushed to the branch this will trigger the docker build and push of the images and statics to the docker hub. The development and production images would be accessible in docker [https://hub.docker.com/u/oneamex](https://hub.docker.com/u/oneamex)

5. For the github release notes we are currently using [https://github.com/release-drafter/release-drafter](https://github.com/release-drafter/release-drafter) to generate release notes. Please use the labels specified within [release-drafter](.github/release-drafter.yml) to categorize the different pull requests by adding the labels to them. Update the draft release notes and tie it to the released tag above you can also link this to different artifacts.

## Manual release process

This process can be used to make ad hoc releases outside of wednesday release cycle.

 1. Run `npm run release` locally within your branch, this would update the changelog,package.json and package-lock.json with the new version to be released. Push your changes and create a pull request to master.
 2. When the changes are merged and reviewed. Generate a tag and push that tag to master. This will kick of the One App release to docker and the same process from step 5 above will be followed.

## How can i revert a release

If changes were made and need to be reverted. Please use the [manual release process](#manual-release-process) to revert the changes.
