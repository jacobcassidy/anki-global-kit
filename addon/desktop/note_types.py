"""Create topic-specific Anki Global Kit note types from template parts."""

from copy import deepcopy
from pathlib import Path

from anki.consts import MODEL_CLOZE
from aqt import mw
from aqt.utils import askUser, showInfo, showWarning


ADDON_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = ADDON_DIR / "templates" / "note-types" / "parts"
HTML_DIR = TEMPLATE_DIR / "html"
STYLING_DIR = TEMPLATE_DIR / "styling"
SCRIPT_PATH = TEMPLATE_DIR / "script" / "card-script.js"
TOPICS = (
    "CSS",
    "Git",
    "JavaScript",
    "PHP",
    "Python",
    "React",
    "Regex",
    "Ruby",
    "Shell",
    "TypeScript",
    "Vocabulary",
    "WordPress",
)
FORMATS = {
    "Advance": {
        "front": "advance-front.html",
        "back": "advance-back.html",
        "fields": [
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
    "Cloze": {
        "front": "cloze-front.html",
        "back": "cloze-back.html",
        "fields": [
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


def _read_template(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _card_template(filename: str, topic: str, script: str) -> str:
    html = _read_template(HTML_DIR / filename)
    html = html.replace(
        '<h1 class="topic">Topic</h1>', f'<h1 class="topic">{topic}</h1>'
    )
    return f"{html.rstrip()}\n\n<script>\n{script.rstrip()}\n</script>\n"


def _create_note_type(name: str, topic: str, spec: dict[str, object]) -> None:
    models = mw.col.models
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

    script = _read_template(SCRIPT_PATH)
    template["qfmt"] = _card_template(spec["front"], topic, script)
    template["afmt"] = _card_template(spec["back"], topic, script)
    imports = _read_template(STYLING_DIR / "imports.css")
    topic_style = _read_template(STYLING_DIR / f"style-{topic.lower()}.css")
    notetype["css"] = f"{imports.rstrip()}\n\n{topic_style.rstrip()}\n"
    notetype["sortf"] = 0
    models.add(notetype)


def create_selected_note_types(selections: dict[str, set[str]]) -> None:
    """Create selected topic and format combinations; leave existing types alone."""
    if mw.col is None:
        showWarning("Open an Anki profile before creating Anki Global Kit note types.")
        return

    selected = [
        (topic, card_format)
        for topic in TOPICS
        for card_format in FORMATS
        if card_format in selections.get(topic, set())
    ]
    if not selected:
        showInfo("Select at least one topic and card format to create note types.")
        return

    required_paths = [SCRIPT_PATH, STYLING_DIR / "imports.css"]
    for topic, card_format in selected:
        spec = FORMATS[card_format]
        required_paths.extend(
            HTML_DIR / spec[side] for side in ("front", "back")
        )
        required_paths.append(STYLING_DIR / f"style-{topic.lower()}.css")
    missing = [
        str(path.relative_to(ADDON_DIR))
        for path in required_paths
        if not path.is_file()
    ]
    if missing:
        showWarning(
            "Anki Global Kit card template files are missing. Rebuild or reinstall "
            "the add-on package.\n\n" + "\n".join(missing)
        )
        return

    existing_names = {entry.name for entry in mw.col.models.all_names_and_ids()}
    requested = [
        (topic, card_format, f"{topic} ({card_format})")
        for topic, card_format in selected
    ]
    names_to_create = [item for item in requested if item[2] not in existing_names]
    skipped = [item[2] for item in requested if item[2] in existing_names]
    if not names_to_create:
        showInfo(
            "All selected note types already exist in this profile. "
            "Existing note types were left unchanged."
        )
        return

    names = "\n".join(f"• {name}" for _, _, name in names_to_create)
    if not askUser(
        "Create these new note types in the active Anki profile?\n\n"
        f"{names}\n\nExisting note types will not be modified."
    ):
        return

    created = []
    try:
        for topic, card_format, name in names_to_create:
            _create_note_type(name, topic, FORMATS[card_format])
            created.append(name)
    except Exception as error:
        details = "\n".join(created) if created else "None"
        showWarning(
            "Anki Global Kit could not create all selected note types.\n\n"
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
