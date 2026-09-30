"""Anki Global Kit Desktop installer for synced card resources."""

import json
from pathlib import Path

from aqt import gui_hooks, mw
from aqt.qt import (
    QAction,
    QCheckBox,
    QDialog,
    QHBoxLayout,
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
DEFAULT_SETTINGS = {
    "show_syntax_highlighting": True,
    "use_markdown_formatting": True,
    "inline_code_editor": True,
}


def get_settings() -> dict[str, bool]:
    settings = mw.addonManager.getConfig(__name__) or {}
    return {**DEFAULT_SETTINGS, **settings}


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
            if name == "_anki-global-kit.min.js":
                settings = json.dumps(get_settings(), separators=(",", ":"))
                data = f"globalThis.ankiGlobalKitSettings={settings};\n".encode() + data
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
    current_settings = get_settings()

    cards_tab = QWidget(dialog)
    cards_layout = QVBoxLayout(cards_tab)
    syntax_highlighting = QCheckBox(
        "Show syntax highlighting for code blocks?", cards_tab
    )
    syntax_highlighting.setChecked(current_settings["show_syntax_highlighting"])
    cards_layout.addWidget(syntax_highlighting)
    markdown_formatting = QCheckBox(
        "Use markdown formatting in question input boxes?", cards_tab
    )
    markdown_formatting.setChecked(current_settings["use_markdown_formatting"])
    cards_layout.addWidget(markdown_formatting)
    cards_layout.addStretch()
    tabs.addTab(cards_tab, "Cards")

    editor_tab = QWidget(dialog)
    editor_layout = QVBoxLayout(editor_tab)
    inline_code_editor = QCheckBox("Add inline-code button and hotkey?", editor_tab)
    inline_code_editor.setChecked(current_settings["inline_code_editor"])
    inline_code_editor.setEnabled(markdown_formatting.isChecked())
    markdown_formatting.toggled.connect(inline_code_editor.setEnabled)
    editor_layout.addWidget(inline_code_editor)
    editor_layout.addStretch()
    tabs.addTab(editor_tab, "Editor")

    settings_note = QLabel(
        "Card settings are stored with the synced card JavaScript. Sync your "
        "collection to apply changes on your other devices."
    )
    settings_note.setWordWrap(True)
    layout.addWidget(settings_note)

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

    restore_button = QPushButton("Restore Defaults", dialog)
    restore_button.clicked.connect(
        lambda checked=False: restore_default_settings(
            syntax_highlighting,
            markdown_formatting,
            inline_code_editor,
        )
    )
    cancel_button = QPushButton("Cancel", dialog)
    cancel_button.clicked.connect(dialog.reject)
    save_button = QPushButton("Save", dialog)
    save_button.setDefault(True)
    save_button.setAutoDefault(True)
    button_width = max(cancel_button.sizeHint().width(), save_button.sizeHint().width())
    cancel_button.setFixedWidth(button_width)
    save_button.setFixedWidth(button_width)
    save_button.clicked.connect(
        lambda checked=False: save_settings(
            dialog,
            {
                "show_syntax_highlighting": syntax_highlighting.isChecked(),
                "use_markdown_formatting": markdown_formatting.isChecked(),
                "inline_code_editor": inline_code_editor.isChecked(),
            },
        )
    )
    buttons_layout = QHBoxLayout()
    buttons_layout.addWidget(restore_button)
    buttons_layout.addStretch()
    buttons_layout.addWidget(cancel_button)
    buttons_layout.addWidget(save_button)
    layout.addLayout(buttons_layout)
    dialog.exec()


def restore_default_settings(
    syntax_highlighting: QCheckBox,
    markdown_formatting: QCheckBox,
    inline_code_editor: QCheckBox,
) -> None:
    syntax_highlighting.setChecked(DEFAULT_SETTINGS["show_syntax_highlighting"])
    markdown_formatting.setChecked(DEFAULT_SETTINGS["use_markdown_formatting"])
    inline_code_editor.setChecked(DEFAULT_SETTINGS["inline_code_editor"])


def save_settings(dialog: QDialog, settings: dict[str, bool]) -> None:
    mw.addonManager.writeConfig(__name__, settings)
    update_assets_for_profile()
    dialog.accept()


settings_action = QAction("Anki Global Kit Settings...", mw)
settings_action.triggered.connect(lambda checked=False: open_settings())
mw.form.menuTools.addAction(settings_action)
