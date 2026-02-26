#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// STRICT Tailwind-only class patterns (NOT Bootstrap)
// Bootstrap uses: justify-content-*, align-items-*, d-*, p-1-5, m-1-5, text-{semantic}, bg-{semantic}
// Tailwind uses: flex, items-*, justify-*, p-6+, m-6+, text-{color}-{shade}, bg-{color}-{shade}

const TAILWIND_ONLY = [
  // Display values
  /^(flex|inline-flex|grid|inline-grid|contents|hidden|block|inline-block|inline|table-auto|table-fixed)$/,
  /^(absolute|relative|fixed|sticky|static|isolate|isolation-auto)$/,
  
  // Text transformations
  /^(truncate|antialiased|subpixel-antialiased|italic|not-italic)$/,
  /^(uppercase|lowercase|capitalize|normal-case|ordinal|tabular-nums|proportional-nums)$/,
  /^(underline|overline|line-through|no-underline)$/,
  /^(decoration-solid|decoration-double|decoration-dotted|decoration-dashed|decoration-wavy)$/,
  
  // Transform
  /^(transform|backface-visible|backface-hidden)$/,
  
  // Accessibility
  /^(sr-only|not-sr-only|appearance-none|outline-none)$/,
  
  // Animation & transitions
  /^(transition|resize|resize-x|resize-y|resize-none)$/,
  /^(transition-all|transition-colors|transition-opacity|transition-shadow|transition-transform|transition-none)$/,
  /^duration-(75|100|150|200|300|500|700|1000)$/,
  /^ease-(linear|in|out|in-out)$/,
  /^delay-(75|100|150|200|300|500|700|1000)$/,
  /^animate-(none|spin|ping|pulse|bounce)$/,
  
  // Flex - STRICTLY Tailwind patterns (NOT justify-content-*, align-items-*)
  /^flex-(col|row|wrap|nowrap|1|auto|none|grow|shrink|grow-0|shrink-0)$/,
  /^flex$/, // bare flex
  
  // Grid
  /^(grid-cols-|grid-rows-|col-span-|col-start-|col-end-|row-span-|row-start-|row-end-|auto-cols-|auto-rows-)/,
  
  // Items & justify (Tailwind only - NOT align-items-* or justify-content-*)
  /^items-(start|end|center|baseline|stretch)$/,
  /^justify-(start|end|center|between|around|evenly)$/,
  /^self-(start|end|center|auto|stretch)$/,
  /^place-(content-center|content-start|content-end|content-between|content-around|content-evenly|items-center|items-start|items-end|items-baseline|items-stretch|self-center|self-start|self-end|self-auto|self-stretch)$/,
  
  // Gap - ONLY non-Bootstrap values (Bootstrap has gap-2)
  /^gap-(0\.5|1\.5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|\[)/,
  /^(gap-x-|gap-y-|space-x-|space-y-)/,
  
  // Sizing
  /^(w-|h-|min-w-|min-h-|max-w-|max-h-|size-)/,
  
  // Spacing - ONLY Tailwind values (NOT 0-5 which are Bootstrap)
  /^(p-|px-|py-|pt-|pb-|pl-|pr-|ps-|pe-)(0\.5|1\.5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|\[)/,
  /^(m-|mx-|my-|mt-|mb-|ml-|mr-|ms-|me-)(0\.5|1\.5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|\[)/,
  
  // Position
  /^(inset-|top-|right-|bottom-|left-|z-)/,
  
  // Overflow
  /^(overflow-|overflow-x-|overflow-y-)/,
  
  // Text - ONLY Tailwind sizes and colors (NOT text-muted, text-primary, etc)
  /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
  /^text-(left|right|center|justify|ellipsis|clip|balance|wrap|nowrap|pretty)$/,
  /^text-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current|inherit)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  
  // Background - ONLY Tailwind colors
  /^bg-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current|inherit)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  /^bg-opacity-/,
  
  // Border - ONLY Tailwind patterns
  /^border-(0|2|4|8|t|b|l|r|x|y|dashed|dotted|solid|none|collapse|separate)$/,
  /^border-spacing-/,
  /^border-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current|inherit)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  
  // Border radius
  /^rounded-(none|sm|md|lg|xl|2xl|3xl|full)/,
  /^rounded-(t|b|l|r|tl|tr|bl|br|ss|se|ee|es)-/,
  
  // Shadow
  /^shadow-(sm|md|lg|xl|2xl|inner|none)$/,
  
  // Opacity
  /^opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100|\[)/,
  
  // Typography
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|mono|sans|serif)$/,
  /^leading-(none|tight|snug|normal|relaxed|loose|3|4|5|6|7|8|9|10)$/,
  /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
  /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/,
  /^break-(normal|words|all|keep)$/,
  /^line-clamp-(1|2|3|4|5|6|none)$/,
  
  // Cursor and interaction
  /^cursor-(pointer|default|not-allowed|wait|text|move|grab|grabbing|help|crosshair|zoom-in|zoom-out|auto|none|\[)/,
  /^pointer-events-(none|auto)$/,
  /^select-(none|text|all|auto)$/,
  
  // Transform utilities
  /^scale-(0|50|75|90|95|100|105|110|125|150)$/,
  /^scale-(x-|y-)/,
  /^rotate-(0|1|2|3|6|12|45|90|180)$/,
  /^translate-(x-|y-)/,
  /^skew-(x-|y-)/,
  /^origin-(center|top|top-right|top-left|bottom|bottom-right|bottom-left|right|left)$/,
  
  // Ring
  /^ring-(0|1|2|4|8|inset)/,
  /^ring-offset-/,
  /^ring-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  
  // Divide
  /^divide-(x|y|x-0|x-2|x-4|x-8|y-0|y-2|y-4|y-8|solid|dashed|dotted|none)$/,
  /^divide-opacity-/,
  /^divide-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  
  // Other utilities
  /^(aspect-auto|aspect-square|aspect-video)$/,
  /^(object-contain|object-cover|object-fill|object-none|object-scale-down|object-center|object-top|object-right|object-bottom|object-left)$/,
  /^(backdrop-blur|backdrop-brightness|backdrop-contrast|backdrop-grayscale|backdrop-invert|backdrop-saturate|backdrop-sepia|backdrop-hue-rotate)-/,
  /^(blur|brightness|contrast|grayscale|invert|saturate|sepia|hue-rotate)(-|$)/,
  /^(scroll-m-|scroll-p-|scroll-auto|scroll-smooth)$/,
  /^(snap-start|snap-end|snap-center|snap-align-none|snap-normal|snap-always|snap-none|snap-x|snap-y|snap-both|snap-mandatory|snap-proximity)$/,
  /^(accent-|caret-|fill-|stroke-|will-change-)./,
  /^(content-none|content-\[)./,
  /^(decoration-auto|decoration-from-font|decoration-clone|decoration-0|decoration-1|decoration-2|decoration-4|decoration-8)$/,
  /^(decoration-|decoration-\[)/,
  /^(indent-|indent-\[)/,
  /^align-(baseline|top|middle|bottom|text-top|text-bottom|sub|super)$/,
];

// Bootstrap/CoreUI semantic colors to SKIP
const SKIP_PATTERNS = [
  /^(bg|text|border)-(primary|secondary|success|danger|warning|info|light|dark|body|muted|white)$/,
  /^text-(muted|primary|secondary|success|danger|warning|info|white|dark|light|body|center|start|end)$/,
  /^(justify-content|align-items|d-flex|d-inline-flex|d-grid|d-block|d-inline|p-[0-5]$|m-[0-5]$|mb-[0-5]$|mt-[0-5]$|ml-[0-5]$|mr-[0-5]$)/,
];

function isTailwindClass(className) {
  // Skip Bootstrap/CoreUI patterns explicitly
  if (SKIP_PATTERNS.some(p => p.test(className))) {
    return false;
  }

  // Check if matches any Tailwind-only pattern
  return TAILWIND_ONLY.some(p => p.test(className));
}

function prefixClasses(classString) {
  if (!classString) return classString;
  
  return classString
    .split(/\s+/)
    .map(cls => {
      if (!cls) return cls;
      
      // Handle negative values
      if (cls.startsWith('-')) {
        const rest = cls.slice(1);
        if (isTailwindClass(rest)) {
          return `-tw-${rest}`;
        }
        return cls;
      }
      
      // Handle state/responsive prefixes
      let prefix = '';
      let remainder = cls;
      
      const prefixMatch = cls.match(/^((?:sm|md|lg|xl|2xl|hover|focus|active|disabled|group-hover|group-focus|focus-within|focus-visible|first|last|odd|even|visited|checked|required|invalid|placeholder|file|marker|selection|first-line|first-letter|before|after|open|empty|has|peer-hover|peer-focus|peer-checked|peer-disabled|dark|aria-\w+|data-\w+):)+(.*)$/);
      
      if (prefixMatch) {
        prefix = prefixMatch[1];
        remainder = prefixMatch[2];
      }
      
      if (isTailwindClass(remainder) || remainder.includes('[')) {
        return `${prefix}tw-${remainder}`;
      }
      
      return cls;
    })
    .filter(cls => cls)
    .join(' ');
}

function processTemplateString(str) {
  const parts = [];
  let current = '';
  let depth = 0;
  let i = 0;
  
  while (i < str.length) {
    if (str[i] === '$' && str[i + 1] === '{') {
      if (current) {
        parts.push({ type: 'static', content: current });
        current = '';
      }
      
      depth = 0;
      let exprStart = i + 2;
      let j = exprStart;
      
      while (j < str.length) {
        if (str[j] === '{') depth++;
        else if (str[j] === '}') {
          if (depth === 0) break;
          depth--;
        }
        j++;
      }
      
      const exprContent = str.substring(exprStart, j);
      parts.push({ type: 'expr', content: exprContent });
      
      i = j + 1;
    } else {
      current += str[i];
      i++;
    }
  }
  
  if (current) {
    parts.push({ type: 'static', content: current });
  }
  
  const result = parts.map(part => {
    if (part.type === 'static') {
      return prefixClasses(part.content);
    } else {
      const expr = part.content;
      let processed = expr.replace(/(['"])([^'"]*)\1/g, (match, quote, content) => {
        const words = content.split(/\s+/);
        const looksLikeClasses = words.every(w => !w || /^[a-z-0-9\[\]${}]*$/i.test(w));
        
        if (looksLikeClasses && words.some(w => isTailwindClass(w))) {
          const prefixed = prefixClasses(content);
          return `${quote}${prefixed}${quote}`;
        }
        
        return match;
      });
      
      return `\${${processed}}`;
    }
  }).join('');
  
  return result;
}

function processFile(filePath) {
  const ext = path.extname(filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let classCount = 0;

  if (ext === '.css') {
    content = content.replace(/@apply\s+([^;]+);/g, (match, classes) => {
      const prefixed = prefixClasses(classes.trim());
      if (prefixed !== classes.trim()) {
        modified = true;
        classCount++;
      }
      return `@apply ${prefixed};`;
    });
  } else if (['.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
    // 1. Static className="..." 
    content = content.replace(/className=["']([^"']*?)["']/g, (match, classes) => {
      const prefixed = prefixClasses(classes);
      if (prefixed !== classes) {
        modified = true;
        classCount += classes.split(/\s+/).filter(c => c && isTailwindClass(c)).length;
      }
      return `className="${prefixed}"`;
    });

    // 2. className={'...'}
    content = content.replace(/className=\{["']([^"']*?)["']\}/g, (match, classes) => {
      const prefixed = prefixClasses(classes);
      if (prefixed !== classes) {
        modified = true;
        classCount += classes.split(/\s+/).filter(c => c && isTailwindClass(c)).length;
      }
      return `className={'${prefixed}'}`;
    });

    // 3. Template literals
    content = content.replace(/className=\{`([^`]*)`\}/g, (match, templateContent) => {
      const processed = processTemplateString(templateContent);
      if (processed !== templateContent) {
        modified = true;
        classCount += templateContent.split(/\s+/).filter(c => c && isTailwindClass(c) && !c.includes('$')).length;
      }
      return 'className={`' + processed + '`}';
    });

    // 4. clsx/cn/classNames
    content = content.replace(/(clsx|cn|classNames)\s*\(\s*([^)]*)\s*\)/g, (match, func, args) => {
      let processedArgs = args.replace(/(['"])([^'"]*)\1/g, (strMatch, quote, content) => {
        const prefixed = prefixClasses(content);
        if (prefixed !== content) {
          modified = true;
          classCount += content.split(/\s+/).filter(c => c && isTailwindClass(c)).length;
        }
        return `${quote}${prefixed}${quote}`;
      });
      
      return `${func}(${processedArgs})`;
    });
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { modified: true, classCount };
  }

  return { modified: false, classCount: 0 };
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['.git', 'node_modules', '.next', 'dist', 'build', '__pycache__'].includes(file)) {
        walkDir(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  }
}

console.log('🚀 Starting Tailwind prefix migration (v2)...\n');

let filesModified = 0;
let totalClassesPrefixed = 0;

const srcDir = path.join(projectRoot, 'src');

if (fs.existsSync(srcDir)) {
  walkDir(srcDir, (filePath) => {
    const ext = path.extname(filePath);
    if (['.tsx', '.ts', '.jsx', '.js', '.css'].includes(ext)) {
      try {
        const result = processFile(filePath);
        if (result.modified) {
          filesModified++;
          totalClassesPrefixed += result.classCount;
          const relPath = path.relative(projectRoot, filePath);
          console.log(`✅ ${relPath}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }
  });
}

console.log('\n' + '='.repeat(60));
console.log('✨ Migration Complete!');
console.log('='.repeat(60));
console.log(`Files modified: ${filesModified}`);
console.log(`Classes prefixed: ${totalClassesPrefixed}`);
console.log('\n⚠️  Review changes with: git diff src/ | head -200');
