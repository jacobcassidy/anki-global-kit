"""Build the read-only changelog tab."""

from aqt.qt import QTextBrowser, QTextCursor, QVBoxLayout, QWidget

from ...constants import ADDON_DIR, SECTION_SPACING


def build_changelog_tab(parent: QWidget) -> QWidget:
    tab = QWidget(parent)
    layout = QVBoxLayout(tab)
    layout.setSpacing(SECTION_SPACING)
    browser = QTextBrowser(tab)
    browser.setReadOnly(True)
    browser.setOpenExternalLinks(True)
    browser.document().setDocumentMargin(16)
    browser.document().setIndentWidth(24)
    changelog_path = ADDON_DIR / "CHANGELOG.md"
    if not changelog_path.is_file():
        changelog_path = ADDON_DIR.parent / "CHANGELOG.md"
    browser.setMarkdown(
        changelog_path.read_text(encoding="utf-8")
        if changelog_path.is_file()
        else "No changelog is available in this add-on package."
    )
    block = browser.document().begin()
    first_heading = True
    while block.isValid():
        if block.blockFormat().headingLevel() > 0:
            block_format = block.blockFormat()
            block_format.setTopMargin(0 if first_heading else 16)
            cursor = QTextCursor(block)
            cursor.setBlockFormat(block_format)
            first_heading = False
        block = block.next()
    layout.addWidget(browser)
    return tab
