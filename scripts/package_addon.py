"""Create an AnkiWeb archive using the repository changelog as its source."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
ADDON_ROOT = REPOSITORY_ROOT / "addon"
ARCHIVE_PATH = REPOSITORY_ROOT / "dist" / "anki-global-kit.ankiaddon"
PACKAGE_PATHS = (
    "__init__.py",
    "desktop",
    "config.json",
    "manifest.json",
    "README.md",
    "web",
    "templates",
)


def package_files() -> list[Path]:
    files = []
    for item in PACKAGE_PATHS:
        path = ADDON_ROOT / item
        if path.is_file():
            files.append(path)
        elif path.is_dir():
            files.extend(
                child
                for child in path.rglob("*")
                if child.is_file()
                and "__pycache__" not in child.parts
                and child.suffix != ".pyc"
                and child.name != ".DS_Store"
            )
    return sorted(files)


def main() -> None:
    changelog = REPOSITORY_ROOT / "CHANGELOG.md"
    if not changelog.is_file():
        raise FileNotFoundError(f"The canonical changelog is missing: {changelog}")

    ARCHIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(ARCHIVE_PATH, "w", compression=ZIP_DEFLATED) as archive:
        for path in package_files():
            archive.write(path, path.relative_to(ADDON_ROOT).as_posix())
        archive.write(changelog, "CHANGELOG.md")

    print(f"Created {ARCHIVE_PATH}")


if __name__ == "__main__":
    main()
