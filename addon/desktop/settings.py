"""Anki Global Kit Desktop installer for synced card resources."""

import json
from pathlib import Path

from aqt import gui_hooks, mw
from aqt.qt import (
    QAction,
    QCheckBox,
    QDesktopServices,
    QDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QKeySequence,
    QLineEdit,
    QPlainTextEdit,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    Qt,
    QTabWidget,
    QUrl,
    QVBoxLayout,
    QWidget,
)
from aqt.utils import is_mac, showWarning

from .note_types import FORMATS, TOPICS, create_selected_note_types


ADDON_DIR = Path(__file__).resolve().parent.parent
ADDON_PACKAGE_NAME = __package__.split(".", maxsplit=1)[0]
ASSET_DIR = ADDON_DIR / "web"
JS_ASSET_NAME = "_anki-global-kit.min.js"
ASSET_NAMES = (JS_ASSET_NAME, "_anki-global-kit.min.css")
VERSION = "1.0.0"
DEFAULT_SETTINGS = {
    "card_input_markdown_hotkeys": True,
    "card_input_tab_indentation": True,
    "card_review_markdown_rendering": True,
    "card_review_syntax_highlighting": True,
    "card_toolbar_enabled": True,
    "card_toolbar_bold": True,
    "card_toolbar_italic": True,
    "card_toolbar_strikethrough": True,
    "card_toolbar_code_block": True,
    "card_toolbar_inline_code": True,
    "card_toolbar_unordered_list": True,
    "card_toolbar_ordered_list": True,
    "card_toolbar_blockquote": True,
    "anki_editor_inline_code_hotkey": True,
    "anki_editor_inline_code_shortcut": "Ctrl+Shift+C",
    "anki_editor_tab_indentation": True,
    "anki_editor_inline_code_button": True,
    "anki_editor_normalize_code_spaces": True,
    "anki_editor_copy_source_html": True,
    "anki_editor_paste_cleanup": True,
}


class ShortcutInput(QLineEdit):
    """Capture a shortcut chord instead of accepting arbitrary text."""

    def keyPressEvent(self, event) -> None:
        if event.key() in (Qt.Key.Key_Backspace, Qt.Key.Key_Delete):
            self.clear()
            event.accept()
            return

        modifiers = event.modifiers()
        parts = []
        for modifier, name in (
            (Qt.KeyboardModifier.ControlModifier, "Ctrl"),
            (Qt.KeyboardModifier.AltModifier, "Alt"),
            (Qt.KeyboardModifier.ShiftModifier, "Shift"),
            (Qt.KeyboardModifier.MetaModifier, "Meta"),
        ):
            if modifiers & modifier:
                parts.append(name)

        if not parts:
            super().keyPressEvent(event)
            return

        key_name = QKeySequence(event.key()).toString(
            QKeySequence.SequenceFormat.PortableText
        )
        if key_name and key_name not in {"Ctrl", "Alt", "Shift", "Meta"}:
            self.setText("+".join((*parts, key_name)))
            event.accept()
            return

        event.accept()


def get_settings() -> dict[str, bool]:
    config = mw.addonManager.getConfig(ADDON_PACKAGE_NAME) or {}
    return {
        name: config.get(name, default)
        for name, default in DEFAULT_SETTINGS.items()
        if not name.startswith("anki_editor_")
    }


def get_editor_settings() -> dict[str, object]:
    config = mw.addonManager.getConfig(ADDON_PACKAGE_NAME) or {}
    return {
        name: config.get(name, default)
        for name, default in DEFAULT_SETTINGS.items()
        if name.startswith("anki_editor_")
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


def open_settings() -> None:
    """Show Anki Global Kit actions and settings."""
    dialog = QDialog(mw)
    dialog.setWindowTitle("Anki Global Kit Settings")
    dialog.setMinimumSize(480, 360)

    layout = QVBoxLayout(dialog)
    tabs = QTabWidget(dialog)
    layout.addWidget(tabs)
    current_settings = get_settings()
    current_settings.update(get_editor_settings())

    cards_tab = QWidget(dialog)
    cards_layout = QVBoxLayout(cards_tab)
    questions_section_group = QGroupBox("Card Inputs (Questions)", cards_tab)
    questions_section_layout = QVBoxLayout(questions_section_group)
    question_markdown_hotkeys = QCheckBox(
        "Enable Markdown hotkeys",
        questions_section_group,
    )
    question_markdown_hotkeys.setChecked(
        current_settings["card_input_markdown_hotkeys"]
    )
    questions_section_layout.addWidget(question_markdown_hotkeys)
    primary_shortcut = "⌘" if is_mac else "Ctrl+"
    shift_shortcut = "⇧" if is_mac else "Shift+"
    if is_mac:
        code_block_shortcut = "⌃⌘C"
    else:
        code_block_shortcut = "Ctrl+Alt+C"
    question_tab_indentation = QCheckBox(
        "Enable tab indentation", questions_section_group
    )
    question_tab_indentation.setChecked(
        current_settings["card_input_tab_indentation"]
    )
    questions_section_layout.addWidget(question_tab_indentation)
    cards_layout.addWidget(questions_section_group)

    answers_section_group = QGroupBox("Card Reviews (Answers)", cards_tab)
    answers_section_layout = QVBoxLayout(answers_section_group)
    answer_markdown_rendering = QCheckBox(
        "Enable Markdown rendering", answers_section_group
    )
    answer_markdown_rendering.setChecked(
        current_settings["card_review_markdown_rendering"]
    )
    answers_section_layout.addWidget(answer_markdown_rendering)
    answer_syntax_highlighting = QCheckBox(
        "Enable code block syntax highlighting",
        answers_section_group,
    )
    answer_syntax_highlighting.setChecked(
        current_settings["card_review_syntax_highlighting"]
    )
    answers_section_layout.addWidget(answer_syntax_highlighting)
    cards_layout.addWidget(answers_section_group)
    card_tools_section_group = QGroupBox("Card Tools", cards_tab)
    card_tools_section_layout = QVBoxLayout(card_tools_section_group)
    card_toolbar_enabled = QCheckBox("Show formatting toolbar", card_tools_section_group)
    card_toolbar_enabled.setChecked(current_settings["card_toolbar_enabled"])
    card_tools_section_layout.addWidget(card_toolbar_enabled)
    toolbar_buttons_container = QWidget(card_tools_section_group)
    toolbar_buttons_layout = QVBoxLayout(toolbar_buttons_container)
    toolbar_buttons_layout.setContentsMargins(20, 0, 0, 0)
    toolbar_buttons = {}
    toolbar_hotkeys = {
        "card_toolbar_bold": f"{primary_shortcut}B",
        "card_toolbar_italic": f"{primary_shortcut}I",
        "card_toolbar_strikethrough": f"{primary_shortcut}{shift_shortcut}X",
        "card_toolbar_code_block": code_block_shortcut,
        "card_toolbar_inline_code": f"{primary_shortcut}{shift_shortcut}C",
    }
    for setting, label in (
        ("card_toolbar_bold", "Show bold button"),
        ("card_toolbar_italic", "Show italic button"),
        ("card_toolbar_strikethrough", "Show strikethrough button"),
        ("card_toolbar_code_block", "Show code block button"),
        ("card_toolbar_inline_code", "Show inline code button"),
        ("card_toolbar_unordered_list", "Show unordered list button"),
        ("card_toolbar_ordered_list", "Show ordered list button"),
        ("card_toolbar_blockquote", "Show blockquote button"),
    ):
        hotkey = toolbar_hotkeys.get(setting)
        checkbox_label = f"{label} ({hotkey})" if hotkey else label
        checkbox = QCheckBox(checkbox_label, toolbar_buttons_container)
        checkbox.setChecked(current_settings[setting])
        checkbox.setEnabled(card_toolbar_enabled.isChecked())
        toolbar_buttons_layout.addWidget(checkbox)
        toolbar_buttons[setting] = checkbox
    card_tools_section_layout.addWidget(toolbar_buttons_container)
    def set_toolbar_buttons_enabled(enabled: bool) -> None:
        for checkbox in toolbar_buttons.values():
            checkbox.setEnabled(enabled)

    card_toolbar_enabled.toggled.connect(set_toolbar_buttons_enabled)
    cards_layout.addWidget(card_tools_section_group)
    card_settings_widgets = {
        "card_input_markdown_hotkeys": question_markdown_hotkeys,
        "card_input_tab_indentation": question_tab_indentation,
        "card_review_markdown_rendering": answer_markdown_rendering,
        "card_review_syntax_highlighting": answer_syntax_highlighting,
        "card_toolbar_enabled": card_toolbar_enabled,
        **toolbar_buttons,
    }
    cards_layout.addStretch()
    tabs.addTab(cards_tab, "Cards")

    editor_tab = QWidget(dialog)
    editor_layout = QVBoxLayout(editor_tab)
    fields_section_group = QGroupBox("Editor Fields", editor_tab)
    fields_section_layout = QVBoxLayout(fields_section_group)
    editor_inline_code_hotkey = QCheckBox(
        "Enable inline code formatting hotkey", fields_section_group
    )
    editor_inline_code_hotkey.setChecked(current_settings["anki_editor_inline_code_hotkey"])
    fields_section_layout.addWidget(editor_inline_code_hotkey)
    editor_inline_code_shortcut = ShortcutInput(
        current_settings["anki_editor_inline_code_shortcut"], fields_section_group
    )
    editor_inline_code_shortcut.setReadOnly(True)
    editor_inline_code_shortcut.setPlaceholderText("Focus and press a shortcut")
    editor_inline_code_shortcut.setToolTip(
        "Focus this field and press the key combination you want to use."
    )
    shortcut_row = QHBoxLayout()
    shortcut_row.addWidget(QLabel("Inline code shortcut", fields_section_group))
    shortcut_row.addWidget(editor_inline_code_shortcut)
    fields_section_layout.addLayout(shortcut_row)
    editor_tab_indentation = QCheckBox("Enable tab indentation in fields", fields_section_group)
    editor_tab_indentation.setChecked(
        current_settings.get("anki_editor_tab_indentation", True)
    )
    fields_section_layout.addWidget(editor_tab_indentation)
    normalize_code_spaces = QCheckBox(
        "Normalize spaces around inline code", fields_section_group
    )
    normalize_code_spaces.setChecked(current_settings["anki_editor_normalize_code_spaces"])
    fields_section_layout.addWidget(normalize_code_spaces)
    copy_source_html = QCheckBox("Copy selected source HTML", fields_section_group)
    copy_source_html.setChecked(current_settings["anki_editor_copy_source_html"])
    fields_section_layout.addWidget(copy_source_html)
    editor_layout.addWidget(fields_section_group)

    ui_section_group = QGroupBox("Editor UI", editor_tab)
    ui_section_layout = QVBoxLayout(ui_section_group)
    inline_code_button = QCheckBox(
        "Show inline code formatting button", ui_section_group
    )
    inline_code_button.setChecked(current_settings["anki_editor_inline_code_button"])
    ui_section_layout.addWidget(inline_code_button)
    paste_cleanup = QCheckBox("Clean up formatting when pasting", ui_section_group)
    paste_cleanup.setChecked(current_settings["anki_editor_paste_cleanup"])
    ui_section_layout.addWidget(paste_cleanup)
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
            "Select your card topics and formats to use for your new note types:"
        )
    )
    note_types_scroll = QScrollArea(note_types_tab)
    note_types_scroll.setWidgetResizable(True)
    note_types_options = QWidget(note_types_scroll)
    note_types_grid = QGridLayout(note_types_options)

    def add_note_type_heading(label: str, column: int, alignment=None) -> None:
        heading = QLabel(label, note_types_options)
        heading_font = heading.font()
        heading_font.setBold(True)
        heading.setFont(heading_font)
        if alignment is None:
            note_types_grid.addWidget(heading, 0, column)
        else:
            note_types_grid.addWidget(heading, 0, column, alignment=alignment)

    add_note_type_heading("Topic", 0)
    for format_index, card_format in enumerate(FORMATS):
        selected_column = 1 + format_index * 2
        overwrite_column = selected_column + 1
        add_note_type_heading(
            card_format, selected_column, Qt.AlignmentFlag.AlignHCenter
        )
        add_note_type_heading(
            "Overwrite", overwrite_column, Qt.AlignmentFlag.AlignHCenter
        )

    addon_config = mw.addonManager.getConfig(ADDON_PACKAGE_NAME) or {}
    saved_selections = addon_config.get("note_type_selections", {})
    note_type_checks: dict[str, dict[str, QCheckBox]] = {}
    overwrite_checks: dict[str, dict[str, QCheckBox]] = {}
    existing_note_type_names = (
        {item.name for item in mw.col.models.all_names_and_ids()}
        if mw.col is not None
        else set()
    )
    for row, topic in enumerate(TOPICS, start=1):
        if row % 2 == 0:
            row_background = QWidget(note_types_options)
            row_background.setStyleSheet("background-color: #f7f7f7;")
            note_types_grid.addWidget(
                row_background, row, 0, 1, 1 + len(FORMATS) * 2
            )
            row_background.lower()
        note_types_grid.addWidget(QLabel(topic, note_types_options), row, 0)
        note_type_checks[topic] = {}
        overwrite_checks[topic] = {}
        for format_index, card_format in enumerate(FORMATS):
            selected_column = 1 + format_index * 2
            overwrite_column = selected_column + 1
            type_name = f"{topic} ({card_format})"
            checkbox = QCheckBox(note_types_options)
            checkbox.setChecked(
                saved_selections.get(topic, {}).get(card_format, False)
            )
            exists = type_name in existing_note_type_names
            checkbox.setEnabled(not exists)
            note_types_grid.addWidget(
                checkbox,
                row,
                selected_column,
                alignment=Qt.AlignmentFlag.AlignCenter,
            )
            note_type_checks[topic][card_format] = checkbox
            overwrite_checkbox = QCheckBox(note_types_options)
            overwrite_checkbox.setEnabled(exists)
            overwrite_checkbox.setToolTip(
                "Overwrite this existing note type"
                if exists
                else "Available after this note type has been created"
            )
            note_types_grid.addWidget(
                overwrite_checkbox,
                row,
                overwrite_column,
                alignment=Qt.AlignmentFlag.AlignCenter,
            )
            overwrite_checks[topic][card_format] = overwrite_checkbox
    note_types_scroll.setWidget(note_types_options)
    note_types_layout.addWidget(note_types_scroll)

    def create_note_types_from_panel(checked=False) -> None:
        create_selected_note_types(
            {
                topic: {
                    card_format
                    for card_format, checkbox in formats.items()
                    if checkbox.isChecked()
                }
                for topic, formats in note_type_checks.items()
            },
            {
                topic: {
                    card_format
                    for card_format, checkbox in formats.items()
                    if checkbox.isChecked()
                }
                for topic, formats in overwrite_checks.items()
            },
        )
        if mw.col is None:
            return
        existing_names = {item.name for item in mw.col.models.all_names_and_ids()}
        for topic, formats in overwrite_checks.items():
            for card_format, overwrite_checkbox in formats.items():
                exists = f"{topic} ({card_format})" in existing_names
                note_type_checks[topic][card_format].setEnabled(not exists)
                overwrite_checkbox.setEnabled(exists)
                if not exists:
                    overwrite_checkbox.setChecked(False)
                overwrite_checkbox.setToolTip(
                    "Overwrite this existing note type"
                    if exists
                    else "Available after this note type has been created"
                )

    note_types_button = QPushButton("Create Selected Note Types", dialog)
    note_types_button.setAutoDefault(False)
    note_types_button.setSizePolicy(
        QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed
    )
    note_types_button.clicked.connect(create_note_types_from_panel)
    note_types_layout.addWidget(
        note_types_button, alignment=Qt.AlignmentFlag.AlignLeft
    )
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
        "<h3>Anki Global Kit "
        f'<small style="font-weight: normal">by Jacob Cassidy (v{VERSION})</small></h3>'
        "<p>A collection of global features that supercharges Anki flashcards. Features include advanced input fields, markdown formatting and rendering, card styles, and much more that work across apps. Perfect for programming reviews (and other topics too!).</p>"
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
    about_layout.addStretch()
    tabs.addTab(about_tab, "About")

    restore_button = QPushButton("Restore Defaults", dialog)
    restore_button.setAutoDefault(False)
    restore_button.clicked.connect(
        lambda checked=False: restore_default_settings(
            card_settings_widgets,
            inline_code_button,
            editor_inline_code_hotkey,
            editor_inline_code_shortcut,
            editor_tab_indentation,
            normalize_code_spaces,
            copy_source_html,
            paste_cleanup,
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
                **{
                    key: checkbox.isChecked()
                    for key, checkbox in card_settings_widgets.items()
                },
                "anki_editor_inline_code_hotkey": editor_inline_code_hotkey.isChecked(),
                "anki_editor_inline_code_shortcut": editor_inline_code_shortcut.text().strip() or DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"],
                "anki_editor_tab_indentation": editor_tab_indentation.isChecked(),
                "anki_editor_inline_code_button": inline_code_button.isChecked(),
                "anki_editor_normalize_code_spaces": normalize_code_spaces.isChecked(),
                "anki_editor_copy_source_html": copy_source_html.isChecked(),
                "anki_editor_paste_cleanup": paste_cleanup.isChecked(),
                "note_type_selections": {
                    topic: {
                        card_format: checkbox.isChecked()
                        for card_format, checkbox in formats.items()
                    }
                    for topic, formats in note_type_checks.items()
                },
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
    card_settings_widgets: dict[str, QCheckBox],
    inline_code_button: QCheckBox,
    editor_inline_code_hotkey: QCheckBox,
    editor_inline_code_shortcut: QLineEdit,
    editor_tab_indentation: QCheckBox,
    normalize_code_spaces: QCheckBox,
    copy_source_html: QCheckBox,
    paste_cleanup: QCheckBox,
) -> None:
    for key, checkbox in card_settings_widgets.items():
        checkbox.setChecked(DEFAULT_SETTINGS[key])
    editor_inline_code_hotkey.setChecked(DEFAULT_SETTINGS["anki_editor_inline_code_hotkey"])
    editor_inline_code_shortcut.setText(DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"])
    editor_tab_indentation.setChecked(DEFAULT_SETTINGS["anki_editor_tab_indentation"])
    inline_code_button.setChecked(DEFAULT_SETTINGS["anki_editor_inline_code_button"])
    normalize_code_spaces.setChecked(DEFAULT_SETTINGS["anki_editor_normalize_code_spaces"])
    copy_source_html.setChecked(DEFAULT_SETTINGS["anki_editor_copy_source_html"])
    paste_cleanup.setChecked(DEFAULT_SETTINGS["anki_editor_paste_cleanup"])


def save_settings(dialog: QDialog, settings: dict[str, object]) -> None:
    mw.addonManager.writeConfig(ADDON_PACKAGE_NAME, settings)
    update_assets_for_profile()
    dialog.accept()


def initialize() -> None:
    gui_hooks.profile_did_open.append(update_assets_for_profile)
    settings_action = QAction("Anki Global Kit Settings...", mw)
    settings_action.triggered.connect(lambda checked=False: open_settings())
    mw.form.menuTools.addAction(settings_action)
