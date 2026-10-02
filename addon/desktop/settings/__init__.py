"""Settings configuration, controls, and dialog for the Desktop add-on."""

from .assets import update_assets_for_profile
from .config import get_editor_settings, get_settings
from .dialog import initialize, open_settings

__all__ = [
    "get_editor_settings",
    "get_settings",
    "initialize",
    "open_settings",
    "update_assets_for_profile",
]
