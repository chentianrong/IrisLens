# Windows upgrade retention

IrisLens installs per user with `deleteAppDataOnUninstall: false`. Overwriting the NSIS installation must not remove `%APPDATA%\IrisLens`, which contains non-secret settings, SQLite history, and workspace checkpoint metadata.
