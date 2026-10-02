"""Settings section for answer rendering and syntax highlighting."""

from aqt.qt import QCheckBox, QGroupBox, QVBoxLayout, QWidget

from ...widgets import add_checkbox_row


def build_card_reviews_section(parent: QWidget, current_settings: dict):
    section = QGroupBox("Card Reviews", parent)
    layout = QVBoxLayout(section)
    markdown = QCheckBox("Enable Markdown rendering", section)
    markdown.setChecked(current_settings["card_review_markdown_rendering"])
    add_checkbox_row(
        layout,
        markdown,
        "Render Markdown in submitted answers, including formatting such as headings, lists, links, and code blocks.",
    )
    highlighting = QCheckBox("Enable code block syntax highlighting", section)
    highlighting.setChecked(current_settings["card_review_syntax_highlighting"])
    add_checkbox_row(
        layout,
        highlighting,
        "Apply language-aware colors to code blocks in rendered answers. A language after the opening backticks takes precedence; otherwise, the card topic is used when possible.",
    )
    return section, {
        "card_review_markdown_rendering": markdown,
        "card_review_syntax_highlighting": highlighting,
    }
