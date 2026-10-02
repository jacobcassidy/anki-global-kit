"""Settings section for the Anki editor toolbar."""

from aqt.qt import QCheckBox, QGroupBox, QVBoxLayout, QWidget

from ...widgets import add_checkbox_row


def build_editor_toolbar_section(parent: QWidget, current_settings: dict):
    section = QGroupBox("Editor Toolbar", parent)
    layout = QVBoxLayout(section)
    inline_code_button = QCheckBox("Show inline code button", section)
    inline_code_button.setChecked(current_settings["anki_editor_inline_code_button"])
    add_checkbox_row(
        layout,
        inline_code_button,
        "Add an inline code button to the Desktop editor toolbar for formatting selected text or starting an inline code span.",
    )
    return section, {"anki_editor_inline_code_button": inline_code_button}
