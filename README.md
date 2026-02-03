<div align="center">

# 🎨 CLI Logo Generator

**Transform any image into stunning ASCII art for your CLI tools**

Create beautiful terminal banners like Claude Code, GitHub Copilot CLI, and Gemini CLI.

[![npm version](https://img.shields.io/npm/v/cli-logo-generator.svg)](https://www.npmjs.com/package/cli-logo-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```
        ██████████████
     ████████████████████
    ██████████████████████
   ████████████████████████
    ██████████████████████
     ████████████████████
        ██████████████

   MyCLI v1.0.0
   Your awesome CLI tool
```

[Installation](#installation) •
[Quick Start](#quick-start) •
[Commands](#commands) •
[Examples](#examples) •
[Options](#options)

</div>

---

## ✨ Features

- 🖼️ **Image to ASCII** - Convert any image (PNG, JPG, etc.) to ASCII art
- 🌈 **True Color Support** - 24-bit color, 256 color, or monochrome output
- 🔲 **Transparency Support** - Handles transparent PNGs perfectly
- 🎯 **White Background Removal** - Treat white backgrounds as transparent
- 📦 **CLI Wrapper Generator** - Create branded shell wrappers instantly
- ⚡ **Multiple Output Formats** - Bash scripts, Node.js modules, or raw ASCII

## Installation

```bash
npm install -g cli-logo-generator
```

Or use with npx:
```bash
npx cli-logo-generator ./logo.png
```

## Quick Start

### 1. Preview your logo as ASCII art

```bash
cli-logo ./logo.png
```

### 2. Create a branded CLI wrapper

```bash
cli-logo init ./logo.png mycli -t "My Awesome CLI" --subtitle "v1.0.0"
```

### 3. Run your new CLI!

```bash
./mycli.sh              # Shows banner, drops into shell
./mycli.sh git status   # Shows banner, runs command
```

### 4. Install globally (optional)

```bash
sudo cp mycli.sh /usr/local/bin/mycli
mycli   # Works from anywhere!
```

## Commands

### `cli-logo [convert] <image>`

Convert an image to ASCII art. The `convert` keyword is optional.

```bash
# Basic conversion
cli-logo ./logo.png

# Customize output
cli-logo ./logo.png -w 60 -c truecolor -t "My App" -v "2.0.0"

# Remove white background
cli-logo ./logo.png -b

# Generate reusable JavaScript module
cli-logo ./logo.png --code -o banner.js
```

### `cli-logo init <image> <name>`

Generate a complete CLI wrapper with your branding.

```bash
# Creates both mycli.sh and mycli.js
cli-logo init ./logo.png mycli -t "MyCLI" -v "1.0.0"

# Bash only
cli-logo init ./logo.png mycli --type bash

# Node.js only  
cli-logo init ./logo.png mycli --type node

# Custom shell
cli-logo init ./logo.png mycli --shell /bin/zsh
```

## Examples

### Create a development environment CLI

```bash
cli-logo init ./company-logo.png devbox \
  -t "DevBox" \
  -v "3.0.0" \
  --subtitle "Your development environment" \
  -w 50 \
  -b

sudo cp devbox.sh /usr/local/bin/devbox
```

Now when you run `devbox`:

```
     ████████████████████
   ██████████████████████████
  ████████████████████████████
  ████████  ████████  ████████
  ████████████████████████████
   ██████████████████████████
     ████████████████████

DevBox v3.0.0
Your development environment

$ █
```

### Generate a banner module for your Node.js CLI

```bash
cli-logo ./logo.png -w 40 --code -o src/banner.js
```

Then in your app:

```javascript
const { showBanner } = require('./banner.js');

showBanner();
// Your CLI logic...
```

### Compare character sets

```bash
# Blocks (default) - best for most logos
cli-logo ./logo.png -s blocks

# Simple - cleaner look
cli-logo ./logo.png -s simple

# Detailed - more gradients  
cli-logo ./logo.png -s detailed
```

## Options

### Convert Options

| Option | Description | Default |
|--------|-------------|---------|
| `-w, --width <n>` | Width in characters | `60` |
| `-c, --color <mode>` | `none`, `256`, `truecolor` | `truecolor` |
| `-s, --charset <set>` | `blocks`, `simple`, `detailed` | `blocks` |
| `-i, --invert` | Invert brightness | `false` |
| `-b, --bg-transparent` | Treat white as transparent | `false` |
| `--bg-threshold <n>` | White threshold (0-255) | `250` |
| `-t, --title <text>` | Title below logo | - |
| `-v, --ver <version>` | Version string | - |
| `--subtitle <text>` | Subtitle text | - |
| `-o, --output <file>` | Save to file | - |
| `--code` | Generate JS module | `false` |

### Init Options

| Option | Description | Default |
|--------|-------------|---------|
| `-w, --width <n>` | Width in characters | `50` |
| `-c, --color <mode>` | `none`, `256`, `truecolor` | `truecolor` |
| `-t, --title <text>` | Title (defaults to name) | - |
| `-v, --ver <version>` | Version string | `1.0.0` |
| `--subtitle <text>` | Subtitle text | - |
| `--type <type>` | `bash`, `node`, `both` | `both` |
| `--shell <path>` | Shell to use | `$SHELL` |
| `-d, --dir <directory>` | Output directory | `.` |
| `-b, --bg-transparent` | Treat white as transparent | `false` |

## Tips & Tricks

### 🎯 Best Results

- Use **transparent PNGs** when possible
- Use `-b` flag for images with white backgrounds
- Width of **40-60 characters** works best
- `blocks` charset gives the best results for most logos

### 🔧 Troubleshooting

**Logo looks inverted?**
```bash
cli-logo ./logo.png -i
```

**White background showing?**
```bash
cli-logo ./logo.png -b
```

**Colors not showing?**
Your terminal might not support truecolor. Try:
```bash
cli-logo ./logo.png -c 256
# or
cli-logo ./logo.png -c none
```

## How It Works

1. **Load Image** - Uses [sharp](https://sharp.pixelplumbing.com/) for fast image processing
2. **Resize** - Scales to target width, adjusting height for terminal aspect ratio
3. **Map Pixels** - Converts each pixel to an ASCII character based on brightness
4. **Apply Color** - Adds ANSI escape codes for terminal colors
5. **Generate Wrapper** - Creates executable scripts that display the banner

## Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests

## License

MIT © 2024

---

<div align="center">

Made with ❤️ for CLI enthusiasts

**[⬆ Back to top](#-cli-logo-generator)**

</div>
