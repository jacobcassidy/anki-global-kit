"""Anki Desktop add-on features."""

from . import editor, settings


def initialize() -> None:
    settings.initialize()
    editor.initialize()
