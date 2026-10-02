"""Anki Global Kit Desktop installer for synced card resources."""

import json
from pathlib import Path

from aqt import gui_hooks, mw
from aqt.qt import (
    QAction,
    QApplication,
    QCheckBox,
    QDesktopServices,
    QDialog,
    QDialogButtonBox,
    QEvent,
    QFrame,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QIcon,
    QLabel,
    QKeySequence,
    QPoint,
    QPushButton,
    QScrollArea,
    Qt,
    QTabWidget,
    QTextCursor,
    QTextBrowser,
    QTimer,
    QUrl,
    QVBoxLayout,
    QWidget,
)
from aqt.utils import is_mac, showWarning

from .note_types import FORMATS, TOPICS, create_selected_note_types


ADDON_DIR = Path(__file__).resolve().parent.parent
SHARED_ASSET_DIR = Path(__file__).resolve().parent / "shared" / "assets"
ADDON_PACKAGE_NAME = __package__.split(".", maxsplit=1)[0]
ASSET_DIR = ADDON_DIR / "web"
JS_ASSET_NAME = "_anki-global-kit.min.js"
ASSET_NAMES = (JS_ASSET_NAME, "_anki-global-kit.min.css")
VERSION = "1.0.0"
SECTION_SPACING = 24
NESTED_INDENT = 20
SHORTCUT_MIN_WIDTH = 80
ZERO_MARGINS = (0, 0, 0, 0)
COLOR_GRAYSCALE_000 = "#ffffff"
COLOR_GRAYSCALE_100 = "#fbfbfb"
COLOR_GRAYSCALE_200 = "#f7f7f7"
COLOR_GRAYSCALE_300 = "#f5f5f5"
COLOR_GRAYSCALE_400 = "#e9e9e9"
COLOR_GRAYSCALE_500 = "#999999"
COLOR_GRAYSCALE_600 = "#888888"
COLOR_GRAYSCALE_700 = "#555555"
COLOR_GRAYSCALE_800 = "#333333"
COLOR_GRAYSCALE_900 = "#000000"
COLOR_BLUE_100 = "#0088ff"
COLOR_BLUE_200 = "#0077ff"
COLOR_BLUE_300 = "#0066cc"
COLOR_BLUE_700 = "#064f8c"
COLOR_WARNING_700 = "#b54708"
COLOR_CONFLICT_700 = "#d97706"
COLOR_TRANSPARENT = "transparent"
SHORTCUT_MODIFIER_HINT = (
    "Command, Control, or Option" if is_mac else "Ctrl, Alt, or Meta"
)
DEFAULT_SETTINGS = {
    "card_input_markdown_shortcuts": True,
    "card_input_markdown_bold_shortcut": "Ctrl+B",
    "card_input_markdown_bold_shortcut_enabled": True,
    "card_input_markdown_italic_shortcut": "Ctrl+I",
    "card_input_markdown_italic_shortcut_enabled": True,
    "card_input_markdown_strikethrough_shortcut": "Ctrl+Shift+X",
    "card_input_markdown_strikethrough_shortcut_enabled": True,
    "card_input_markdown_inline_code_shortcut": "Ctrl+Shift+C",
    "card_input_markdown_inline_code_shortcut_enabled": True,
    "card_input_markdown_code_block_shortcut": "CodeBlock+C",
    "card_input_markdown_code_block_shortcut_enabled": True,
    "card_input_markdown_unordered_list_shortcut": "Ctrl+,",
    "card_input_markdown_unordered_list_shortcut_enabled": True,
    "card_input_markdown_ordered_list_shortcut": "Ctrl+.",
    "card_input_markdown_ordered_list_shortcut_enabled": True,
    "card_input_markdown_blockquote_shortcut": "",
    "card_input_markdown_blockquote_shortcut_enabled": False,
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
    "anki_editor_inline_code_shortcut_enabled": True,
    "anki_editor_inline_code_shortcut": "Ctrl+Shift+C",
    "anki_editor_tab_indentation": True,
    "anki_editor_inline_code_button": True,
    "anki_editor_normalize_code_spaces": True,
    "anki_editor_copy_source_html": True,
    "anki_editor_paste_cleanup": True,
}


def migrate_legacy_card_shortcut(shortcut: str) -> str:
    """Translate saved card shortcut names to Qt's Ctrl/Meta names."""
    if not shortcut or shortcut.startswith("CodeBlock+"):
        return shortcut
    aliases = {"Primary": "Ctrl"}
    aliases["Control"] = "Meta" if is_mac else "Ctrl"
    aliases["Meta"] = "Ctrl" if is_mac else "Meta"
    return "+".join(aliases.get(part, part) for part in shortcut.split("+"))


def format_shortcut(shortcut: str) -> str:
    """Format Qt Ctrl/Meta shortcut names for the current platform."""
    if not shortcut:
        return ""
    if shortcut.startswith("CodeBlock+"):
        return ("⌃⌘" if is_mac else "Ctrl+Alt+") + shortcut.split("+", 1)[1]
    parts = shortcut.split("+")
    if is_mac:
        symbols = {
            "Ctrl": "⌘",
            "Meta": "⌃",
            "Alt": "⌥",
            "Shift": "⇧",
        }
        return "".join(symbols.get(part, part) for part in parts)
    return "+".join(parts)


def normalize_shortcut(shortcut: str) -> str:
    """Return a comparable shortcut string across platform-specific labels."""
    if not shortcut:
        return ""
    parts = shortcut.split("+")
    key = parts.pop().upper()
    if shortcut.startswith("CodeBlock+"):
        modifiers = {"Ctrl", "Meta"} if is_mac else {"Ctrl", "Alt"}
    else:
        modifiers = set(parts)
    order = ("Ctrl", "Meta", "Alt", "Shift")
    return "+".join([*(part for part in order if part in modifiers), key])


def shortcut_has_required_modifier(shortcut: str) -> bool:
    modifiers = set(normalize_shortcut(shortcut).split("+")[:-1])
    return bool(modifiers & {"Ctrl", "Alt", "Meta"})


def anki_shortcut_warnings() -> dict[str, str]:
    """Known built-in shortcuts worth warning users about if they overlap."""
    return {
        normalize_shortcut(shortcut): description
        for shortcut, description in (
            ("Ctrl+Enter", "Add a note"),
            ("Ctrl+Shift+;", "Open the Debug Console"),
            ("Ctrl+Alt+T", "Switch Browser between Cards and Notes"),
            *(
                (f"Ctrl+{number}", f"Flag a card with {number}")
                for number in range(1, 8)
            ),
        )
    }


def anki_editor_format_shortcut_warnings() -> dict[str, str]:
    """Built-in Anki editor formatting and list shortcuts."""
    return {
        normalize_shortcut(shortcut): description
        for shortcut, description in (
            ("Ctrl+B", "Bold"),
            ("Ctrl+I", "Italic"),
            ("Ctrl+U", "Underline"),
            ("Ctrl+Shift+X", "Strikethrough"),
            ("Ctrl+=", "Subscript"),
            ("Ctrl+Shift+=", "Superscript"),
            ("Ctrl+,", "Unordered list"),
            ("Ctrl+.", "Ordered list"),
            ("Ctrl+Shift+,", "Outdent list item"),
            ("Ctrl+Shift+.", "Indent list item"),
        )
    }


def reserved_shortcut_warnings() -> dict[str, str]:
    """Shortcuts reserved for common text editing actions."""
    return {
        normalize_shortcut(shortcut): description
        for shortcut, description in (
            ("Ctrl+C", "Copy"),
            ("Ctrl+V", "Paste"),
            ("Ctrl+X", "Cut"),
            ("Ctrl+A", "Select All"),
            ("Ctrl+Z", "Undo"),
            ("Ctrl+Y", "Redo"),
            ("Ctrl+Shift+Z", "Redo"),
            ("Ctrl+Insert", "Copy"),
            ("Shift+Insert", "Paste"),
            ("Shift+Delete", "Cut"),
        )
    }


class CardShortcutInput(QPushButton):
    """Show a clickable shortcut label and capture keys until clicked outside."""

    _change_sequence = 0

    def __init__(
        self,
        shortcut: str,
        parent: QWidget,
        *,
        default_shortcut: str | None = None,
    ) -> None:
        super().__init__(format_shortcut(shortcut) or "none", parent)
        self._default_shortcut = default_shortcut
        self._capturing = False
        self._change_listeners = []
        self._change_order = 0
        self._shortcut_state = "custom"
        self._text_dimmed = False
        self._shortcut_validator = None
        self.setCheckable(True)
        self.setFlat(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumWidth(SHORTCUT_MIN_WIDTH)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setToolTip("Click to record a shortcut. Click outside to finish.")
        self._base_style_sheet = (
            f"QPushButton {{ text-align: right; padding: 0 4px; "
            f"border: 1px solid {COLOR_TRANSPARENT}; "
            f"background: {COLOR_GRAYSCALE_300}; }}"
            f"QPushButton:hover {{ background: {COLOR_GRAYSCALE_100}; }}"
            f"QPushButton:checked {{ "
            f"background: {COLOR_GRAYSCALE_000}; "
            f"border: 1px solid {COLOR_TRANSPARENT}; }}"
            f"QPushButton:pressed, QPushButton:checked:pressed "
            f"{{ background: {COLOR_GRAYSCALE_100}; "
            f"border: 1px solid {COLOR_TRANSPARENT}; }}"
            f"QPushButton:disabled {{ background: {COLOR_GRAYSCALE_200}; }}"
        )
        self._apply_text_style()
        self._update_shortcut_appearance()
        self.toggled.connect(self._apply_text_style)
        self.clicked.connect(self._start_capture)
        application = QApplication.instance()
        if application:
            application.installEventFilter(self)

    def _start_capture(self) -> None:
        self._capturing = self.isChecked()
        if self._capturing:
            self.setFocus()

    def set_shortcut(self, shortcut: str) -> None:
        self.setText(format_shortcut(shortcut) or "none")
        self._mark_changed()
        self._notify_change_listeners()

    def _mark_changed(self) -> None:
        type(self)._change_sequence += 1
        self._change_order = type(self)._change_sequence

    def change_order(self) -> int:
        return self._change_order

    def set_text_dimmed(self, dimmed: bool) -> None:
        self._text_dimmed = dimmed
        self._apply_text_style()

    def _apply_text_style(self, *_args) -> None:
        if not hasattr(self, "_base_style_sheet"):
            return
        if self._text_dimmed or not self.isEnabled():
            color = COLOR_GRAYSCALE_500
        elif self.isChecked():
            color = COLOR_BLUE_700
        else:
            color = {
                "default": COLOR_GRAYSCALE_700,
                "none": COLOR_GRAYSCALE_600,
            }.get(self._shortcut_state, COLOR_GRAYSCALE_900)
        self.setStyleSheet(
            f"{self._base_style_sheet} QPushButton {{ color: {color}; }}"
        )

    def changeEvent(self, event) -> None:
        super().changeEvent(event)
        if event.type() == QEvent.Type.EnabledChange:
            self._apply_text_style()

    def add_change_listener(self, callback) -> None:
        self._change_listeners.append(callback)
        callback()

    def _notify_change_listeners(self) -> None:
        self._update_shortcut_appearance()
        for callback in self._change_listeners:
            callback()

    def _update_shortcut_appearance(self) -> None:
        if self._default_shortcut is None:
            return
        shortcut = self.stored_shortcut()
        if not shortcut and not self._default_shortcut:
            state = "none"
        elif shortcut == self._default_shortcut:
            state = "default"
        else:
            state = "custom"
        self._shortcut_state = state
        self._apply_text_style()

    def eventFilter(self, watched, event) -> bool:
        if self._capturing and event.type() == QEvent.Type.MouseButtonPress:
            if watched is not self and not (
                isinstance(watched, QWidget) and self.isAncestorOf(watched)
            ):
                self._capturing = False
                self.setChecked(False)
        return super().eventFilter(watched, event)

    def keyPressEvent(self, event) -> None:
        if not self._capturing:
            super().keyPressEvent(event)
            return
        if event.key() in (Qt.Key.Key_Backspace, Qt.Key.Key_Delete):
            self.setText("none")
            self._set_validation_message("")
            self._notify_change_listeners()
            event.accept()
            return

        modifier_keys = {
            Qt.Key.Key_Control,
            Qt.Key.Key_Alt,
            Qt.Key.Key_Shift,
            Qt.Key.Key_Meta,
        }
        if event.key() in modifier_keys:
            event.accept()
            return

        required_modifiers = (
            Qt.KeyboardModifier.ControlModifier
            | Qt.KeyboardModifier.AltModifier
            | Qt.KeyboardModifier.MetaModifier
        )
        if not event.modifiers() & required_modifiers:
            self._set_validation_message(
                f"Shortcuts must include {SHORTCUT_MODIFIER_HINT}. "
                "Shift by itself does not count as a modifier."
            )
            event.accept()
            return

        modifiers = event.modifiers()
        parts = []
        # Store Qt's modifier names on every platform: Ctrl is Command on macOS,
        # while Meta is physical Control there.
        modifier_names = (
            (
                (Qt.KeyboardModifier.ControlModifier, "Ctrl"),
                (Qt.KeyboardModifier.AltModifier, "Alt"),
                (Qt.KeyboardModifier.ShiftModifier, "Shift"),
                (Qt.KeyboardModifier.MetaModifier, "Meta"),
            )
            if is_mac
            else (
                (Qt.KeyboardModifier.ControlModifier, "Ctrl"),
                (Qt.KeyboardModifier.AltModifier, "Alt"),
                (Qt.KeyboardModifier.ShiftModifier, "Shift"),
                (Qt.KeyboardModifier.MetaModifier, "Meta"),
            )
        )
        for modifier, name in modifier_names:
            if modifiers & modifier:
                parts.append(name)

        key_name = (
            QKeySequence(event.key()).toString(QKeySequence.SequenceFormat.PortableText)
            or event.text().upper()
        )
        if key_name and key_name not in parts:
            parts.append(key_name)

        text = "+".join(parts)
        reserved_action = reserved_shortcut_warnings().get(
            normalize_shortcut(text)
        )
        if reserved_action:
            self._set_validation_message(
                f"{format_shortcut(text)} "
                f"is reserved for {reserved_action}. "
                "Choose another shortcut."
            )
            event.accept()
            return
        if self._shortcut_validator is not None:
            message = self._shortcut_validator(text)
            if message:
                self._set_validation_message(message)
                event.accept()
                return
        if is_mac:
            symbols = {"Ctrl": "⌘", "Alt": "⌥", "Shift": "⇧", "Meta": "⌃"}
            text = "".join(symbols.get(part, part) for part in parts)
        self.setText(text)
        self._mark_changed()
        self._set_validation_message("")
        self._notify_change_listeners()
        event.accept()

    def set_validation_label(self, label: QLabel) -> None:
        self._validation_label = label

    def set_shortcut_validator(self, validator) -> None:
        self._shortcut_validator = validator

    def _set_validation_message(self, message: str) -> None:
        label = getattr(self, "_validation_label", None)
        if label is not None:
            label.setText(message)
            label.setVisible(bool(message))

    def stored_shortcut(self) -> str:
        text = self.text().strip()
        if not text or text.lower() == "none":
            return ""
        if is_mac:
            symbols = {"⌃": "Meta", "⌥": "Alt", "⇧": "Shift", "⌘": "Ctrl"}
            modifiers = []
            while text and text[0] in symbols:
                modifiers.append(symbols[text[0]])
                text = text[1:]
        else:
            pieces = text.split("+")
            text = pieces.pop() if pieces else ""
            modifiers = [
                {"Shift": "Shift", "Alt": "Alt"}.get(part, part)
                for part in pieces
            ]
        key = text.upper()
        modifier_set = set(modifiers)
        if (is_mac and modifier_set == {"Ctrl", "Meta"}) or (
            not is_mac and modifier_set == {"Ctrl", "Alt"}
        ):
            if key == "C":
                return "CodeBlock+C"
        order = ("Ctrl", "Alt", "Shift", "Meta")
        return "+".join([*(part for part in order if part in modifier_set), key])


class ResetShortcutLink(QLabel):
    """A small text link that resets one shortcut and disables at its default."""

    def __init__(
        self, parent: QWidget, shortcut_input: CardShortcutInput, default_shortcut: str
    ) -> None:
        super().__init__("RESET", parent)
        self.shortcut_input = shortcut_input
        self.default_shortcut = default_shortcut
        font = self.font()
        font.setPointSizeF(max(6.0, font.pointSizeF() - 4.0))
        self.setFont(font)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setStyleSheet(
            f"QLabel {{ color: {COLOR_BLUE_300}; text-decoration: none; }}"
            f"QLabel:hover {{ color: {COLOR_BLUE_100}; text-decoration: none; }}"
            f'QLabel[pressed="true"] '
            f"{{ color: {COLOR_BLUE_200}; text-decoration: none; }}"
            f"QLabel:disabled {{ color: {COLOR_GRAYSCALE_500}; }}"
        )
        self.setProperty("pressed", False)
        self.shortcut_input.add_change_listener(self._update_state)
        self._update_state()

    def _update_state(self) -> None:
        is_default = self.shortcut_input.stored_shortcut() == self.default_shortcut
        self.setEnabled(not is_default)
        self.setVisible(not is_default)
        self.setCursor(
            Qt.CursorShape.ArrowCursor
            if is_default
            else Qt.CursorShape.PointingHandCursor
        )
        self.setToolTip(
            "This shortcut already uses its default."
            if is_default
            else "Reset this shortcut to its default."
        )

    def _set_pressed(self, pressed: bool) -> None:
        self.setProperty("pressed", pressed)
        self.style().unpolish(self)
        self.style().polish(self)

    def _reset(self) -> None:
        if self.isEnabled():
            self.shortcut_input.set_shortcut(self.default_shortcut)

    def mousePressEvent(self, event) -> None:
        if self.isEnabled() and event.button() == Qt.MouseButton.LeftButton:
            self._set_pressed(True)
            event.accept()
            return
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            was_pressed = self.property("pressed")
            self._set_pressed(False)
            if was_pressed and self.rect().contains(event.position().toPoint()):
                self._reset()
                event.accept()
                return
        super().mouseReleaseEvent(event)

    def keyPressEvent(self, event) -> None:
        if self.isEnabled() and event.key() in (
            Qt.Key.Key_Return,
            Qt.Key.Key_Enter,
            Qt.Key.Key_Space,
        ):
            self._reset()
            event.accept()
            return
        super().keyPressEvent(event)


def make_reset_link(
    parent: QWidget, shortcut_input: CardShortcutInput, default_shortcut: str
) -> ResetShortcutLink:
    return ResetShortcutLink(parent, shortcut_input, default_shortcut)


class HelpPopup(QFrame):
    """A compact tooltip that stays open while the pointer is over it."""

    def __init__(self, owner: "HelpIndicator", description: str) -> None:
        super().__init__(
            owner,
            Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint,
        )
        self.owner = owner
        popup_layout = QVBoxLayout(self)
        popup_layout.setContentsMargins(8, 6, 8, 6)
        message = QLabel(description, self)
        message.setWordWrap(True)
        message.setMaximumWidth(464)
        popup_layout.addWidget(message)
        self.setMaximumWidth(540)
        self.adjustSize()

    def enterEvent(self, event) -> None:
        self.owner.hide_timer.stop()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        self.owner.hide_timer.start()
        super().leaveEvent(event)


class HelpIndicator(QLabel):
    """Show an immediate, wrapped help popup while hovered."""

    def __init__(self, setting_name: str, description: str, parent: QWidget) -> None:
        super().__init__(parent)
        self.setAccessibleName(f"Help: {setting_name}")
        self.setCursor(Qt.CursorShape.WhatsThisCursor)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setContentsMargins(0, 0, 0, 0)
        icon_pixmap = QIcon(str(SHARED_ASSET_DIR / "help-indicator.svg")).pixmap(16, 16)
        self.setPixmap(icon_pixmap)
        self.setFixedWidth(icon_pixmap.width())
        self.popup = HelpPopup(self, description)
        self.popup.adjustSize()

        self.hide_timer = QTimer(self)
        self.hide_timer.setSingleShot(True)
        self.hide_timer.setInterval(150)
        self.hide_timer.timeout.connect(self.popup.hide)

    def enterEvent(self, event) -> None:
        self.hide_timer.stop()
        self.popup.move(self.mapToGlobal(QPoint(0, self.height() + 4)))
        self.popup.show()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        self.hide_timer.start()
        super().leaveEvent(event)


def get_settings() -> dict[str, object]:
    config = mw.addonManager.getConfig(ADDON_PACKAGE_NAME) or {}
    settings = {
        name: config.get(name, default)
        for name, default in DEFAULT_SETTINGS.items()
        if not name.startswith("anki_editor_")
    }
    for name in (
        "card_input_markdown_bold_shortcut",
        "card_input_markdown_italic_shortcut",
        "card_input_markdown_strikethrough_shortcut",
        "card_input_markdown_inline_code_shortcut",
        "card_input_markdown_code_block_shortcut",
        "card_input_markdown_unordered_list_shortcut",
        "card_input_markdown_ordered_list_shortcut",
        "card_input_markdown_blockquote_shortcut",
    ):
        settings[name] = migrate_legacy_card_shortcut(settings[name])
    return settings


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
    dialog.setStyleSheet(
        "QTextBrowser { "
        f"background-color: {COLOR_GRAYSCALE_000}; "
        f"border: 1px solid {COLOR_GRAYSCALE_400}; "
        "border-radius: 6px; "
        "}"
    )
    dialog.setWindowTitle("Anki Global Kit Settings")
    dialog.setMinimumWidth(540)
    layout = QVBoxLayout(dialog)
    layout.setSpacing(SECTION_SPACING)
    tabs = QTabWidget(dialog)
    layout.addWidget(tabs)
    current_settings = get_settings()
    current_settings.update(get_editor_settings())

    def add_checkbox_row(
        parent_layout: QVBoxLayout,
        checkbox: QCheckBox,
        description: str | None = None,
        trailing_widget: QWidget | None = None,
        validation_label: QLabel | None = None,
    ) -> None:
        checkbox.setStyleSheet(
            f"QCheckBox:disabled {{ color: {COLOR_GRAYSCALE_500}; }}"
        )
        row_widget = QWidget(parent_layout.parentWidget())
        content_layout = QVBoxLayout(row_widget)
        content_layout.setContentsMargins(*ZERO_MARGINS)
        content_layout.setSpacing(0)
        row = QHBoxLayout()
        row.setContentsMargins(*ZERO_MARGINS)
        content_layout.addLayout(row)
        row.addWidget(checkbox)
        if description is not None:
            row.addStretch()
            help_indicator = HelpIndicator(checkbox.text(), description, dialog)
            row.addWidget(help_indicator)
        elif trailing_widget is None:
            row.addStretch()
        if trailing_widget is not None:
            row.addStretch()
            row.addWidget(trailing_widget)
        if validation_label is not None:
            content_layout.addWidget(validation_label)
        parent_layout.addWidget(row_widget)

    def add_button_row(
        parent_layout: QVBoxLayout, button: QPushButton, *, align_right: bool = True
    ) -> None:
        row_widget = QWidget(parent_layout.parentWidget())
        row = QHBoxLayout(row_widget)
        row.setContentsMargins(*ZERO_MARGINS)
        if align_right:
            row.addStretch()
            row.addWidget(button)
        else:
            row.addWidget(button)
            row.addStretch()
        parent_layout.addWidget(row_widget)

    def add_scrollable_tab(content: QWidget, title: str) -> None:
        scroll_area = QScrollArea(tabs)
        scroll_area.setWidgetResizable(True)
        scroll_area.setFrameShape(QFrame.Shape.NoFrame)
        scroll_area.setWidget(content)
        tabs.addTab(scroll_area, title)

    cards_tab = QWidget(dialog)
    cards_layout = QVBoxLayout(cards_tab)
    cards_layout.setSpacing(SECTION_SPACING)
    questions_section_group = QGroupBox("Card Fields", cards_tab)
    questions_section_layout = QVBoxLayout(questions_section_group)
    question_markdown_shortcuts = QCheckBox(
        "Enable Markdown shortcuts",
        questions_section_group,
    )
    question_markdown_shortcuts.setChecked(
        current_settings["card_input_markdown_shortcuts"]
    )
    add_checkbox_row(
        questions_section_layout,
        question_markdown_shortcuts,
        "Use keyboard shortcuts to apply Markdown formatting in question fields.",
    )
    markdown_shortcut_definitions = (
        ("card_input_markdown_bold_shortcut", "bold"),
        ("card_input_markdown_italic_shortcut", "italic"),
        ("card_input_markdown_strikethrough_shortcut", "strikethrough"),
        ("card_input_markdown_inline_code_shortcut", "inline code"),
        ("card_input_markdown_code_block_shortcut", "code block"),
        ("card_input_markdown_unordered_list_shortcut", "unordered list"),
        ("card_input_markdown_ordered_list_shortcut", "ordered list"),
        ("card_input_markdown_blockquote_shortcut", "blockquote"),
    )
    markdown_shortcut_inputs = {}
    markdown_shortcut_checkboxes = {}
    markdown_shortcut_option_checkboxes = {}
    markdown_shortcut_reset_links = {}
    markdown_shortcut_warning_labels = {}
    shortcut_rows = QWidget(questions_section_group)
    shortcut_rows_layout = QVBoxLayout(shortcut_rows)
    shortcut_rows_layout.setContentsMargins(NESTED_INDENT, 0, 0, 0)

    def style_shortcut_option(checkbox: QCheckBox, *, inactive: bool) -> None:
        if inactive:
            color = COLOR_GRAYSCALE_500
        elif getattr(checkbox, "shortcut_conflict", False):
            color = COLOR_CONFLICT_700
        else:
            color = COLOR_GRAYSCALE_900
        checkbox.setStyleSheet(f"QCheckBox {{ color: {color}; }}")

    for key, label in markdown_shortcut_definitions:
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
        style_shortcut_option(
            checkbox, inactive=not question_markdown_shortcuts.isChecked()
        )
        checkbox.setChecked(
            current_settings.get(enabled_key, DEFAULT_SETTINGS[enabled_key])
        )
        row.addWidget(checkbox)
        row.addStretch()
        shortcut_input = CardShortcutInput(
            current_settings.get(key, DEFAULT_SETTINGS[key]),
            row_widget,
            default_shortcut=DEFAULT_SETTINGS[key],
        )
        reset_link = make_reset_link(
            row_widget,
            shortcut_input,
            DEFAULT_SETTINGS[key],
        )
        row.addWidget(reset_link)
        row.addWidget(shortcut_input)

        def set_row_shortcut_enabled(
            enabled: bool,
            shortcut=shortcut_input,
            reset=reset_link,
            default=DEFAULT_SETTINGS[key],
        ) -> None:
            active = enabled and question_markdown_shortcuts.isChecked()
            shortcut.setEnabled(active)
            shortcut.set_text_dimmed(not active)
            reset.setEnabled(active and shortcut.stored_shortcut() != default)

        set_row_shortcut_enabled(checkbox.isChecked())
        checkbox.toggled.connect(set_row_shortcut_enabled)
        warning_label = QLabel(row_container)
        warning_label.setWordWrap(True)
        warning_label.setStyleSheet(f"color: {COLOR_WARNING_700};")
        warning_label.hide()
        shortcut_input.set_validation_label(warning_label)
        row_container_layout.addWidget(row_widget)
        row_container_layout.addWidget(warning_label)
        shortcut_rows_layout.addWidget(row_container)
        markdown_shortcut_inputs[key] = shortcut_input
        markdown_shortcut_checkboxes[enabled_key] = checkbox
        markdown_shortcut_option_checkboxes[key] = checkbox
        markdown_shortcut_reset_links[key] = reset_link
        markdown_shortcut_warning_labels[key] = warning_label
    questions_section_layout.addWidget(shortcut_rows)

    def set_shortcut_rows_enabled(enabled: bool) -> None:
        shortcut_rows.setEnabled(enabled)
        for key, shortcut_input in markdown_shortcut_inputs.items():
            row_active = (
                enabled and markdown_shortcut_option_checkboxes[key].isChecked()
            )
            shortcut_input.setEnabled(row_active)
            shortcut_input.set_text_dimmed(not row_active)
            style_shortcut_option(
                markdown_shortcut_option_checkboxes[key], inactive=not enabled
            )
            markdown_shortcut_reset_links[key].setEnabled(
                row_active
                and shortcut_input.stored_shortcut() != DEFAULT_SETTINGS[key]
            )

    question_markdown_shortcuts.toggled.connect(set_shortcut_rows_enabled)
    set_shortcut_rows_enabled(question_markdown_shortcuts.isChecked())
    question_tab_indentation = QCheckBox(
        "Enable tab indentation", questions_section_group
    )
    question_tab_indentation.setChecked(current_settings["card_input_tab_indentation"])
    add_checkbox_row(
        questions_section_layout,
        question_tab_indentation,
        "Press Tab in a question field to insert indentation: four spaces for Python topics and two spaces for other topics. Shift+Tab moves to the next field.",
    )
    cards_layout.addWidget(questions_section_group)

    answers_section_group = QGroupBox("Card Reviews", cards_tab)
    answers_section_layout = QVBoxLayout(answers_section_group)
    answer_markdown_rendering = QCheckBox(
        "Enable Markdown rendering", answers_section_group
    )
    answer_markdown_rendering.setChecked(
        current_settings["card_review_markdown_rendering"]
    )
    add_checkbox_row(
        answers_section_layout,
        answer_markdown_rendering,
        "Render Markdown in submitted answers, including formatting such as headings, lists, links, and code blocks.",
    )
    answer_syntax_highlighting = QCheckBox(
        "Enable code block syntax highlighting",
        answers_section_group,
    )
    answer_syntax_highlighting.setChecked(
        current_settings["card_review_syntax_highlighting"]
    )
    add_checkbox_row(
        answers_section_layout,
        answer_syntax_highlighting,
        "Apply language-aware colors to code blocks in rendered answers. A language after the opening backticks takes precedence; otherwise, the card topic is used when possible.",
    )
    cards_layout.addWidget(answers_section_group)
    card_toolbar_section_group = QGroupBox("Card Toolbar", cards_tab)
    card_toolbar_section_layout = QVBoxLayout(card_toolbar_section_group)
    card_toolbar_enabled = QCheckBox(
        "Show formatting toolbar", card_toolbar_section_group
    )
    card_toolbar_enabled.setChecked(current_settings["card_toolbar_enabled"])
    add_checkbox_row(
        card_toolbar_section_layout,
        card_toolbar_enabled,
        "Show a toolbar below each question field with buttons for common Markdown formatting, including lists, quotes, and code.",
    )
    toolbar_buttons_container = QWidget(card_toolbar_section_group)
    toolbar_buttons_layout = QVBoxLayout(toolbar_buttons_container)
    toolbar_buttons_layout.setContentsMargins(NESTED_INDENT, 0, 0, 0)
    toolbar_buttons = {}
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
        checkbox = QCheckBox(label, toolbar_buttons_container)
        checkbox.setChecked(current_settings[setting])
        checkbox.setEnabled(card_toolbar_enabled.isChecked())
        add_checkbox_row(toolbar_buttons_layout, checkbox)
        toolbar_buttons[setting] = checkbox
    card_toolbar_section_layout.addWidget(toolbar_buttons_container)

    def set_toolbar_buttons_enabled(enabled: bool) -> None:
        for checkbox in toolbar_buttons.values():
            checkbox.setEnabled(enabled)

    card_toolbar_enabled.toggled.connect(set_toolbar_buttons_enabled)
    cards_layout.addWidget(card_toolbar_section_group)
    card_settings_widgets = {
        "card_input_markdown_shortcuts": question_markdown_shortcuts,
        "card_input_tab_indentation": question_tab_indentation,
        "card_review_markdown_rendering": answer_markdown_rendering,
        "card_review_syntax_highlighting": answer_syntax_highlighting,
        "card_toolbar_enabled": card_toolbar_enabled,
        **toolbar_buttons,
    }
    cards_layout.addStretch()
    add_scrollable_tab(cards_tab, "Cards")

    editor_tab = QWidget(dialog)
    editor_layout = QVBoxLayout(editor_tab)
    editor_layout.setSpacing(SECTION_SPACING)
    fields_section_group = QGroupBox("Editor Fields", editor_tab)
    fields_section_layout = QVBoxLayout(fields_section_group)
    editor_inline_code_shortcut_enabled = QCheckBox(
        "Enable inline code shortcut", fields_section_group
    )
    editor_inline_code_shortcut_enabled.setChecked(
        current_settings["anki_editor_inline_code_shortcut_enabled"]
    )
    editor_inline_code_shortcut = CardShortcutInput(
        current_settings["anki_editor_inline_code_shortcut"],
        fields_section_group,
    )
    editor_shortcut_controls = QWidget(fields_section_group)
    editor_shortcut_controls_layout = QHBoxLayout(editor_shortcut_controls)
    editor_shortcut_controls_layout.setContentsMargins(*ZERO_MARGINS)
    editor_shortcut_reset_link = make_reset_link(
        editor_shortcut_controls,
        editor_inline_code_shortcut,
        DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"],
    )
    editor_shortcut_controls_layout.addWidget(editor_shortcut_reset_link)
    editor_shortcut_controls_layout.addWidget(editor_inline_code_shortcut)

    def set_editor_shortcut_enabled(enabled: bool) -> None:
        editor_shortcut_controls.setEnabled(enabled)
        editor_inline_code_shortcut.set_text_dimmed(not enabled)
        editor_shortcut_reset_link.setEnabled(
            enabled
            and editor_inline_code_shortcut.stored_shortcut()
            != DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"]
        )

    set_editor_shortcut_enabled(editor_inline_code_shortcut_enabled.isChecked())
    editor_shortcut_warning_label = QLabel(fields_section_group)
    editor_shortcut_warning_label.setWordWrap(True)
    editor_shortcut_warning_label.setStyleSheet(f"color: {COLOR_WARNING_700};")
    editor_shortcut_warning_label.hide()
    editor_inline_code_shortcut.set_validation_label(editor_shortcut_warning_label)
    add_checkbox_row(
        fields_section_layout,
        editor_inline_code_shortcut_enabled,
        trailing_widget=editor_shortcut_controls,
        validation_label=editor_shortcut_warning_label,
    )
    editor_inline_code_shortcut_enabled.toggled.connect(set_editor_shortcut_enabled)
    editor_tab_indentation = QCheckBox("Enable tab indentation", fields_section_group)
    editor_tab_indentation.setChecked(
        current_settings.get("anki_editor_tab_indentation", True)
    )
    add_checkbox_row(
        fields_section_layout,
        editor_tab_indentation,
        "In Desktop editor fields, pressing Tab inserts four spaces instead of moving focus.",
    )

    editor_layout.addWidget(fields_section_group)

    formatting_section_group = QGroupBox("Editor Formatting", editor_tab)
    formatting_section_layout = QVBoxLayout(formatting_section_group)
    paste_cleanup = QCheckBox(
        "Clean up formatting when pasting", formatting_section_group
    )
    paste_cleanup.setChecked(current_settings["anki_editor_paste_cleanup"])
    add_checkbox_row(
        formatting_section_layout,
        paste_cleanup,
        "Clean pasted content in editor fields by removing unwanted formatting while keeping useful content and structure.",
    )
    copy_source_html = QCheckBox("Copy selected source HTML", formatting_section_group)
    copy_source_html.setChecked(current_settings["anki_editor_copy_source_html"])
    add_checkbox_row(
        formatting_section_layout,
        copy_source_html,
        "When copying selected content from an editor field, include its HTML formatting on the clipboard alongside plain text.",
    )
    normalize_code_spaces = QCheckBox(
        "Normalize spaces around inline code", formatting_section_group
    )
    normalize_code_spaces.setChecked(
        current_settings["anki_editor_normalize_code_spaces"]
    )
    add_checkbox_row(
        formatting_section_layout,
        normalize_code_spaces,
        "Replace non-breaking spaces adjacent to inline code with regular spaces so typing and spacing around code stays predictable.",
    )
    editor_layout.addWidget(formatting_section_group)

    toolbar_section_group = QGroupBox("Editor Toolbar", editor_tab)
    toolbar_section_layout = QVBoxLayout(toolbar_section_group)
    inline_code_button = QCheckBox("Show inline code button", toolbar_section_group)
    inline_code_button.setChecked(current_settings["anki_editor_inline_code_button"])
    add_checkbox_row(
        toolbar_section_layout,
        inline_code_button,
        "Add an inline code button to the Desktop editor toolbar for formatting selected text or starting an inline code span.",
    )
    editor_layout.addWidget(toolbar_section_group)
    editor_layout.addStretch()
    add_scrollable_tab(editor_tab, "Editor")

    settings_note = QLabel(
        "Sync your collection with AnkiWeb to apply changes on your other devices."
    )
    settings_note.setWordWrap(True)
    layout.addWidget(settings_note)

    note_types_tab = QWidget(dialog)
    note_types_layout = QVBoxLayout(note_types_tab)
    note_types_layout.setSpacing(SECTION_SPACING)
    note_types_layout.addWidget(
        QLabel("Select your card topics and formats to use for your new note types:")
    )
    note_types_scroll = QScrollArea(note_types_tab)
    note_types_scroll.setWidgetResizable(True)
    note_types_scroll.setFrameShape(QFrame.Shape.NoFrame)
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
            row_background.setStyleSheet(f"background-color: {COLOR_GRAYSCALE_400};")
            note_types_grid.addWidget(row_background, row, 0, 1, 1 + len(FORMATS) * 2)
            row_background.lower()
        note_types_grid.addWidget(QLabel(topic, note_types_options), row, 0)
        note_type_checks[topic] = {}
        overwrite_checks[topic] = {}
        for format_index, card_format in enumerate(FORMATS):
            selected_column = 1 + format_index * 2
            overwrite_column = selected_column + 1
            type_name = f"{topic} ({card_format})"
            checkbox = QCheckBox(note_types_options)
            checkbox.setChecked(saved_selections.get(topic, {}).get(card_format, False))
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
    note_types_button.clicked.connect(create_note_types_from_panel)

    def update_note_types_button_state(checked=False) -> None:
        has_selection = any(
            checkbox.isChecked()
            for checkbox_groups in (note_type_checks, overwrite_checks)
            for formats in checkbox_groups.values()
            for checkbox in formats.values()
        )
        note_types_button.setEnabled(has_selection)

    for checkbox_groups in (note_type_checks, overwrite_checks):
        for formats in checkbox_groups.values():
            for checkbox in formats.values():
                checkbox.toggled.connect(update_note_types_button_state)
    update_note_types_button_state()
    add_button_row(note_types_layout, note_types_button)
    note_types_layout.addStretch()
    tabs.addTab(note_types_tab, "Note Types")

    changelog_tab = QWidget(dialog)
    changelog_layout = QVBoxLayout(changelog_tab)
    changelog_layout.setSpacing(SECTION_SPACING)
    changelog = QTextBrowser(changelog_tab)
    changelog.setReadOnly(True)
    changelog.setOpenExternalLinks(True)
    changelog.document().setDocumentMargin(16)
    changelog_path = ADDON_DIR / "CHANGELOG.md"
    changelog.setMarkdown(
        changelog_path.read_text(encoding="utf-8")
        if changelog_path.is_file()
        else "No changelog is available in this add-on package."
    )
    block = changelog.document().begin()
    first_heading = True
    while block.isValid():
        if block.blockFormat().headingLevel() > 0:
            cursor = QTextCursor(block)
            block_format = block.blockFormat()
            block_format.setTopMargin(0 if first_heading else 16)
            cursor.setBlockFormat(block_format)
            first_heading = False
        block = block.next()
    changelog_layout.addWidget(changelog)
    tabs.addTab(changelog_tab, "Changelog")

    about_tab = QWidget(dialog)
    about_layout = QVBoxLayout(about_tab)
    about_layout.setSpacing(SECTION_SPACING)
    about = QLabel(
        "<h3>Anki Global Kit "
        f'<small style="font-weight: normal">by Jacob Cassidy (v{VERSION})</small></h3>'
        "<p>A collection of global features that supercharges Anki flashcards. Features include advanced input fields, markdown formatting and rendering, card styles, and much more that work across apps. Perfect for programming reviews (and other topics too!).</p>"
        f"<p>Settings are saved to the <em>{JS_ASSET_NAME}</em> file in the Anki app user's <em>collection.media</em> folder.</p>"
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
    add_button_row(about_layout, repository_button, align_right=False)
    about_layout.addStretch()
    tabs.addTab(about_tab, "About")

    restore_button = QPushButton("Restore Defaults", dialog)
    restore_button.setAutoDefault(False)
    restore_button.clicked.connect(
        lambda checked=False: restore_default_settings(
            card_settings_widgets,
            markdown_shortcut_inputs,
            markdown_shortcut_checkboxes,
            inline_code_button,
            editor_inline_code_shortcut_enabled,
            editor_inline_code_shortcut,
            editor_tab_indentation,
            normalize_code_spaces,
            copy_source_html,
            paste_cleanup,
        )
    )

    def update_restore_button(*args) -> None:
        has_custom_checkbox = (
            any(
                checkbox.isChecked() != DEFAULT_SETTINGS[key]
                for key, checkbox in card_settings_widgets.items()
            )
            or any(
                checkbox.isChecked() != DEFAULT_SETTINGS[key]
                for key, checkbox in markdown_shortcut_checkboxes.items()
            )
            or any(
                checkbox.isChecked() != DEFAULT_SETTINGS[key]
                for key, checkbox in (
                    (
                        "anki_editor_inline_code_shortcut_enabled",
                        editor_inline_code_shortcut_enabled,
                    ),
                    ("anki_editor_tab_indentation", editor_tab_indentation),
                    ("anki_editor_inline_code_button", inline_code_button),
                    ("anki_editor_normalize_code_spaces", normalize_code_spaces),
                    ("anki_editor_copy_source_html", copy_source_html),
                    ("anki_editor_paste_cleanup", paste_cleanup),
                )
            )
        )
        has_custom_shortcut = any(
            shortcut_input.stored_shortcut() != DEFAULT_SETTINGS[key]
            for key, shortcut_input in markdown_shortcut_inputs.items()
        ) or (
            editor_inline_code_shortcut.stored_shortcut()
            != DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"]
        )
        restore_enabled = has_custom_checkbox or has_custom_shortcut
        restore_button.setEnabled(restore_enabled)
        restore_button.setToolTip(
            "" if restore_enabled else "All settings are using defaults."
        )

    for checkbox in (
        *card_settings_widgets.values(),
        *markdown_shortcut_checkboxes.values(),
    ):
        checkbox.toggled.connect(update_restore_button)
    for checkbox in (
        editor_inline_code_shortcut_enabled,
        editor_tab_indentation,
        inline_code_button,
        normalize_code_spaces,
        copy_source_html,
        paste_cleanup,
    ):
        checkbox.toggled.connect(update_restore_button)
    for shortcut_input in markdown_shortcut_inputs.values():
        shortcut_input.add_change_listener(update_restore_button)
    editor_inline_code_shortcut.add_change_listener(update_restore_button)
    update_restore_button()

    dialog_buttons = QDialogButtonBox(
        QDialogButtonBox.StandardButton.Cancel
        | QDialogButtonBox.StandardButton.Save,
        Qt.Orientation.Horizontal,
        dialog,
    )
    cancel_button = dialog_buttons.button(QDialogButtonBox.StandardButton.Cancel)
    save_button = dialog_buttons.button(QDialogButtonBox.StandardButton.Save)
    assert cancel_button is not None and save_button is not None
    cancel_button.clicked.connect(dialog.reject)
    save_button.setDefault(True)
    validation_state = {"invalid": [], "duplicates": [], "reserved": []}

    def refresh_shortcut_warnings(*args) -> None:
        messages = {key: [] for key, _ in markdown_shortcut_definitions}
        editor_messages = []
        active_shortcuts = []
        conflict_highlights = set()
        validation_state["invalid"] = []
        validation_state["duplicates"] = []
        validation_state["reserved"] = []

        if question_markdown_shortcuts.isChecked():
            for key, label in markdown_shortcut_definitions:
                enabled_key = f"{key}_enabled"
                if not markdown_shortcut_checkboxes[enabled_key].isChecked():
                    continue
                shortcut = markdown_shortcut_inputs[key].stored_shortcut()
                if not shortcut:
                    continue
                active_shortcuts.append((shortcut, key, label))
                if not shortcut_has_required_modifier(shortcut):
                    messages[key].append(
                        f"Use {SHORTCUT_MODIFIER_HINT} with this key."
                    )
                    validation_state["invalid"].append(label)
                reserved_action = reserved_shortcut_warnings().get(
                    normalize_shortcut(shortcut)
                )
                if reserved_action:
                    messages[key].append(
                        f"{format_shortcut(shortcut)} is reserved for "
                        f"{reserved_action}. Choose another shortcut."
                    )
                    validation_state["reserved"].append(label)

        seen_shortcuts = {}
        for shortcut, key, label in active_shortcuts:
            normalized = normalize_shortcut(shortcut)
            if normalized in seen_shortcuts:
                other_key, other_label = seen_shortcuts[normalized]
                current_order = markdown_shortcut_inputs[key].change_order()
                other_order = markdown_shortcut_inputs[other_key].change_order()
                if current_order >= other_order:
                    warning_key, warning_label = key, other_label
                    highlighted_key = other_key
                else:
                    warning_key, warning_label = other_key, label
                    highlighted_key = key
                messages[warning_key].append(
                    f"{format_shortcut(shortcut)} conflicts with the "
                    f"{warning_label} shortcut. Choose another."
                )
                conflict_highlights.add(highlighted_key)
                validation_state["duplicates"].append((other_label, label))
            else:
                seen_shortcuts[normalized] = (key, label)

        for key, checkbox in markdown_shortcut_option_checkboxes.items():
            checkbox.shortcut_conflict = key in conflict_highlights
            style_shortcut_option(
                checkbox,
                inactive=not question_markdown_shortcuts.isChecked(),
            )

        editor_shortcut = ""
        if editor_inline_code_shortcut_enabled.isChecked():
            editor_shortcut = (
                editor_inline_code_shortcut.stored_shortcut()
                or DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"]
            )
            if not shortcut_has_required_modifier(editor_shortcut):
                editor_messages.append(
                    f"Use {SHORTCUT_MODIFIER_HINT} with this key."
                )
                validation_state["invalid"].append("Anki editor inline code")
            reserved_action = reserved_shortcut_warnings().get(
                normalize_shortcut(editor_shortcut)
            )
            if reserved_action:
                editor_messages.append(
                    f"{format_shortcut(editor_shortcut)} is reserved for "
                    f"{reserved_action}. Choose another shortcut."
                )
                validation_state["reserved"].append("Anki editor inline code")

        built_in_shortcuts = anki_shortcut_warnings()
        editor_built_in_shortcuts = {
            **built_in_shortcuts,
            **anki_editor_format_shortcut_warnings(),
        }
        for shortcut, key, label in active_shortcuts:
            description = built_in_shortcuts.get(normalize_shortcut(shortcut))
            if description:
                messages[key].append(f"May overlap Anki’s {description} shortcut.")
        if editor_shortcut:
            description = editor_built_in_shortcuts.get(
                normalize_shortcut(editor_shortcut)
            )
            if description:
                editor_messages.append(f"May overlap Anki’s {description} shortcut.")

        for key, label in markdown_shortcut_warning_labels.items():
            message = "\n".join(messages[key])
            label.setText(message)
            label.setVisible(bool(message))
        editor_shortcut_warning_label.setText("\n".join(editor_messages))
        editor_shortcut_warning_label.setVisible(bool(editor_messages))

    def validate_shortcut_candidate(key: str, candidate: str) -> str | None:
        if not question_markdown_shortcuts.isChecked():
            return None
        candidate_normalized = normalize_shortcut(candidate)
        for other_key, other_label in markdown_shortcut_definitions:
            if other_key == key:
                continue
            enabled_key = f"{other_key}_enabled"
            if not markdown_shortcut_checkboxes[enabled_key].isChecked():
                continue
            other_shortcut = markdown_shortcut_inputs[other_key].stored_shortcut()
            if (
                other_shortcut
                and normalize_shortcut(other_shortcut) == candidate_normalized
            ):
                return (
                    f"{format_shortcut(candidate)} conflicts with the "
                    f"{other_label} shortcut. Choose another."
                )
        return None

    for key, _ in markdown_shortcut_definitions:
        markdown_shortcut_inputs[key].set_shortcut_validator(
            lambda candidate, key=key: validate_shortcut_candidate(key, candidate)
        )
        markdown_shortcut_inputs[key].add_change_listener(refresh_shortcut_warnings)
        markdown_shortcut_checkboxes[f"{key}_enabled"].toggled.connect(
            refresh_shortcut_warnings
        )
    question_markdown_shortcuts.toggled.connect(refresh_shortcut_warnings)
    editor_inline_code_shortcut.add_change_listener(refresh_shortcut_warnings)
    editor_inline_code_shortcut_enabled.toggled.connect(refresh_shortcut_warnings)
    refresh_shortcut_warnings()

    def save_current_settings(checked=False) -> None:
        settings = {
            **{
                key: checkbox.isChecked()
                for key, checkbox in card_settings_widgets.items()
            },
            **{
                key: widget.stored_shortcut()
                for key, widget in markdown_shortcut_inputs.items()
            },
            **{
                key: checkbox.isChecked()
                for key, checkbox in markdown_shortcut_checkboxes.items()
            },
            "anki_editor_inline_code_shortcut_enabled": (
                editor_inline_code_shortcut_enabled.isChecked()
            ),
            "anki_editor_inline_code_shortcut": editor_inline_code_shortcut.stored_shortcut()
            or DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"],
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
        }
        refresh_shortcut_warnings()
        if (
            validation_state["invalid"]
            or validation_state["duplicates"]
            or validation_state["reserved"]
        ):
            return
        save_settings(dialog, settings)

    save_button.clicked.connect(save_current_settings)
    buttons_layout = QHBoxLayout()
    buttons_layout.addWidget(restore_button)
    buttons_layout.addStretch()
    buttons_layout.addWidget(dialog_buttons)
    layout.addLayout(buttons_layout)

    tab_widget_focus_policies = [
        (widget, widget.focusPolicy())
        for widget in (tabs, *tabs.findChildren(QWidget))
        if widget.focusPolicy() != Qt.FocusPolicy.NoFocus
    ]
    for widget, _ in tab_widget_focus_policies:
        widget.setFocusPolicy(Qt.FocusPolicy.NoFocus)

    def restore_tab_focus_policies() -> None:
        for widget, focus_policy in tab_widget_focus_policies:
            widget.setFocusPolicy(focus_policy)

    QTimer.singleShot(0, restore_tab_focus_policies)
    dialog.exec()


def restore_default_settings(
    card_settings_widgets: dict[str, QCheckBox],
    markdown_shortcut_inputs: dict[str, CardShortcutInput],
    markdown_shortcut_checkboxes: dict[str, QCheckBox],
    inline_code_button: QCheckBox,
    editor_inline_code_shortcut_enabled: QCheckBox,
    editor_inline_code_shortcut: CardShortcutInput,
    editor_tab_indentation: QCheckBox,
    normalize_code_spaces: QCheckBox,
    copy_source_html: QCheckBox,
    paste_cleanup: QCheckBox,
) -> None:
    for key, checkbox in card_settings_widgets.items():
        checkbox.setChecked(DEFAULT_SETTINGS[key])
    for key, shortcut_input in markdown_shortcut_inputs.items():
        shortcut_input.set_shortcut(DEFAULT_SETTINGS[key])
    for key, checkbox in markdown_shortcut_checkboxes.items():
        checkbox.setChecked(DEFAULT_SETTINGS[key])
    editor_inline_code_shortcut_enabled.setChecked(
        DEFAULT_SETTINGS["anki_editor_inline_code_shortcut_enabled"]
    )
    editor_inline_code_shortcut.set_shortcut(
        DEFAULT_SETTINGS["anki_editor_inline_code_shortcut"]
    )
    editor_tab_indentation.setChecked(DEFAULT_SETTINGS["anki_editor_tab_indentation"])
    inline_code_button.setChecked(DEFAULT_SETTINGS["anki_editor_inline_code_button"])
    normalize_code_spaces.setChecked(
        DEFAULT_SETTINGS["anki_editor_normalize_code_spaces"]
    )
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
