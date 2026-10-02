"""Read and write add-on settings."""

from aqt import mw

from .constants import ADDON_PACKAGE_NAME, DEFAULT_SETTINGS
from .shortcuts import migrate_legacy_card_shortcut


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


def save_note_type_selections(selections: dict[str, dict[str, bool]]) -> None:
    config = mw.addonManager.getConfig(ADDON_PACKAGE_NAME) or {}
    config["note_type_selections"] = selections
    mw.addonManager.writeConfig(ADDON_PACKAGE_NAME, config)


def write_settings(settings: dict[str, object]) -> None:
    mw.addonManager.writeConfig(ADDON_PACKAGE_NAME, settings)
