"""Create Anki Global Kit reference note types in the active collection."""

from copy import deepcopy
from pathlib import Path

from anki.consts import MODEL_CLOZE
from aqt import mw
from aqt.utils import askUser, showInfo, showWarning


ADDON_DIR = Path(__file__).parent
TEMPLATE_DIR = ADDON_DIR / "templates" / "note-types"
STYLING_NAME = "styling.css"
NOTE_TYPES = {
    "Anki Global Kit - Advance": {
        "front": "advance-front.html",
        "back": "advance-back.html",
        "fields": [
            "Topic",
            "Question",
            "Answer",
            "Type Hint",
            "Compare",
            "Bonus Question",
            "Bonus Answer",
            "Bonus Type Hint",
            "Bonus Compare",
            "Notes",
        ],
        "cloze": False,
    },
    "Anki Global Kit - Cloze": {
        "front": "cloze-front.html",
        "back": "cloze-back.html",
        "fields": [
            "Topic",
            "Cloze Question",
            "Type Hint",
            "Bonus Question",
            "Bonus Answer",
            "Bonus Type Hint",
            "Bonus Compare",
            "Notes",
        ],
        "cloze": True,
    },
}


def _read_template(filename: str) -> str:
    return (TEMPLATE_DIR / filename).read_text(encoding="utf-8")


def _create_note_type(name: str, spec: dict[str, object]) -> None:
    col = mw.col
    models = col.models
    if spec["cloze"]:
        stock_cloze = next(
            (model for model in models.all() if model["type"] == MODEL_CLOZE), None
        )
        if stock_cloze is None:
            raise RuntimeError("Anki's built-in cloze note type was not found.")
        notetype = deepcopy(stock_cloze)
        notetype["id"] = 0
        notetype["name"] = name
        notetype["flds"] = []
        notetype["tmpls"] = [deepcopy(stock_cloze["tmpls"][0])]
        template = notetype["tmpls"][0]
        template["ord"] = 0
        template["name"] = "Cloze"
    else:
        notetype = models.new(name)
        template = models.new_template("Card 1")
        notetype["tmpls"] = [template]

    for field_name in spec["fields"]:
        models.add_field(notetype, models.new_field(field_name))

    template["qfmt"] = _read_template(spec["front"])
    template["afmt"] = _read_template(spec["back"])
    notetype["css"] = _read_template(STYLING_NAME)
    notetype["sortf"] = 0
    models.add(notetype)


def create_reference_note_types() -> None:
    """Create missing reference note types without changing existing ones."""
    if mw.col is None:
        showWarning("Open an Anki profile before creating Anki Global Kit note types.")
        return

    missing_templates = [
        filename
        for spec in NOTE_TYPES.values()
        for filename in (spec["front"], spec["back"])
        if not (TEMPLATE_DIR / filename).is_file()
    ]
    if missing_templates or not (TEMPLATE_DIR / STYLING_NAME).is_file():
        showWarning(
            "The Anki Global Kit reference templates are missing from this add-on. "
            "Rebuild or reinstall the add-on package."
        )
        return

    existing_names = {entry.name for entry in mw.col.models.all_names_and_ids()}
    names_to_create = [name for name in NOTE_TYPES if name not in existing_names]
    if not names_to_create:
        showInfo(
            "Both Anki Global Kit reference note types already exist in this profile. "
            "Existing note types were left unchanged."
        )
        return

    names = "\n".join(f"• {name}" for name in names_to_create)
    if not askUser(
        "Create these new note types in the active Anki profile?\n\n"
        f"{names}\n\nExisting note types will not be modified."
    ):
        return

    created = []
    skipped = [name for name in NOTE_TYPES if name in existing_names]
    try:
        for name in names_to_create:
            _create_note_type(name, NOTE_TYPES[name])
            created.append(name)
    except Exception as error:
        details = "\n".join(created) if created else "None"
        showWarning(
            "Anki Global Kit could not create all requested note types.\n\n"
            f"Created:\n{details}\n\nError: {error}"
        )
        return

    message = "Created note types:\n" + "\n".join(created)
    if skipped:
        message += "\n\nAlready present and left unchanged:\n" + "\n".join(skipped)
    message += (
        "\n\nSync this profile to make the note types available on other devices."
    )
    showInfo(message)
