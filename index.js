#!/usr/bin/env node

const { program } = require('commander');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ASCII characters from dark to light
const ASCII_CHARS_DETAILED = '@%#*+=-:. ';
const ASCII_CHARS_SIMPLE = '█▓▒░ ';
const ASCII_CHARS_BLOCKS = '██▓▓▒▒░░  ';

// Convert RGB to ANSI 256 color code
function rgbToAnsi256(r, g, b) {
  // Check for grayscale
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round((r - 8) / 247 * 24) + 232;
  }
  
  const rIdx = Math.round(r / 255 * 5);
  const gIdx = Math.round(g / 255 * 5);
  const bIdx = Math.round(b / 255 * 5);
  
  return 16 + (36 * rIdx) + (6 * gIdx) + bIdx;
}

// Convert RGB to true color ANSI escape
function rgbToAnsiTrue(r, g, b) {
  return '\x1b[38;2;' + r + ';' + g + ';' + b + 'm';
}

// Reset ANSI color
const RESET = '\x1b[0m';

// Flood fill to find background pixels (connected to edges)
function findBackgroundPixels(data, width, height, bgThreshold) {
  const isBackground = new Uint8Array(width * height);
  
  const isBackgroundPixel = (idx) => {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    const a = data[idx * 4 + 3];
    // Transparent pixels or white/near-white pixels count as background
    if (a < 128) return true;
    return r >= bgThreshold && g >= bgThreshold && b >= bgThreshold;
  };

  // BFS from all edge pixels
  const queue = [];
  
  // Add all edge pixels to queue if they're background-like
  for (let x = 0; x < width; x++) {
    if (isBackgroundPixel(x)) { queue.push(x); isBackground[x] = 1; }
    const bottomIdx = (height - 1) * width + x;
    if (isBackgroundPixel(bottomIdx)) { queue.push(bottomIdx); isBackground[bottomIdx] = 1; }
  }
  for (let y = 1; y < height - 1; y++) {
    const leftIdx = y * width;
    if (isBackgroundPixel(leftIdx)) { queue.push(leftIdx); isBackground[leftIdx] = 1; }
    const rightIdx = y * width + width - 1;
    if (isBackgroundPixel(rightIdx)) { queue.push(rightIdx); isBackground[rightIdx] = 1; }
  }

  // BFS flood fill
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % width;
    const y = Math.floor(idx / width);
    
    const neighbors = [
      y > 0 ? idx - width : -1,           // up
      y < height - 1 ? idx + width : -1,  // down
      x > 0 ? idx - 1 : -1,               // left
      x < width - 1 ? idx + 1 : -1,       // right
    ];
    
    for (const nIdx of neighbors) {
      if (nIdx >= 0 && !isBackground[nIdx] && isBackgroundPixel(nIdx)) {
        isBackground[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  return isBackground;
}

async function imageToAscii(imagePath, options = {}) {
  const {
    width = 80,
    colorMode = 'truecolor', // 'none', '256', 'truecolor'
    charset = 'blocks', // 'detailed', 'simple', 'blocks'
    invert = false,
    bgTransparent = false, // Treat white/near-white as transparent
    bgThreshold = 250, // Threshold for "white" (0-255)
  } = options;

  // Select character set
  let chars;
  switch (charset) {
    case 'detailed':
      chars = ASCII_CHARS_DETAILED;
      break;
    case 'simple':
      chars = ASCII_CHARS_SIMPLE;
      break;
    case 'blocks':
    default:
      chars = ASCII_CHARS_BLOCKS;
  }

  if (invert) {
    chars = chars.split('').reverse().join('');
  }

  // Load and resize image
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  // Calculate height maintaining aspect ratio (terminal chars are ~2x tall as wide)
  const aspectRatio = metadata.height / metadata.width;
  const height = Math.round(width * aspectRatio * 0.5);

  // Resize and get raw pixel data
  const { data, info } = await image
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Pre-compute background pixels if bgTransparent is enabled
  let backgroundPixels = null;
  if (bgTransparent) {
    backgroundPixels = findBackgroundPixels(data, info.width, info.height, bgThreshold);
  }

  let result = '';
  
  for (let y = 0; y < info.height; y++) {
    let line = '';
    
    for (let x = 0; x < info.width; x++) {
      const pixelIdx = y * info.width + x;
      const idx = pixelIdx * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Handle transparency
      if (a < 128) {
        line += RESET + ' ';
        continue;
      }

      // Handle background (only edge-connected white regions)
      if (bgTransparent && backgroundPixels[pixelIdx]) {
        line += RESET + ' ';
        continue;
      }

      // Calculate brightness (0-1)
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Map brightness to character
      const charIdx = Math.floor((1 - brightness) * (chars.length - 1));
      const char = chars[charIdx];

      // Apply color if enabled
      if (colorMode === 'truecolor') {
        line += rgbToAnsiTrue(r, g, b) + char + RESET;
      } else if (colorMode === '256') {
        const colorCode = rgbToAnsi256(r, g, b);
        line += `\x1b[38;5;${colorCode}m${char}${RESET}`;
      } else {
        line += char;
      }
    }
    
    result += line + '\n';
  }

  return result;
}

// Generate a complete CLI banner with the logo
function generateBanner(asciiArt, options = {}) {
  const {
    title = '',
    subtitle = '',
    version = '',
    borderColor = '\x1b[36m', // Cyan
  } = options;

  let banner = '\n';
  banner += asciiArt;
  
  if (title) {
    banner += '\n';
    banner += `${borderColor}${title}${RESET}`;
    if (version) {
      banner += ` \x1b[90mv${version}${RESET}`;
    }
    banner += '\n';
  }
  
  if (subtitle) {
    banner += `\x1b[90m${subtitle}${RESET}\n`;
  }
  
  banner += '\n';
  
  return banner;
}

// Generate JavaScript code that can be used in other CLI apps
function generateCode(asciiArt, options = {}) {
  const { title = 'My CLI', version = '1.0.0', subtitle = '' } = options;
  
  const escapedArt = asciiArt
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `// Generated by cli-logo-generator
// Copy this to your CLI app to display the logo

const LOGO = \`${escapedArt}\`;

function showBanner() {
  console.log(LOGO);
  console.log('\\x1b[36m${title}\\x1b[0m \\x1b[90mv${version}\\x1b[0m');
  ${subtitle ? `console.log('\\x1b[90m${subtitle}\\x1b[0m');` : ''}
  console.log();
}

module.exports = { LOGO, showBanner };

// Run directly to test
if (require.main === module) {
  showBanner();
}
`;
}

// Generate a shell wrapper script
function generateShellWrapper(asciiArt, options = {}) {
  const { 
    title = '', 
    version = '', 
    subtitle = '',
    shell = process.env.SHELL || '/bin/bash',
    name = 'mycli'
  } = options;

  // Escape for shell
  const escapedArt = asciiArt
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/\$/g, '\\$');

  let script = `#!/bin/bash
# Generated by cli-logo-generator
# A branded CLI wrapper for ${name}

show_banner() {
  echo '${escapedArt}'
`;

  if (title) {
    if (version) {
      script += `  echo -e '\\033[36m${title}\\033[0m \\033[90mv${version}\\033[0m'\n`;
    } else {
      script += `  echo -e '\\033[36m${title}\\033[0m'\n`;
    }
  }

  if (subtitle) {
    script += `  echo -e '\\033[90m${subtitle}\\033[0m'\n`;
  }

  script += `  echo
}

# Show banner on startup
show_banner

# Execute remaining arguments or start interactive shell
if [ $# -gt 0 ]; then
  exec "$@"
else
  exec ${shell}
fi
`;

  return script;
}

// Generate a Node.js CLI wrapper
function generateNodeWrapper(asciiArt, options = {}) {
  const { 
    title = 'My CLI', 
    version = '1.0.0', 
    subtitle = '',
    name = 'mycli'
  } = options;

  const escapedArt = asciiArt
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `#!/usr/bin/env node
// Generated by cli-logo-generator
// A branded CLI wrapper: ${name}

const { spawn } = require('child_process');
const readline = require('readline');

const LOGO = \`${escapedArt}\`;
const TITLE = '${title}';
const VERSION = '${version}';
const SUBTITLE = '${subtitle}';
const SHELL = process.env.SHELL || '/bin/bash';

function showBanner() {
  console.log(LOGO);
  if (TITLE) {
    process.stdout.write('\\x1b[36m' + TITLE + '\\x1b[0m');
    if (VERSION) process.stdout.write(' \\x1b[90mv' + VERSION + '\\x1b[0m');
    console.log();
  }
  if (SUBTITLE) console.log('\\x1b[90m' + SUBTITLE + '\\x1b[0m');
  console.log();
}

function main() {
  showBanner();

  // If arguments provided, run as command
  if (process.argv.length > 2) {
    const cmd = process.argv.slice(2).join(' ');
    const child = spawn(cmd, {
      stdio: 'inherit',
      shell: true
    });
    child.on('exit', (code) => process.exit(code || 0));
    return;
  }

  // Start interactive shell
  const child = spawn(SHELL, [], {
    stdio: 'inherit'
  });

  child.on('exit', (code) => process.exit(code || 0));
}

main();
`;
}

// Main CLI
program
  .name('cli-logo')
  .description('Convert images to ASCII art for CLI branding')
  .version('1.0.0');

// Default command - convert image to ASCII
program
  .command('convert', { isDefault: true })
  .description('Convert an image to ASCII art')
  .argument('<image>', 'Path to the image file')
  .option('-w, --width <number>', 'Width in characters', '60')
  .option('-c, --color <mode>', 'Color mode: none, 256, truecolor', 'truecolor')
  .option('-s, --charset <set>', 'Character set: detailed, simple, blocks', 'blocks')
  .option('-i, --invert', 'Invert brightness mapping')
  .option('-b, --bg-transparent', 'Treat white background as transparent')
  .option('--bg-threshold <number>', 'White threshold (0-255)', '250')
  .option('-t, --title <text>', 'Add a title below the logo')
  .option('-v, --ver <version>', 'Version to display with title')
  .option('--subtitle <text>', 'Subtitle text')
  .option('-o, --output <file>', 'Save output to file')
  .option('--code', 'Generate reusable JavaScript code')
  .action(async (imagePath, opts) => {
    try {
      // Resolve image path
      const resolvedPath = path.resolve(imagePath);
      
      if (!fs.existsSync(resolvedPath)) {
        console.error(`\x1b[31mError: Image not found: ${resolvedPath}\x1b[0m`);
        process.exit(1);
      }

      // Convert image to ASCII
      const asciiArt = await imageToAscii(resolvedPath, {
        width: parseInt(opts.width, 10),
        colorMode: opts.color,
        charset: opts.charset,
        invert: opts.invert,
        bgTransparent: opts.bgTransparent,
        bgThreshold: parseInt(opts.bgThreshold, 10),
      });

      let output;
      
      if (opts.code) {
        // Generate reusable code
        output = generateCode(asciiArt, {
          title: opts.title || 'My CLI',
          version: opts.ver || '1.0.0',
          subtitle: opts.subtitle,
        });
      } else {
        // Generate banner
        output = generateBanner(asciiArt, {
          title: opts.title,
          version: opts.ver,
          subtitle: opts.subtitle,
        });
      }

      if (opts.output) {
        fs.writeFileSync(opts.output, output);
        console.log(`\x1b[32m✓ Saved to ${opts.output}\x1b[0m`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      process.exit(1);
    }
  });

// Init command - create a branded CLI wrapper
program
  .command('init')
  .description('Create a branded CLI wrapper with your logo')
  .argument('<image>', 'Path to the image file')
  .argument('<name>', 'Name for your CLI (used for output file)')
  .option('-w, --width <number>', 'Width in characters', '50')
  .option('-c, --color <mode>', 'Color mode: none, 256, truecolor', 'truecolor')
  .option('-s, --charset <set>', 'Character set: detailed, simple, blocks', 'blocks')
  .option('-i, --invert', 'Invert brightness mapping')
  .option('-b, --bg-transparent', 'Treat white background as transparent')
  .option('--bg-threshold <number>', 'White threshold (0-255)', '250')
  .option('-t, --title <text>', 'Title to display', '')
  .option('-v, --ver <version>', 'Version to display', '1.0.0')
  .option('--subtitle <text>', 'Subtitle text')
  .option('--shell <path>', 'Shell to use (default: $SHELL)')
  .option('--type <type>', 'Wrapper type: bash, node, both', 'both')
  .option('-d, --dir <directory>', 'Output directory', '.')
  .action(async (imagePath, name, opts) => {
    try {
      const resolvedPath = path.resolve(imagePath);
      
      if (!fs.existsSync(resolvedPath)) {
        console.error(`\x1b[31mError: Image not found: ${resolvedPath}\x1b[0m`);
        process.exit(1);
      }

      // Convert image to ASCII
      const asciiArt = await imageToAscii(resolvedPath, {
        width: parseInt(opts.width, 10),
        colorMode: opts.color,
        charset: opts.charset,
        invert: opts.invert,
        bgTransparent: opts.bgTransparent,
        bgThreshold: parseInt(opts.bgThreshold, 10),
      });

      const wrapperOpts = {
        title: opts.title || name,
        version: opts.ver,
        subtitle: opts.subtitle,
        shell: opts.shell || process.env.SHELL || '/bin/bash',
        name: name,
      };

      const outputDir = path.resolve(opts.dir);

      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const types = opts.type === 'both' ? ['bash', 'node'] : [opts.type];
      const createdFiles = [];

      for (const type of types) {
        let output;
        let ext;

        if (type === 'node') {
          output = generateNodeWrapper(asciiArt, wrapperOpts);
          ext = '.js';
        } else {
          output = generateShellWrapper(asciiArt, wrapperOpts);
          ext = '.sh';
        }

        const outputFile = path.join(outputDir, name + ext);
        fs.writeFileSync(outputFile, output);
        fs.chmodSync(outputFile, '755');
        createdFiles.push({ file: outputFile, ext, type });
        console.log(`\x1b[32m✓ Created ${outputFile}\x1b[0m`);
      }

      console.log();
      console.log('\x1b[36mUsage:\x1b[0m');
      for (const { ext } of createdFiles) {
        console.log(`  ./${name}${ext}              # Start interactive shell with banner`);
        console.log(`  ./${name}${ext} ls -la       # Run a command with banner`);
      }
      console.log();
      console.log('\x1b[36mTo install globally:\x1b[0m');
      const mainFile = createdFiles[0];
      console.log(`  sudo cp ${mainFile.file} /usr/local/bin/${name}`);
      console.log(`  # Then just run: ${name}`);
    } catch (error) {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      process.exit(1);
    }
  });

program.parse();
