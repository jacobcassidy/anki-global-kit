# Publishing the Anki Global Kit add-on

This guide covers publishing the Desktop add-on on AnkiWeb's Shared Add-ons site. The add-on installs the card JavaScript and CSS into the active profile's `collection.media` folder and can create new Advance and Cloze reference note types. It leaves existing note types untouched.

## Before publishing

1. Build the JavaScript and CSS assets from the repository root:

   ```sh
   npm install
   npm run build:addon
   ```

2. Install the `addon` folder in a clean Anki Desktop profile and confirm that its assets are copied into `collection.media` automatically when the profile opens.
3. Choose **Tools > Anki Global Kit Settings...**, select **Create Note Types**, and confirm that the Advance and Cloze note types are created.
4. Add a sample note to each type, sync the profile, and confirm the cards render in AnkiWeb and the mobile clients you support.
5. Decide the minimum Anki Desktop version supported by the release. Enter that version in the AnkiWeb listing and keep it aligned with the add-on APIs used by the code.

Anki add-ons run on Anki Desktop. Publishing this add-on does not install it on AnkiWeb, AnkiMobile, or AnkiDroid; the installed media and card templates are what sync to those clients.

## Create the upload archive

From the repository root, build the archive with the add-on files at the archive root:

```sh
npm run build:addon
cd addon
zip -r ../anki-global-kit.ankiaddon __init__.py note_types.py config.json manifest.json README.md CHANGELOG.md web templates
cd ..
```

The archive should contain `__init__.py`, `note_types.py`, `manifest.json`, `README.md`, `web/`, and `templates/` at its top level. Do not include an enclosing `addon/` directory or any `__pycache__/` folders. If Anki has been run from this source folder, remove generated `__pycache__` directories before archiving.

The Anki add-on guide documents the required archive layout and upload process: [Sharing Add-ons](https://addon-docs.ankiweb.net/sharing.html).

## Publish the first listing

1. Sign in to [AnkiWeb](https://ankiweb.net/).
2. Open [Shared Add-ons](https://ankiweb.net/shared/addons/) and choose the upload option.
3. Enter the add-on title, description, tags, support link, and minimum/maximum Anki version information requested by the form.
4. Upload `anki-global-kit.ankiaddon` and submit the listing.
5. After publication, install the add-on from its AnkiWeb listing in a clean profile and verify the listed download code.

Keep the source repository linked from the listing so users can review the code and find the setup instructions.

## Publish an update

1. Make and review the code changes, then update the changelog and supported Anki version information as needed.
2. Rebuild the assets with `npm run build:addon`.
3. Test the built add-on in Anki Desktop. For changes to card behavior, also check a synced collection in the supported web and mobile clients.
4. Recreate the `.ankiaddon` archive using the same root layout and omit all `__pycache__/` directories.
5. Sign in to the AnkiWeb account that owns the existing listing, open that listing, and use its update option to upload the new archive. Updating the existing listing preserves its identity and download code.
6. Verify the updated listing and download/install the update in a clean profile.

An add-on update replaces the add-on files for users who update it; it does not automatically update note types that were created previously. If a release changes required template markup or styling, document migration steps and provide a deliberate update action or explain how users can create a fresh note type. Do not silently overwrite a user's edited templates.

## References

- [Anki add-on sharing guide](https://addon-docs.ankiweb.net/sharing.html)
- [Anki add-on folders](https://addon-docs.ankiweb.net/addon-folders.html)
- [Anki manual: Add-ons](https://docs.ankiweb.net/addons.html)
