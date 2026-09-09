# Releases

Built packages from closed-source `xcode.01` are published as **GitHub Releases** on this repo.

This folder only keeps release notes. Do not commit `.exe`, `.dmg`, `.AppImage`, or other binaries.

Expected artifact names (from electron-builder):

- Windows: `xcode.01-<version>-setup.exe`
- macOS: `xcode.01-<version>.dmg`
- Linux: `xcode.01-<version>.AppImage` / `.deb`

Auto-update currently points at a generic URL in the private app. After the first public release, point `publish` / `electron-updater` at this repo's Releases, not at the private source repo.
