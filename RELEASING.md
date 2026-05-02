# Releasing

EHR Buddy releases are built by GitHub Actions so the Windows installer and macOS DMG can be produced without using two local computers.

## Standard Release

1. Update `package.json` to the next version.
2. Commit and push `main`.
3. Create and push a version tag:

   ```bash
   git tag v0.3.0
   git push origin v0.3.0
   ```

4. GitHub Actions runs the `Release` workflow:
   - `windows-latest` builds the NSIS `.exe`
   - `macos-15` builds the Apple Silicon `.dmg`
   - the final job creates or updates a draft GitHub release
5. Open the draft release on GitHub, review the attached installers, then publish it.

GitHub automatically adds source `.zip` and `.tar.gz` archives for the tag when the release is published.

## Manual Release Run

If you need to rebuild release assets for an existing version, use GitHub:

1. Go to **Actions**.
2. Select **Release**.
3. Click **Run workflow**.
4. Enter the tag, such as `v0.3.0`.
5. Review the resulting draft release.

The workflow overwrites installer assets with the same name on the draft release.

## Signing

Current releases are unsigned. Windows SmartScreen and macOS Gatekeeper warnings are expected until code signing and Apple notarization are added.
