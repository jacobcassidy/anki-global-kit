"""Build the add-on information and repository tab."""

from aqt.qt import QDesktopServices, QLabel, QPushButton, QUrl, QVBoxLayout, QWidget

from ...constants import JS_ASSET_NAME, SECTION_SPACING, VERSION
from ...widgets import add_button_row


def build_about_tab(parent: QWidget) -> QWidget:
    tab = QWidget(parent)
    layout = QVBoxLayout(tab)
    layout.setSpacing(SECTION_SPACING)
    about = QLabel(
        "<h3>Anki Global Kit "
        f'<small style="font-weight: normal">by Jacob Cassidy (v{VERSION})</small></h3>'
        "<p>A collection of global features that supercharges Anki flashcards. Features include advanced input fields, markdown formatting and rendering, card styles, and much more that work across apps. Perfect for programming reviews (and other topics too!).</p>"
        f"<p>Settings are saved to the <em>{JS_ASSET_NAME}</em> file in the Anki app user's <em>collection.media</em> folder.</p>"
    )
    about.setWordWrap(True)
    layout.addWidget(about)
    repository_button = QPushButton("GitHub Repo", tab)
    repository_button.setAutoDefault(False)
    repository_button.clicked.connect(
        lambda checked=False: QDesktopServices.openUrl(
            QUrl("https://github.com/jacobcassidy/anki-global-kit-addon")
        )
    )
    add_button_row(layout, repository_button, align_right=False)
    layout.addStretch()
    return tab
