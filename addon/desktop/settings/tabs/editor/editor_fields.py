"""Settings section for Anki editor fields and the inline-code shortcut."""

from dataclasses import dataclass

from aqt.qt import QCheckBox, QGroupBox, QHBoxLayout, QLabel, QVBoxLayout, QWidget

from ...constants import COLOR_WARNING_700, DEFAULT_SETTINGS, ZERO_MARGINS
from ...widgets import CardShortcutInput, add_checkbox_row, make_reset_link


@dataclass
class EditorFieldsSection:
    widget: QGroupBox
    controls: dict[str, QWidget]
    shortcut_toggle: QCheckBox
    shortcut_input: CardShortcutInput
    reset_link: QWidget
    warning_label: QLabel


def build_editor_fields_section(parent: QWidget, current_settings: dict) -> EditorFieldsSection:
    section = QGroupBox("Editor Fields", parent)
    layout = QVBoxLayout(section)
    shortcut_enabled = QCheckBox("Enable inline code shortcut", section)
    shortcut_enabled.setChecked(
        current_settings["anki_editor_inline_code_shortcut_enabled"]
    )
    shortcut_input = CardShortcutInput(
        current_settings["anki_editor_inline_code_shortcut"], section
    )
    shortcut_controls = QWidget(section)
    shortcut_controls_layout = QHBoxLayout(shortcut_controls)
    shortcut_controls_layout.setContentsMargins(*ZERO_MARGINS)
    reset_link = make_reset_link(
        shortcut_controls,
        shortcut_input,
        DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"],
    )
    shortcut_controls_layout.addWidget(reset_link)
    shortcut_controls_layout.addWidget(shortcut_input)

    def set_shortcut_enabled(enabled: bool) -> None:
        shortcut_controls.setEnabled(enabled)
        shortcut_input.set_text_dimmed(not enabled)
        reset_link.setEnabled(
            enabled
            and shortcut_input.stored_shortcut()
            != DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"]
        )

    set_shortcut_enabled(shortcut_enabled.isChecked())
    warning_label = QLabel(section)
    warning_label.setWordWrap(True)
    warning_label.setStyleSheet(f"color: {COLOR_WARNING_700};")
    warning_label.hide()
    shortcut_input.set_validation_label(warning_label)
    add_checkbox_row(
        layout,
        shortcut_enabled,
        trailing_widget=shortcut_controls,
        validation_label=warning_label,
    )
    shortcut_enabled.toggled.connect(set_shortcut_enabled)

    tab_indentation = QCheckBox("Enable tab indentation", section)
    tab_indentation.setChecked(current_settings.get("anki_editor_tab_indentation", True))
    add_checkbox_row(
        layout,
        tab_indentation,
        "In Desktop editor fields, pressing Tab inserts four spaces instead of moving focus.",
    )
    return EditorFieldsSection(
        section,
        {
            "anki_editor_inline_code_shortcut_enabled": shortcut_enabled,
            "anki_editor_inline_code_shortcut": shortcut_input,
            "anki_editor_tab_indentation": tab_indentation,
        },
        shortcut_enabled,
        shortcut_input,
        reset_link,
        warning_label,
    )
