"""Anki Global Kit Desktop installer for synced card resources."""

import json
from pathlib import Path
from typing import Optional

from aqt import gui_hooks, mw
from aqt.qt import (
    QAction,
    QCheckBox,
    QDesktopServices,
    QDialog,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QPlainTextEdit,
    QPushButton,
    Qt,
    QTabWidget,
    QUrl,
    QVBoxLayout,
    QWidget,
)
from aqt.utils import showWarning

from .note_types import create_reference_note_types


ADDON_DIR = Path(__file__).parent
ASSET_DIR = ADDON_DIR / "web"
JS_ASSET_NAME = "_anki-global-kit.min.js"
ASSET_NAMES = (JS_ASSET_NAME, "_anki-global-kit.min.css")
VERSION = "1.0.0"
DEFAULT_SETTINGS = {
    "question_input_markdown_hotkeys": True,
    "question_input_tab_indentation": True,
    "answer_output_markdown_rendering": True,
    "answer_output_syntax_highlighting": True,
    "editor_inline_code_hotkey": True,
    "editor_inline_code_button": True,
    "editor_tab_indentation": True,
}


def get_settings() -> dict[str, bool]:
    config = mw.addonManager.getConfig(__name__) or {}

    def configured(name: str, legacy_name: Optional[str] = None) -> bool:
        if name in config:
            return config[name]
        if legacy_name:
            return config.get(legacy_name, DEFAULT_SETTINGS[name])
        return DEFAULT_SETTINGS[name]

    return {
        name: configured(name, legacy)
        for name, legacy in (
            ("question_input_markdown_hotkeys", "use_markdown_formatting"),
            ("question_input_tab_indentation", None),
            ("answer_output_markdown_rendering", "use_markdown_formatting"),
            ("answer_output_syntax_highlighting", "show_syntax_highlighting"),
            ("editor_inline_code_hotkey", "inline_code_editor"),
            ("editor_inline_code_button", "inline_code_editor"),
            ("editor_tab_indentation", None),
        )
    }


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
            if name == JS_ASSET_NAME:
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
    questions_section_group = QGroupBox("Questions", cards_tab)
    questions_section_layout = QVBoxLayout(questions_section_group)
    question_markdown_hotkeys = QCheckBox(
        "Enable Markdown formatting hotkeys for question input boxes.",
        questions_section_group,
    )
    question_markdown_hotkeys.setChecked(
        current_settings["question_input_markdown_hotkeys"]
    )
    questions_section_layout.addWidget(question_markdown_hotkeys)
    question_tab_indentation = QCheckBox(
        "Enable Tab indentation for question input boxes.", questions_section_group
    )
    question_tab_indentation.setChecked(
        current_settings["question_input_tab_indentation"]
    )
    questions_section_layout.addWidget(question_tab_indentation)
    cards_layout.addWidget(questions_section_group)

    answers_section_group = QGroupBox("Answers", cards_tab)
    answers_section_layout = QVBoxLayout(answers_section_group)
    answer_markdown_rendering = QCheckBox(
        "Enable Markdown rendering for submitted answers.", answers_section_group
    )
    answer_markdown_rendering.setChecked(
        current_settings["answer_output_markdown_rendering"]
    )
    answers_section_layout.addWidget(answer_markdown_rendering)
    answer_syntax_highlighting = QCheckBox(
        "Enable syntax highlighting for code blocks in submitted answers.",
        answers_section_group,
    )
    answer_syntax_highlighting.setChecked(
        current_settings["answer_output_syntax_highlighting"]
    )
    answers_section_layout.addWidget(answer_syntax_highlighting)
    cards_layout.addWidget(answers_section_group)
    cards_layout.addStretch()
    tabs.addTab(cards_tab, "Cards")

    editor_tab = QWidget(dialog)
    editor_layout = QVBoxLayout(editor_tab)
    fields_section_group = QGroupBox("Fields", editor_tab)
    fields_section_layout = QVBoxLayout(fields_section_group)
    inline_code_hotkey = QCheckBox("Enable Inline Code hotkey.", fields_section_group)
    inline_code_hotkey.setChecked(current_settings["editor_inline_code_hotkey"])
    fields_section_layout.addWidget(inline_code_hotkey)
    editor_tab_indentation = QCheckBox("Enable Tab indentation.", fields_section_group)
    editor_tab_indentation.setChecked(current_settings["editor_tab_indentation"])
    fields_section_layout.addWidget(editor_tab_indentation)
    editor_layout.addWidget(fields_section_group)

    ui_section_group = QGroupBox("UI", editor_tab)
    ui_section_layout = QVBoxLayout(ui_section_group)
    inline_code_button = QCheckBox("Display Inline Code toggle button.", ui_section_group)
    inline_code_button.setChecked(current_settings["editor_inline_code_button"])
    ui_section_layout.addWidget(inline_code_button)
    editor_layout.addWidget(ui_section_group)
    editor_layout.addStretch()
    tabs.addTab(editor_tab, "Editor")

    settings_note = QLabel(
        "Sync your collection with AnkiWeb to apply changes on your other devices."
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
    note_types_button.setAutoDefault(False)
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
        "<h3>Anki Global Kit Addon "
        '<small style="font-weight: normal">by Jacob Cassidy</small></h3>'
        "<p>An Anki add-on that adds advanced features such as multiple input boxes, "
        "editor hotkeys, Markdown formatting and rendering, code syntax highlighting, "
        "and shared card styles that can be synced globally.</p>"
        f"<p>Settings are saved to the collection.media/<code>{JS_ASSET_NAME}</code> file.</p>"
    )
    about.setWordWrap(True)
    about_layout.addWidget(about)
    repository_button = QPushButton("GitHub Repo", about_tab)
    repository_button.setAutoDefault(False)
    repository_button.clicked.connect(
        lambda checked=False: QDesktopServices.openUrl(
            QUrl("https://github.com/jacobcassidy/anki-global-kit-addon")
        )
    )
    about_layout.addWidget(repository_button, alignment=Qt.AlignmentFlag.AlignLeft)
    about_layout.addWidget(QLabel(f"<small>v{VERSION}</small>", about_tab))
    about_layout.addStretch()
    tabs.addTab(about_tab, "About")

    restore_button = QPushButton("Restore Defaults", dialog)
    restore_button.setAutoDefault(False)
    restore_button.clicked.connect(
        lambda checked=False: restore_default_settings(
            question_markdown_hotkeys,
            question_tab_indentation,
            answer_markdown_rendering,
            answer_syntax_highlighting,
            inline_code_hotkey,
            inline_code_button,
            editor_tab_indentation,
        )
    )
    cancel_button = QPushButton("Cancel", dialog)
    cancel_button.setAutoDefault(False)
    cancel_button.clicked.connect(dialog.reject)
    save_button = QPushButton("Save", dialog)
    save_button.setDefault(True)
    save_button.setAutoDefault(False)
    button_width = max(cancel_button.sizeHint().width(), save_button.sizeHint().width())
    cancel_button.setFixedWidth(button_width)
    save_button.setFixedWidth(button_width)
    save_button.clicked.connect(
        lambda checked=False: save_settings(
            dialog,
            {
                "question_input_markdown_hotkeys": question_markdown_hotkeys.isChecked(),
                "question_input_tab_indentation": question_tab_indentation.isChecked(),
                "answer_output_markdown_rendering": answer_markdown_rendering.isChecked(),
                "answer_output_syntax_highlighting": answer_syntax_highlighting.isChecked(),
                "editor_inline_code_hotkey": inline_code_hotkey.isChecked(),
                "editor_inline_code_button": inline_code_button.isChecked(),
                "editor_tab_indentation": editor_tab_indentation.isChecked(),
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
    question_markdown_hotkeys: QCheckBox,
    question_tab_indentation: QCheckBox,
    answer_markdown_rendering: QCheckBox,
    answer_syntax_highlighting: QCheckBox,
    inline_code_hotkey: QCheckBox,
    inline_code_button: QCheckBox,
    editor_tab_indentation: QCheckBox,
) -> None:
    question_markdown_hotkeys.setChecked(
        DEFAULT_SETTINGS["question_input_markdown_hotkeys"]
    )
    question_tab_indentation.setChecked(
        DEFAULT_SETTINGS["question_input_tab_indentation"]
    )
    answer_markdown_rendering.setChecked(
        DEFAULT_SETTINGS["answer_output_markdown_rendering"]
    )
    answer_syntax_highlighting.setChecked(
        DEFAULT_SETTINGS["answer_output_syntax_highlighting"]
    )
    inline_code_hotkey.setChecked(DEFAULT_SETTINGS["editor_inline_code_hotkey"])
    inline_code_button.setChecked(DEFAULT_SETTINGS["editor_inline_code_button"])
    editor_tab_indentation.setChecked(DEFAULT_SETTINGS["editor_tab_indentation"])


def save_settings(dialog: QDialog, settings: dict[str, bool]) -> None:
    mw.addonManager.writeConfig(__name__, settings)
    update_assets_for_profile()
    dialog.accept()


settings_action = QAction("Anki Global Kit Settings...", mw)
settings_action.triggered.connect(lambda checked=False: open_settings())
mw.form.menuTools.addAction(settings_action)
