"""Shared settings defaults, paths, and Qt styling constants."""

from pathlib import Path

from aqt.utils import is_mac


DESKTOP_DIR = Path(__file__).resolve().parents[1]
ADDON_DIR = DESKTOP_DIR.parent
SHARED_ASSET_DIR = DESKTOP_DIR / "shared" / "assets"
ADDON_PACKAGE_NAME = __package__.split(".", maxsplit=1)[0]
ASSET_DIR = ADDON_DIR / "web"
JS_ASSET_NAME = "_anki-global-kit.min.js"
ASSET_NAMES = (JS_ASSET_NAME, "_anki-global-kit.min.css")
VERSION = "1.0.0"
SECTION_SPACING = 24
TAB_SECTION_TITLE_TOP_PADDING = 12
NOTE_TYPES_ROW_PADDING = 2
NESTED_INDENT = 20
SHORTCUT_MIN_WIDTH = 80
ZERO_MARGINS = (0, 0, 0, 0)
COLOR_GRAYSCALE_LIGHT_100 = "#ffffff"
COLOR_GRAYSCALE_LIGHT_200 = "#f8f8f8"
COLOR_GRAYSCALE_LIGHT_300 = "#f2f2f2"
COLOR_GRAYSCALE_LIGHT_400 = "#ebebeb"
COLOR_GRAYSCALE_LIGHT_500 = "#e4e4e4"
COLOR_GRAYSCALE_LIGHT_600 = "#dedede"
COLOR_GRAYSCALE_LIGHT_700 = "#d7d7d7"
COLOR_GRAYSCALE_LIGHT_800 = "#d1d1d1"
COLOR_GRAYSCALE_LIGHT_900 = "#cacaca"
COLOR_GRAYSCALE_DARK_100 = "#a4a4a4"
COLOR_GRAYSCALE_DARK_200 = "#898989"
COLOR_GRAYSCALE_DARK_300 = "#6f6f6f"
COLOR_GRAYSCALE_DARK_400 = "#555555"
COLOR_GRAYSCALE_DARK_500 = "#3d3d3d"
COLOR_GRAYSCALE_DARK_600 = "#262626"
COLOR_GRAYSCALE_DARK_700 = "#121212"
COLOR_GRAYSCALE_DARK_800 = "#020202"
COLOR_GRAYSCALE_DARK_900 = "#000000"
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