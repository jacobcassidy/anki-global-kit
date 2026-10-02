"""Settings tab for selecting and maintaining note type rows."""

from dataclasses import dataclass
from collections.abc import Callable

from aqt import mw
from aqt.qt import (
    QCheckBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    Qt,
    QTimer,
    QVBoxLayout,
    QWidget,
)
from aqt.utils import showWarning

from ...config import save_note_type_selections
from ....note_types import FORMATS, TOPICS, create_selected_note_types
from ...constants import (
    ADDON_PACKAGE_NAME,
    COLOR_GRAYSCALE_LIGHT_200,
    COLOR_GRAYSCALE_LIGHT_300,
    COLOR_GRAYSCALE_LIGHT_600,
    NOTE_TYPES_ROW_PADDING,
    ZERO_MARGINS,
)


@dataclass
class NoteTypesTab:
    widget: QWidget
    collect_selections: Callable[[], dict[str, dict[str, bool]]]


def build_note_types_tab(parent: QWidget) -> NoteTypesTab:
    note_types_tab = QWidget(parent)
    note_types_layout = QVBoxLayout(note_types_tab)
    note_types_layout.setSpacing(8)
    note_types_layout.addWidget(
        QLabel("Select your card topics and formats to use for your new note types:")
    )
    note_types_scroll = QScrollArea(note_types_tab)
    note_types_scroll.setWidgetResizable(True)
    note_types_scroll.setFrameShape(QFrame.Shape.NoFrame)
    note_types_scroll.viewport().setAutoFillBackground(False)
    note_types_options = QFrame(note_types_scroll)
    note_types_options.setFrameShape(QFrame.Shape.NoFrame)
    note_types_options.setObjectName("noteTypesTable")
    note_types_options.setStyleSheet(
        "QFrame#noteTypesTable { "
        f"background-color: {COLOR_GRAYSCALE_LIGHT_200}; "
        "border-radius: 6px; "
        "}"
    )
    note_types_grid = QGridLayout(note_types_options)
    note_types_grid.setVerticalSpacing(0)
    addon_config = mw.addonManager.getConfig(ADDON_PACKAGE_NAME) or {}
    saved_selections = addon_config.get("note_type_selections", {})
    if not isinstance(saved_selections, dict):
        saved_selections = {}
    custom_topics = [
        topic
        for topic in saved_selections
        if isinstance(topic, str) and topic not in TOPICS
    ]
    note_type_checks: dict[str, dict[str, QCheckBox]] = {}
    overwrite_checks: dict[str, dict[str, QCheckBox]] = {}
    delete_checks: dict[str, QCheckBox] = {}
    note_types_button = QPushButton("Update Selected Note Types", note_types_tab)
    note_types_button.setAutoDefault(False)

    def update_note_types_button_state(*_args) -> None:
        has_selection = any(
            checkbox.isChecked() and checkbox.isEnabled()
            for formats in note_type_checks.values()
            for checkbox in formats.values()
        ) or any(
            checkbox.isChecked() and checkbox.isEnabled()
            for formats in overwrite_checks.values()
            for checkbox in formats.values()
        ) or any(checkbox.isChecked() for checkbox in delete_checks.values())
        note_types_button.setEnabled(has_selection)

    def add_note_type_heading(label: str, column: int, alignment=None) -> None:
        heading = QLabel(label, note_types_options)
        heading_font = heading.font()
        heading_font.setBold(True)
        heading.setFont(heading_font)
        if alignment is None:
            note_types_grid.addWidget(heading, 0, column)
        else:
            note_types_grid.addWidget(heading, 0, column, alignment=alignment)

    def add_note_type_divider(column: int, row_span: int) -> None:
        divider = QFrame(note_types_options)
        divider.setFrameShape(QFrame.Shape.VLine)
        divider.setFrameShadow(QFrame.Shadow.Plain)
        divider.setLineWidth(1)
        divider.setSizePolicy(
            QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Expanding
        )
        divider.setStyleSheet(f"color: {COLOR_GRAYSCALE_LIGHT_600};")
        note_types_grid.addWidget(divider, 0, column, row_span, 1)

    def rebuild_note_types_grid() -> None:
        saved_checks = {
            topic: {name: checkbox.isChecked() for name, checkbox in formats.items()}
            for topic, formats in note_type_checks.items()
        }
        saved_overwrites = {
            topic: {name: checkbox.isChecked() for name, checkbox in formats.items()}
            for topic, formats in overwrite_checks.items()
        }
        for column in range(9):
            note_types_grid.setColumnMinimumWidth(column, 0)
        for index in range(note_types_grid.count() - 1, -1, -1):
            item = note_types_grid.takeAt(index)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()
        note_type_checks.clear()
        overwrite_checks.clear()
        delete_checks.clear()
        add_note_type_heading("Topic", 0)
        for format_index, card_format in enumerate(FORMATS):
            selected_column = 2 + format_index * 3
            overwrite_column = selected_column + 1
            add_note_type_heading(
                card_format, selected_column, Qt.AlignmentFlag.AlignHCenter
            )
            add_note_type_heading(
                "Overwrite", overwrite_column, Qt.AlignmentFlag.AlignHCenter
            )
        if custom_topics:
            add_note_type_heading("Delete", 8, Qt.AlignmentFlag.AlignHCenter)

        existing_names = (
            {item.name for item in mw.col.models.all_names_and_ids()}
            if mw.col is not None
            else set()
        )
        for row, topic in enumerate((*TOPICS, *custom_topics), start=1):
            row_background = QWidget(note_types_options)
            row_background.setSizePolicy(
                QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred
            )
            row_background_color = (
                COLOR_GRAYSCALE_LIGHT_300
                if row % 2 == 0
                else COLOR_GRAYSCALE_LIGHT_200
            )
            row_background.setStyleSheet(
                f"background-color: {row_background_color};"
            )
            row_background.setContentsMargins(*ZERO_MARGINS)
            row_background.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
            note_types_grid.addWidget(
                row_background, row, 0, 1, 9 if custom_topics else 7
            )
            row_background.lower()

            topic_row = QWidget(note_types_options)
            topic_row_layout = QHBoxLayout(topic_row)
            topic_row_layout.setContentsMargins(
                NOTE_TYPES_ROW_PADDING,
                NOTE_TYPES_ROW_PADDING,
                NOTE_TYPES_ROW_PADDING,
                NOTE_TYPES_ROW_PADDING,
            )
            topic_row_layout.setSpacing(4)
            topic_label = QLabel(topic, topic_row)
            topic_row_layout.addWidget(topic_label, 1)
            note_types_grid.addWidget(topic_row, row, 0)
            note_type_checks[topic] = {}
            overwrite_checks[topic] = {}
            saved_topic_checks = saved_checks.get(
                topic, saved_selections.get(topic, {})
            )
            saved_topic_overwrites = saved_overwrites.get(topic, {})
            for format_index, card_format in enumerate(FORMATS):
                selected_column = 2 + format_index * 3
                overwrite_column = selected_column + 1
                type_name = f"{topic} ({card_format})"
                checkbox = QCheckBox(note_types_options)
                checkbox.setContentsMargins(
                    NOTE_TYPES_ROW_PADDING,
                    NOTE_TYPES_ROW_PADDING,
                    NOTE_TYPES_ROW_PADDING,
                    NOTE_TYPES_ROW_PADDING,
                )
                exists = type_name in existing_names
                checkbox.setChecked(
                    exists or saved_topic_checks.get(card_format, False)
                )
                checkbox.setEnabled(not exists)
                checkbox.toggled.connect(update_note_types_button_state)
                note_types_grid.addWidget(
                    checkbox,
                    row,
                    selected_column,
                    alignment=Qt.AlignmentFlag.AlignCenter,
                )
                note_type_checks[topic][card_format] = checkbox

                overwrite_checkbox = QCheckBox(note_types_options)
                overwrite_checkbox.setContentsMargins(
                    NOTE_TYPES_ROW_PADDING,
                    NOTE_TYPES_ROW_PADDING,
                    NOTE_TYPES_ROW_PADDING,
                    NOTE_TYPES_ROW_PADDING,
                )
                overwrite_checkbox.setChecked(
                    saved_topic_overwrites.get(card_format, False)
                )
                overwrite_checkbox.setEnabled(exists)
                overwrite_checkbox.setToolTip(
                    "Overwrite this existing note type"
                    if exists
                    else "Available after this note type has been created"
                )
                overwrite_checkbox.toggled.connect(update_note_types_button_state)
                note_types_grid.addWidget(
                    overwrite_checkbox,
                    row,
                    overwrite_column,
                    alignment=Qt.AlignmentFlag.AlignCenter,
                )
                overwrite_checks[topic][card_format] = overwrite_checkbox
            if topic in custom_topics:
                add_custom_topic_delete_checkbox(row, topic)
        row_span = len(TOPICS) + len(custom_topics) + 1
        for column in (1, 4, *([7] if custom_topics else [])):
            add_note_type_divider(column, row_span)
        note_types_grid.activate()
        table_height = note_types_grid.sizeHint().height()
        if note_types_scroll.widget() is not None:
            note_types_scroll.setMaximumHeight(table_height)
            note_types_options.updateGeometry()
        update_note_types_button_state()

    def add_custom_topic_delete_checkbox(row: int, topic: str) -> None:
        delete_checkbox = QCheckBox(note_types_options)
        delete_checkbox.setContentsMargins(
            NOTE_TYPES_ROW_PADDING,
            NOTE_TYPES_ROW_PADDING,
            NOTE_TYPES_ROW_PADDING,
            NOTE_TYPES_ROW_PADDING,
        )
        delete_checkbox.setToolTip(
            "Remove this custom topic row from settings when Update is clicked. "
            "Existing note types are unchanged."
        )
        delete_checkbox.toggled.connect(update_note_types_button_state)
        note_types_grid.addWidget(
            delete_checkbox,
            row,
            8,
            alignment=Qt.AlignmentFlag.AlignCenter,
        )
        delete_checks[topic] = delete_checkbox

    def persist_note_type_selections() -> None:
        selections = {
            topic: {
                card_format: checkbox.isChecked()
                for card_format, checkbox in formats.items()
            }
            for topic, formats in note_type_checks.items()
        }
        save_note_type_selections(selections)

    def add_custom_topic() -> None:
        topic, accepted = QInputDialog.getText(
            parent, "Add Topic", "Topic name:"
        )
        topic = topic.strip()
        if not accepted:
            return
        if not topic:
            showWarning("Enter a topic name before adding it.")
            return
        if any(
            existing.casefold() == topic.casefold()
            for existing in (*TOPICS, *custom_topics)
        ):
            showWarning("A topic with that name already exists.")
            return
        custom_topics.append(topic)
        saved_selections[topic] = {card_format: False for card_format in FORMATS}
        rebuild_note_types_grid()
        QTimer.singleShot(0, update_note_types_table_height)
        persist_note_type_selections()

    def remove_custom_topic(topic: str) -> None:
        if topic not in custom_topics:
            return
        custom_topics.remove(topic)
        saved_selections.pop(topic, None)
        rebuild_note_types_grid()
        QTimer.singleShot(0, update_note_types_table_height)
        persist_note_type_selections()

    def update_note_types_table_height() -> None:
        note_types_grid.activate()
        note_types_scroll.setMaximumHeight(note_types_grid.sizeHint().height())
        note_types_options.updateGeometry()
        note_types_scroll.updateGeometry()


    rebuild_note_types_grid()
    note_types_scroll.setWidget(note_types_options)
    note_types_scroll.setMaximumHeight(note_types_grid.sizeHint().height())
    note_types_layout.addWidget(note_types_scroll, 1)

    def create_note_types_from_panel(checked=False) -> None:
        topics_to_remove = {
            topic for topic, checkbox in delete_checks.items() if checkbox.isChecked()
        }
        selections = {
            topic: {
                card_format
                for card_format, checkbox in formats.items()
                if checkbox.isChecked()
                and (
                    checkbox.isEnabled()
                    or overwrite_checks[topic][card_format].isChecked()
                )
            }
            for topic, formats in note_type_checks.items()
            if topic not in topics_to_remove
        }
        overwrites = {
            topic: {
                card_format
                for card_format, checkbox in formats.items()
                if checkbox.isChecked()
            }
            for topic, formats in overwrite_checks.items()
            if topic not in topics_to_remove
        }
        has_note_type_changes = any(selections.values())
        if has_note_type_changes and not create_selected_note_types(
            selections, overwrites
        ):
            return
        if mw.col is not None:
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
        for topic in list(topics_to_remove):
            remove_custom_topic(topic)

    note_types_button.clicked.connect(create_note_types_from_panel)
    add_button = QPushButton("+", note_types_tab)
    add_button.setAutoDefault(False)
    add_button.setFixedWidth(32)
    add_button.setToolTip("Add a custom topic row")
    add_button.clicked.connect(add_custom_topic)
    note_types_controls = QWidget(note_types_tab)
    note_types_controls_layout = QHBoxLayout(note_types_controls)
    note_types_controls_layout.setContentsMargins(*ZERO_MARGINS)
    note_types_controls_layout.addWidget(add_button)
    note_types_controls_layout.addStretch()
    note_types_controls_layout.addWidget(note_types_button)
    note_types_layout.addWidget(note_types_controls)

    def collect_selections() -> dict[str, dict[str, bool]]:
        return {
            topic: {
                card_format: checkbox.isChecked()
                for card_format, checkbox in formats.items()
            }
            for topic, formats in note_type_checks.items()
        }

    return NoteTypesTab(note_types_tab, collect_selections)
