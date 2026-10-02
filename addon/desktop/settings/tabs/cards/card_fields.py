"""Settings section for question fields and Markdown shortcuts."""

from dataclasses import dataclass

from aqt.qt import QCheckBox, QGroupBox, QHBoxLayout, QLabel, QVBoxLayout, QWidget

from ...constants import (
    COLOR_CONFLICT_700,
    COLOR_GRAYSCALE_DARK_200,
    COLOR_GRAYSCALE_DARK_900,
    COLOR_WARNING_700,
    DEFAULT_SETTINGS,
    NESTED_INDENT,
    ZERO_MARGINS,
)
from ...widgets import CardShortcutInput, add_checkbox_row, make_reset_link


SHORTCUT_DEFINITIONS = (
    ("card_input_markdown_bold_shortcut", "bold"),
    ("card_input_markdown_italic_shortcut", "italic"),
    ("card_input_markdown_strikethrough_shortcut", "strikethrough"),
    ("card_input_markdown_inline_code_shortcut", "inline code"),
    ("card_input_markdown_code_block_shortcut", "code block"),
    ("card_input_markdown_unordered_list_shortcut", "unordered list"),
    ("card_input_markdown_ordered_list_shortcut", "ordered list"),
    ("card_input_markdown_blockquote_shortcut", "blockquote"),
)


@dataclass
class CardFieldsSection:
    widget: QGroupBox
    controls: dict[str, QWidget]
    master_toggle: QCheckBox
    shortcut_inputs: dict[str, CardShortcutInput]
    shortcut_enabled: dict[str, QCheckBox]
    shortcut_option_checkboxes: dict[str, QCheckBox]
    reset_links: dict[str, QWidget]
    warning_labels: dict[str, QLabel]


def style_shortcut_option(checkbox: QCheckBox, *, inactive: bool) -> None:
    if inactive:
        color = COLOR_GRAYSCALE_DARK_200
    elif getattr(checkbox, "shortcut_conflict", False):
        color = COLOR_CONFLICT_700
    else:
        color = COLOR_GRAYSCALE_DARK_900
    checkbox.setStyleSheet(f"QCheckBox {{ color: {color}; }}")


def build_card_fields_section(parent: QWidget, current_settings: dict) -> CardFieldsSection:
    section = QGroupBox("Card Fields", parent)
    layout = QVBoxLayout(section)
    master_toggle = QCheckBox("Enable Markdown shortcuts", section)
    master_toggle.setChecked(current_settings["card_input_markdown_shortcuts"])
    add_checkbox_row(
        layout,
        master_toggle,
        "Use keyboard shortcuts to apply Markdown formatting in question fields.",
    )

    shortcut_rows = QWidget(section)
    shortcut_rows_layout = QVBoxLayout(shortcut_rows)
    shortcut_rows_layout.setContentsMargins(NESTED_INDENT, 0, 0, 0)
    shortcut_inputs = {}
    shortcut_enabled = {}
    reset_links = {}
    warning_labels = {}

    for key, label in SHORTCUT_DEFINITIONS:
        row_container = QWidget(shortcut_rows)
        row_container_layout = QVBoxLayout(row_container)
        row_container_layout.setContentsMargins(*ZERO_MARGINS)
        row_container_layout.setSpacing(0)
        row_widget = QWidget(row_container)
        row = QHBoxLayout(row_widget)
        row.setContentsMargins(*ZERO_MARGINS)
        enabled_key = f"{key}_enabled"
        checkbox = QCheckBox(f"Enable {label} shortcut", row_widget)
        checkbox.shortcut_conflict = False
        style_shortcut_option(checkbox, inactive=not master_toggle.isChecked())
        checkbox.setChecked(
            current_settings.get(enabled_key, DEFAULT_SETTINGS[enabled_key])
        )
        row.addWidget(checkbox)
        row.addStretch()

        shortcut_input = CardShortcutInput(
            current_settings.get(key, DEFAULT_SETTINGS[key]), row_widget
        )
        reset_link = make_reset_link(row_widget, shortcut_input, DEFAULT_SETTINGS[key])
        row.addWidget(reset_link)
        row.addWidget(shortcut_input)

        def set_row_enabled(
            enabled: bool,
            shortcut=shortcut_input,
            reset=reset_link,
            default=DEFAULT_SETTINGS[key],
        ) -> None:
            active = enabled and master_toggle.isChecked()
            shortcut.setEnabled(active)
            shortcut.set_text_dimmed(not active)
            reset.setEnabled(active and shortcut.stored_shortcut() != default)

        set_row_enabled(checkbox.isChecked())
        checkbox.toggled.connect(set_row_enabled)
        warning_label = QLabel(row_container)
        warning_label.setWordWrap(True)
        warning_label.setStyleSheet(f"color: {COLOR_WARNING_700};")
        warning_label.hide()
        shortcut_input.set_validation_label(warning_label)
        row_container_layout.addWidget(row_widget)
        row_container_layout.addWidget(warning_label)
        shortcut_rows_layout.addWidget(row_container)
        shortcut_inputs[key] = shortcut_input
        shortcut_enabled[enabled_key] = checkbox
        reset_links[key] = reset_link
        warning_labels[key] = warning_label

    layout.addWidget(shortcut_rows)

    def set_shortcut_rows_enabled(enabled: bool) -> None:
        shortcut_rows.setEnabled(enabled)
        for key, shortcut_input in shortcut_inputs.items():
            active = enabled and shortcut_enabled[f"{key}_enabled"].isChecked()
            shortcut_input.setEnabled(active)
            shortcut_input.set_text_dimmed(not active)
            style_shortcut_option(
                shortcut_enabled[f"{key}_enabled"], inactive=not enabled
            )
            reset_links[key].setEnabled(
                active and shortcut_input.stored_shortcut() != DEFAULT_SETTINGS[key]
            )

    master_toggle.toggled.connect(set_shortcut_rows_enabled)
    set_shortcut_rows_enabled(master_toggle.isChecked())

    tab_indentation = QCheckBox("Enable tab indentation", section)
    tab_indentation.setChecked(current_settings["card_input_tab_indentation"])
    add_checkbox_row(
        layout,
        tab_indentation,
        "Press Tab in a question field to insert indentation: four spaces for Python topics and two spaces for other topics. Shift+Tab moves to the next field.",
    )
    controls: dict[str, QWidget] = {
        "card_input_markdown_shortcuts": master_toggle,
        "card_input_tab_indentation": tab_indentation,
        **shortcut_inputs,
        **shortcut_enabled,
    }
    return CardFieldsSection(
        section,
        controls,
        master_toggle,
        shortcut_inputs,
        shortcut_enabled,
        {key: shortcut_enabled[f"{key}_enabled"] for key, _ in SHORTCUT_DEFINITIONS},
        reset_links,
        warning_labels,
    )
