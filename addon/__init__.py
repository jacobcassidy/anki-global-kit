"""Anki Global Kit Desktop installer for synced card resources."""

from pathlib import Path

from aqt import gui_hooks, mw
from aqt.qt import QAction, QMenu
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

global_kit_menu = QMenu("Anki Global Kit", mw)

note_types_action = QAction("Create Note Types", mw)
note_types_action.triggered.connect(lambda checked=False: create_reference_note_types())
global_kit_menu.addAction(note_types_action)

mw.form.menuTools.addMenu(global_kit_menu)
