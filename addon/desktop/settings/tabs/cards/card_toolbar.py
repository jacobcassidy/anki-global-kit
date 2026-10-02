"""Settings section for the card-side formatting toolbar."""

from aqt.qt import QCheckBox, QGroupBox, QVBoxLayout, QWidget

from ...constants import NESTED_INDENT
from ...widgets import add_checkbox_row


BUTTON_SETTINGS = (
    ("card_toolbar_bold", "Show bold button"),
    ("card_toolbar_italic", "Show italic button"),
    ("card_toolbar_strikethrough", "Show strikethrough button"),
    ("card_toolbar_code_block", "Show code block button"),
    ("card_toolbar_inline_code", "Show inline code button"),
    ("card_toolbar_unordered_list", "Show unordered list button"),
    ("card_toolbar_ordered_list", "Show ordered list button"),
    ("card_toolbar_blockquote", "Show blockquote button"),
)


def build_card_toolbar_section(parent: QWidget, current_settings: dict):
    section = QGroupBox("Card Toolbar", parent)
    layout = QVBoxLayout(section)
    enabled = QCheckBox("Show formatting toolbar", section)
    enabled.setChecked(current_settings["card_toolbar_enabled"])
    add_checkbox_row(
        layout,
        enabled,
        "Show a toolbar below each question field with buttons for common Markdown formatting, including lists, quotes, and code.",
    )
    button_container = QWidget(section)
    button_layout = QVBoxLayout(button_container)
    button_layout.setContentsMargins(NESTED_INDENT, 0, 0, 0)
    buttons = {}
    for key, label in BUTTON_SETTINGS:
        checkbox = QCheckBox(label, button_container)
        checkbox.setChecked(current_settings[key])
        checkbox.setEnabled(enabled.isChecked())
        add_checkbox_row(button_layout, checkbox)
        buttons[key] = checkbox
    layout.addWidget(button_container)

    def set_buttons_enabled(value: bool) -> None:
        for checkbox in buttons.values():
            checkbox.setEnabled(value)

    enabled.toggled.connect(set_buttons_enabled)
    return section, {"card_toolbar_enabled": enabled, **buttons}
