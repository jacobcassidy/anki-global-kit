# Anki Global Kit add-on

This add-on installs the generated JavaScript and CSS into the active Anki profile's `collection.media` folder. Anki can then sync those resources to AnkiWeb and the mobile clients.

The add-on does not rewrite existing note types. Choose **Tools > Anki Global Kit Settings...**, open **Note Types**, and select the topics and card formats you want. Choose **Create Selected Note Types** to create new note types from the bundled card template parts, named like `CSS (Advance)` and `CSS (Cloze)`. Existing note types with the same names are left unchanged.

## Build and install for development

From the repository root, run `npm run build:addon`. Copy the `addon` folder into Anki's add-ons folder and restart Anki. On profile open, the add-on installs or refreshes the card JavaScript and CSS in that profile. In **Tools > Anki Global Kit Settings... > Note Types**, select topics and card formats, then choose **Create Selected Note Types**. Sync your collection to make the resources and note types available on your other devices.

The **Cards** settings tab controls question-input Markdown hotkeys and Tab indentation, plus Markdown rendering and syntax highlighting for submitted answers. The **Editor** tab controls the inline-code hotkey and button, plus the master Tab-indentation setting. Save the settings and sync the collection to apply them on other devices.

The `web` assets and `templates/card` folder should be included in published add-on packages.
