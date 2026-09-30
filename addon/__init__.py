"""Anki Global Kit Desktop installer for synced card resources."""

from pathlib import Path

from aqt import gui_hooks, mw
from aqt.qt import QAction, QDialog, QLabel, QPushButton, QVBoxLayout
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
    dialog.setMinimumWidth(360)

    layout = QVBoxLayout(dialog)
    layout.addWidget(
        QLabel(
            "Card files are refreshed automatically when an Anki profile opens. "
            "You can create the reference note types from this panel."
        )
    )

    note_types_button = QPushButton("Create Note Types", dialog)
    note_types_button.clicked.connect(
        lambda checked=False: create_reference_note_types()
    )
    layout.addWidget(note_types_button)

    close_button = QPushButton("Close", dialog)
    close_button.clicked.connect(dialog.accept)
    layout.addWidget(close_button)
    dialog.exec()


settings_action = QAction("Anki Global Kit Settings...", mw)
settings_action.triggered.connect(lambda checked=False: open_settings())
mw.form.menuTools.addAction(settings_action)
