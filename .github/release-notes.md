## Strongroom

An unofficial desktop, browser and command-line client for Bitwarden. It is not made by or affiliated with Bitwarden.

### Before you install

- Strongroom needs the official Bitwarden CLI (`bw`) installed separately. It does the sign-in and the vault encryption.
- These builds are unsigned. Windows may show a SmartScreen warning.
- The macOS build is unsigned and not notarized. If it is attached to this release, macOS will block the first launch until you allow it in System Settings. The macOS build is best effort and may be missing.
- No update feed is configured. Download new versions from the releases page.

### Files

- Desktop: Linux `.AppImage` and `.deb`, Windows `.exe`, macOS `.dmg` and `.zip`.
- Browser extension zips for Chrome and Firefox, plus the Firefox sources zip.
- Raycast extension source zip.
- `strongroom-*.tgz`: the command line tool (`strongroom totp`, `strongroom health`, `strongroom attach`). It is not on npm yet.
- `SHA256SUMS`: check your download with `sha256sum -c SHA256SUMS`.
