<!-- TODO: Update README with new design system of using --brand-color-h: xxx; or --brand-color-c: 0; -->

# Anki Global Extension

This project adds advanced features to your [Anki](https://apps.ankiweb.net/) cards that sync across all devices (PC, Web, and Mobile). Hence, the name **Anki Global Extension**.

| Table of Contents             |
| ----------------------------- |
| [Screenshots](#screenshots)   |
| [Features](#features)         |
| [Installation](#installation) |
| [Usage](#usage)               |
| [FAQ](#faq)                   |
| [Changelog](#changelog)       |
| [Issues](#issues)             |

## Screenshots

### AnkiPC (_in dark mode_)

![AnkiPC Screenshot](/assets/screenshots/screenshot-ankipc.png)

### AnkiWeb (_in light mode_)

![AnkiWeb Screenshot](/assets/screenshots/screenshot-ankiweb.png)

## Features

### Advanced Typed Inputs

Anki has a default input field you can use on the AnkiPC app to type an answer to a card's question. However, it has many limitations and is not available across all apps. Adding the _Advanced Typed Inputs_ setup improves on the default and allows you to use typed answers on all devices. I initially developed this setup specifically for programming reviews, but it can be used for any topic you study.

Advanced Typed Inputs features included:

- **Multiline Typed Inputs** - Anki's default input field only allows a single input line. Advanced Typed Inputs allow you the freedom of adding multiple lines (perfect for code blocks).

<!-- [ADD GIF SCREENSHOT EXAMPLE] -->

- **Infinity Typed Inputs** - Anki's default input field can only be used once per card. Advanced Typed Inputs allow you the freedom to add additional input fields (perfect for when you have a 2-part question).

> [!NOTE]
> While the _Infinity Typed Inputs_ feature gives you the ability to add as many inputs as you want on a single card, you'll get the most benefit from your reviews by keeping your cards simple. For me, that means having only one extra optional input per card which can be used for a quick follow-up question or typed code example.

<!-- [ADD GIF SCREENSHOT EXAMPLE] -->

- **Streamlined Comparison Answers** - Anki currently uses different comparison algorithms for its different Anki apps. This gives you different results depending on which device you're using. _Advanced Typed Inputs_ streamlines this by using a single comparison algorithm, synced across all Anki apps to produce the same comparison results no matter which device you are using.

<!-- [ADD GIF SCREENSHOT EXAMPLE] -->

- **Unlimited Comparison Answers** - Like the input fields themselves, Anki limits the comparison answers to just one per card, even if you have multiple inputs for which you would like comparison answers. _Advanced Typed Inputs_ allow you to have unlimited comparison answers per card so you can compare all your multiline typed inputs.

<!-- [ADD GIF SCREENSHOT EXAMPLE] -->

### Global Card Styles

Anki cards are plain vanilla without any customization. Global Card Styles allows you to set custom default styles for all your cards and then have CSS variable overrides to change specific styles (such as the color) for different card topics.

## Installation

The initial setup for Anki Global Extension requires the use of the free [AnkiPC](https://apps.ankiweb.net/) app. This means you'll need to use a device running Windows, macOS, or Linux. Once set up, you can use the features on any Anki app.

<!--
> __Note__: If you only want to add a specific feature, follow the instructions for that feature:
> - [Advanced Typed Inputs - Installation Instructions]()
> - [Global Card Styles - Installation Instructions]()
>
> Otherwise, continue for the complete installation...
-->

### Step 1: Install AnkiPC

- If you don't already have AnkiPC installed, install it now by visiting [Anki](https://apps.ankiweb.net/) and clicking the download button (_available for macOS, Windows, and Linux_).

### Step 2: Download the _Anki Global Extension_ files

You have three options for downloading the files:

1. You can download the files you want individually (see below).
2. You can download the entire repository as a zip file: [Download Zip](https://github.com/jacobcassidy/anki-global-kit/archive/refs/heads/main.zip)
3. You can clone the repository to your local computer with: `git clone git@github.com:jacobcassidy/anki-global-kit.git`

#### Downloading Individual Files

You can download individual files by going to the file's GitHub page and clicking the small download button...

![Download Button Screenshot](/assets/screenshots/download-file-button.png)

The only files required are in the [collection.media](https://github.com/jacobcassidy/anki-global-kit/tree/main/collection.media) directory:

| File                                                                                                                                                   | Purpose                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [\_global.min.js](https://github.com/jacobcassidy/anki-global-kit/blob/main/collection.media/_global.min.js)                                                   | Creates Advanced Typed Inputs, renders submitted answers, and independently highlights fenced code blocks based on the card topic.    |
| [\_global.min.css](https://github.com/jacobcassidy/anki-global-kit/blob/main/collection.media/_global.min.css)                                                 | Sets shared card styles, including token colors for highlighted answer code. Can be overridden with specific card styles.              |
| [\_diff_match_patch.js](https://github.com/jacobcassidy/anki-global-kit/blob/main/collection.media/_diff_match_patch.js)                               | Provides the global answer comparison algorithm                                                          |
| [\_mesloLGL-NF.woff2](https://github.com/jacobcassidy/anki-global-kit/blob/main/collection.media/_mesloLGL-NF.woff2)                                   | **Optional**: Mono font file for code display.                                                           |

### Step 3: Move the files to your local _collection.media_ directory

After you download the above files, you will need to move them to your local Anki `collection.media` directory [[ref](https://docs.ankiweb.net/files.html#file-locations)]:

| OS          | Location                                                           |
| ----------- | ------------------------------------------------------------------ |
| **macOS**   | `~/Library/Application Support/Anki2/[username]/collection.media/` |
| **Windows** | `APPDATA\Anki2\[username]\collection.media\`                       |
| **Linux**   | `~/.local/share/Anki2/[username]/collection.media/`                |

> _Note: `[username]` is your Anki profile name. The default profile name is `User 1`._

<!--
### Step 4: Sync the files to use on all devices
-->

## Usage

### Advanced Typed Inputs

For the Advanced Typed Inputs to work, you must add two things inside the Anki app:

1. You must add the card **fields** you want to use. For example, I use the following fields:

   ```markdown
   Question
   Answer
   Type Hint
   Compare
   Bonus Question
   Bonus Type Hint
   Bonus Compare
   Notes
   ```

2. You need to add HTML (templates provided) to your **Note Types** created under the `Anki > Tools > Manage Note Types` menu. The field names must match what you created above and you must include the script to calls the `_global.min.js` file.

You can use the default template files found below if you are using the fields above. Otherwise, you will need to make modifications to those templates.

| HTML Template Files                                                                                       | Purpose                                                                |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [/assets/note-types/\*.html](https://github.com/jacobcassidy/anki-global-kit/tree/main/assets/note-types) | Use in the Anki app under the `Anki > Tools > Manage Note Types` menu. |

### Global Card Styles

For the Global Card Styles to work, you must add two things inside the Anki app:

1. In the card's styling section, you need to the stylesheet imports for the global files.
2. In the same section, you need to add any overrides you want for that specific card type (aka note type).

You can use the default CSS templates I use and customize them however you see fit...

TO BE UPDATED

<!-- | CSS Template Files | Purpose |
| -- | -- |
| [/assets/card-styles/*.css](https://github.com/jacobcassidy/anki-global-kit/tree/main/assets/card-styles) | Use for card styling Note Types. | -->

<!-- TODO: ADD...

- Advance type [PHP Example]
- Cloze type [JavaScript Example]

### How to Use The Advance Typed Inputs

### How to Use the Advance Comparison Answers

 ### How to Use The Global Card Designs

- CSS, Git, HTML, JavaScript, NodeJS, PHP, Python, React, Ruby, WordPress

- Using nightmode? Here's how to style your cards
-->

## FAQ

### What is Anki?

If you're unfamiliar with [Anki](https://apps.ankiweb.net/), in a nutshell, it's an open-source digital flashcard system that uses [spaced repetition](https://en.wikipedia.org/wiki/Spaced_repetition) to help you retain knowledge in your long-term memory.

Anki apps are available for the following:

| Device                                                                          | OS                     | Type   |
| ------------------------------------------------------------------------------- | ---------------------- | ------ |
| [AnkiPC](https://apps.ankiweb.net/)                                             | Windows, Mac, or Linux | _Free_ |
| [AnkiWeb](https://ankiweb.net)                                                  | Web                    | _Free_ |
| [AnkiMobile](https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387) | iOS & iPadOS           | _Paid_ |
| [AnkiDroid](https://play.google.com/store/apps/details?id=com.ichi2.anki)       | Android                | _Free_ |

### Why not create an Anki plugin to release the Anki Global Extension?

Anki plugins only work with the AnkiPC app and are incompatible across other devices. If that changes, please let me know by opening an [issue](https://github.com/jacobcassidy/anki-global-kit/issues).

### Why are the files in the collection.media directory prefixed with an underscore?

Anki has a [Check Media](https://docs.ankiweb.net/media.html#checking-media) feature, which can delete unused media files not contained in any cards. Adding the leading underscore, such as `_global.min.js`, makes Anki ignore that file so it won't be deleted when using the Check Media feature.

## Changelog

View the [Changelog](https://github.com/jacobcassidy/anki-global-kit/blob/main/CHANGELOG.md) to see the latest updates. Currently, you will need to manually copy/paste any changes you want to your local Anki files, then sync the changes through your AnkiPC app.

## Issues

If you come across any issues, please [report them here](https://github.com/jacobcassidy/anki-global-kit/issues).

## UNRELEASED

| Language     | Hue Value |
| ------------ | --------- |
| RUBY         | 25        |
| GIT          | 30        |
| SWIFT        | 35        |
| HTML         | 40        |
| RUST         | 45        |
| SQL          | 50        |
| JAVASCRIPT   | 100       |
| COMMAND LINE | 130       |
| NODE         | 140       |
| GSAP         | 145       |
| REACT        | 215       |
| GO           | 225       |
| PERL         | 235       |
| PYTHON       | 245       |
| C            | 250       |
| C++          | 255       |
| TYPESCRIPT   | 260       |
| WORDPRESS    | 270       |
| PHP          | 275       |
| C#           | 280       |
| CSS          | 300       |
| REGEX        | 315       |
