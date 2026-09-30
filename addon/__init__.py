"""Anki Global Kit Desktop installer for synced card resources."""

from pathlib import Path

from aqt import gui_hooks, mw
from aqt.qt import (
    QAction,
    QDialog,
    QLabel,
    QPlainTextEdit,
    QPushButton,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)
from aqt.utils import showWarning

from .note_types import create_reference_note_types


ADDON_DIR = Path(__file__).parent
ASSET_DIR = ADDON_DIR / "web"
ASSET_NAMES = ("_anki-global-kit.min.js", "_anki-global-kit.min.css")


def update_assets_for_profile() -> None:
    """Install or refresh the managed card assets when a profile opens."""
    if mw.col is None:
        return

    missing = [name for name in ASSET_NAMES if not (ASSET_DIR / name).is_file()]
    if missing:
        showWarning(
            "Anki Global Kit assets have not been built. From the project folder, "
            "run `npm run build:addon`, then restart Anki and try again."
        )
        return

    try:
        for name in ASSET_NAMES:
            data = (ASSET_DIR / name).read_bytes()
            destination = Path(mw.col.media.dir()) / name
            previous = destination.read_bytes() if destination.is_file() else None
            if previous == data:
                continue

            # MediaManager.write_data intentionally avoids replacing media with
            # different content, so move an older kit-owned file to Anki's media
            # trash first. Keep a copy for recovery if writing the update fails.
            if previous is not None:
                mw.col.media.trash_files([name])
            try:
                stored_name = mw.col.media.write_data(name, data)
                if stored_name != name:
                    raise OSError(
                        f"Anki stored {name} under a different filename: {stored_name}"
                    )
            except Exception:
                if previous is not None:
                    mw.col.media.write_data(name, previous)
                raise
    except Exception as error:  # Anki's media backend reports filesystem errors here.
        showWarning(f"Could not refresh Anki Global Kit card files:\n{error}")


gui_hooks.profile_did_open.append(update_assets_for_profile)


def open_settings() -> None:
    """Show Anki Global Kit actions and settings."""
    dialog = QDialog(mw)
    dialog.setWindowTitle("Anki Global Kit Settings")
    dialog.setMinimumSize(480, 360)

    layout = QVBoxLayout(dialog)
    tabs = QTabWidget(dialog)
    layout.addWidget(tabs)

    general_tab = QWidget(dialog)
    general_layout = QVBoxLayout(general_tab)
    general_layout.addWidget(
        QLabel(
            "Anki Global Kit automatically installs or refreshes its card JavaScript "
            "and CSS whenever an Anki profile opens. Sync your collection to make "
            "those files available on your other devices."
        )
    )
    general_layout.addStretch()
    tabs.addTab(general_tab, "General")

    note_types_tab = QWidget(dialog)
    note_types_layout = QVBoxLayout(note_types_tab)
    note_types_layout.addWidget(
        QLabel(
            "Create the Advance and Cloze reference note types. Existing note types "
            "with the same names will be left unchanged."
        )
    )
    note_types_button = QPushButton("Create Note Types", dialog)
    note_types_button.clicked.connect(
        lambda checked=False: create_reference_note_types()
    )
    note_types_layout.addWidget(note_types_button)
    note_types_layout.addStretch()
    tabs.addTab(note_types_tab, "Note Types")

    changelog_tab = QWidget(dialog)
    changelog_layout = QVBoxLayout(changelog_tab)
    changelog = QPlainTextEdit(changelog_tab)
    changelog.setReadOnly(True)
    changelog_path = ADDON_DIR / "CHANGELOG.md"
    changelog.setPlainText(
        changelog_path.read_text(encoding="utf-8")
        if changelog_path.is_file()
        else "No changelog is available in this add-on package."
    )
    changelog_layout.addWidget(changelog)
    tabs.addTab(changelog_tab, "Changelog")

    about_tab = QWidget(dialog)
    about_layout = QVBoxLayout(about_tab)
    about = QLabel(
        '<h3>Anki Global Kit</h3>'
        '<p>Reusable card templates, typed-answer tools, Markdown rendering, '
        'syntax highlighting, and shared card styling for Anki.</p>'
        '<p><a href="https://github.com/jacobcassidy/anki-global-kit">'
        "Project website and source code</a></p>"
    )
    about.setWordWrap(True)
    about.setOpenExternalLinks(True)
    about_layout.addWidget(about)
    about_layout.addStretch()
    tabs.addTab(about_tab, "About")

    close_button = QPushButton("Close", dialog)
    close_button.clicked.connect(dialog.accept)
    layout.addWidget(close_button)
    dialog.exec()


settings_action = QAction("Anki Global Kit Settings...", mw)
settings_action.triggered.connect(lambda checked=False: open_settings())
mw.form.menuTools.addAction(settings_action)
