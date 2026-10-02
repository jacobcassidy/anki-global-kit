"""Card settings tab and its feature sections."""

from dataclasses import dataclass

from aqt.qt import QVBoxLayout, QWidget

from ...constants import SECTION_SPACING
from ...widgets import make_scroll_area
from .card_fields import (
    SHORTCUT_DEFINITIONS,
    CardFieldsSection,
    build_card_fields_section,
)
from .card_reviews import build_card_reviews_section
from .card_toolbar import build_card_toolbar_section


@dataclass
class CardsTab:
    widget: QWidget
    controls: dict
    fields: CardFieldsSection


def build_cards_tab(parent: QWidget, current_settings: dict) -> CardsTab:
    content = QWidget(parent)
    layout = QVBoxLayout(content)
    layout.setSpacing(SECTION_SPACING)

    fields = build_card_fields_section(content, current_settings)
    reviews, review_controls = build_card_reviews_section(content, current_settings)
    toolbar, toolbar_controls = build_card_toolbar_section(content, current_settings)
    layout.addWidget(fields.widget)
    layout.addWidget(reviews)
    layout.addWidget(toolbar)
    layout.addStretch()

    controls = {
        **fields.controls,
        **review_controls,
        **toolbar_controls,
    }
    return CardsTab(make_scroll_area(parent, content), controls, fields)
