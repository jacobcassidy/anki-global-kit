"""Normalize structural paste whitespace without flattening inline prose."""
import re

from bs4 import BeautifulSoup, Comment, Doctype, NavigableString, Tag

BLOCKS = set("address article aside blockquote body div dl dt dd fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr html li main nav ol p pre section table tbody td tfoot th thead tr ul".split())
ITEM_CHILDREN = {
    "ul": {"li"}, "ol": {"li"}, "dl": {"dt", "dd"},
    "table": {"caption", "colgroup", "thead", "tbody", "tfoot", "tr"},
    "thead": {"tr"}, "tbody": {"tr"}, "tfoot": {"tr"},
    "tr": {"td", "th"},
}
PROTECTED = {"pre", "code", "textarea", "script", "style", "svg", "math"}
SPACE = re.compile(r"^[ \t\r\n\f]+$")
PRESERVE_STYLE = re.compile(r"white-space\s*:\s*(?:pre(?:-wrap|-line)?|break-spaces)\b", re.I)


def clean_paste_html(html):
    # Anki already bundles BeautifulSoup. Keep whitespace strings intact while
    # parsing; only the structural boundaries below are eligible for cleanup.
    tags = set(re.findall(r"<([a-zA-Z][a-zA-Z0-9:-]*)\b", html.lower()))
    soup = BeautifulSoup(html, "html.parser", preserve_whitespace_tags=tags)

    def block(node):
        return isinstance(node, Tag) and node.name in BLOCKS

    def visit(parent):
        if parent.name in PROTECTED or PRESERVE_STYLE.search(parent.get("style", "")):
            return
        for child in list(parent.children):
            # Craft embeds a Cocoa HTML document inside its clipboard div.
            # Anki later discards its metadata/comments and unwraps html/body.
            # Remove that scaffolding first, or its surrounding LFs survive
            # as separate text nodes and become blank lines after sanitizing.
            if isinstance(child, (Comment, Doctype)):
                child.extract()
            elif isinstance(child, Tag) and child.name in {"head", "meta", "title"}:
                child.decompose()
            elif isinstance(child, Tag):
                visit(child)
        parent.smooth()

        # Drop formatting whitespace adjacent to blocks, but retain inline word
        # separators, nonbreaking spaces, explicit breaks and empty elements.
        children = list(parent.children)
        for index, child in enumerate(children):
            if type(child) is not NavigableString or not SPACE.fullmatch(str(child)):
                continue
            left = children[index - 1] if index else None
            right = children[index + 1] if index + 1 < len(children) else None
            if block(left) or block(right):
                child.extract()

        children = list(parent.children)
        for left, right in zip(children, children[1:]):
            if block(left) or block(right):
                # Existing prose whitespace at this boundary needs no extra LF.
                if not (str(left).endswith("\n") or str(right).startswith("\n")):
                    right.insert_before(NavigableString("\n"))

        # List items/rows stay on separate lines from their container. Ordinary
        # wrappers share their opening/closing lines with their edge children.
        # Cocoa also exports indentation as ul > ul wrappers. Keep those on
        # one line: Chromium collapses them on insertion, leaving their LFs.
        item_tags = ITEM_CHILDREN.get(parent.name, set())
        if item_tags and children:
            if isinstance(children[0], Tag) and children[0].name in item_tags:
                children[0].insert_before(NavigableString("\n"))
            if isinstance(children[-1], Tag) and children[-1].name in item_tags:
                children[-1].insert_after(NavigableString("\n"))

    visit(soup)
    # Craft's converted clipboard puts even inline snippets in a bare DIV.
    # Chromium's insertHTML merges that block with existing prose and can
    # replace CODE with computed-style SPANs. Insert inline content directly;
    # retain real block structure and wrappers carrying formatting/attributes.
    if len(soup.contents) == 1:
        wrapper = soup.contents[0]
        if (isinstance(wrapper, Tag) and wrapper.name == "div"
                and not wrapper.attrs and wrapper.find("code")
                and not wrapper.find(list(BLOCKS))):
            wrapper.unwrap()
    return soup.decode(formatter="minimal")


def clean_paste_mime(mime, editor_web_view, internal, extended, drop_event):
    """Filter external rich HTML; return a copy so the clipboard is untouched."""
    from aqt.qt import QMimeData
    from ...settings import get_editor_settings

    if (internal or not extended or not mime.hasHtml()
            or not get_editor_settings()["anki_editor_paste_cleanup"]):
        return mime
    editor_web_view.eval("globalThis.ankiGlobalKitEditor?.beginPasteLayout();")
    original = mime.html()
    cleaned = clean_paste_html(original)
    if cleaned == original:
        return mime
    result = QMimeData()
    for mime_type in mime.formats():
        result.setData(mime_type, mime.data(mime_type))
    result.setHtml(cleaned)
    return result


def finish_paste_layout(editor, html, internal, extended):
    editor.web.eval("globalThis.ankiGlobalKitEditor?.finishPasteLayout();")
