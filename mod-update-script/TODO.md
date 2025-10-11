# TODO

- Move this project to the `.minecraft/` folder
- Finish the version check if version not found
- Add a config "per directory" either in `mods/` folder or `/config/mods-update`
- Some mod filenames may not match the actual Minecraft version inside the jar. For example, `indium-1.0.36+mc1.20.1.jar` may contain `Fabric-Minecraft-Version: 1.20.1` in its manifest, even if the filename or config suggests otherwise. The only reliable way to check is to inspect the manifest inside the jar. This can be automated or handled manually later.
- Ensure that all dry-run output lines are consistently prefixed with `[Dry-run]` for clarity, including when no update is found (e.g., for Better Days).
