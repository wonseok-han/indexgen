# indexgen

A universal tool that automatically scans folders to generate `index.ts` files.

## 🚀 Quick Start

```bash
# Install package
npm install indexgen

# CLI usage (required: --paths option)
npx indexgen --paths=src/components/**

# CLI usage (watch mode)
npx indexgen --paths=src/components/** --watch

# Config file based usage
npx indexgen --watch

# Show help
npx indexgen --help
```

## Installation

```bash
npm install indexgen
```

## Usage

### 1. CLI-based Usage

```bash
# Basic usage (--paths is required)
indexgen --paths=src/components/**

# Multiple paths
indexgen --paths=src/components/**,src/hooks/**

# Watch mode (auto-update on file changes)
indexgen --paths=src/components/** --watch

# Output filename
indexgen --paths=src/components/** --outputFile=exports.ts

# File extensions
indexgen --paths=src/components/** --fileExtensions=.tsx,.ts

# Exclude file patterns
indexgen --paths=src/components/** --excludes=*.d.ts,*.test.ts

# Export style
indexgen --paths=src/components/** --exportStyle=named

# Naming convention
indexgen --paths=src/components/** --namingConvention=PascalCase

# Include extension
indexgen --paths=src/components/** --fromWithExtension=false
```

### 2. Config File Based Usage

You can use it simply after creating a config file:

```bash
# Config file based watch mode
indexgen --watch

# Override config with CLI options
indexgen --paths=src/components/** --watch --exportStyle=named

### 3. CLI Options

```bash
# Help
indexgen --help

indexgen - A tool that automatically scans folders to generate index.ts files

Usage:
  indexgen --paths=<path1,path2> [options]

Required Options:
  --paths=<path1,path2>   Folder paths to process (multiple paths can be specified with commas)

General Options:
  --outputFile=<filename>  Name of the index.ts file to generate (default: index.ts)
  --fileExtensions=<ext>   File extensions to watch (e.g., .tsx,.ts)
  --excludes=<pattern1,pattern2> File patterns to exclude (e.g., *.d.ts,*.png)
  --exportStyle=<style>    Export style to generate (default, named, star, star-as, mixed, auto)
  --namingConvention=<rule> Filename conversion rule (camelCase, original, PascalCase)
  --fromWithExtension=<true|false> Include file extension in file path (default: false)

Logging Options:
  --log=<true|false>      Enable/disable log output (default: true)

Mode Options:
  --watch                 Enable watch mode
  -h, --help             Show this help message

Examples:
  indexgen --paths=src/components/**
  indexgen --paths=src/components/**,src/**/ui/** --watch --exportStyle=named
  indexgen --paths=src/components/** --log=false --debug=true
  indexgen --watch
```

## Configuration Options

### Using Config Files

Like ESLint or Prettier, it uses a separate configuration file:

#### 1. JSON Config File (`.indexgenrc`)

Create a `.indexgenrc` file in the project root:

```json
{
  "targets": [
    {
      "paths": ["src/components", "src/app/**/components"],
      "fileExtensions": [".tsx", ".ts", ".jsx", ".js"],
      "outputFile": "index.ts",
      "exportStyle": "named",
      "namingConvention": "PascalCase",
      "excludes": ["*.d.ts", "*.test.ts", "*.stories.ts"]
    },
    {
      "paths": ["src/hooks"],
      "fileExtensions": [".tsx", ".ts", ".jsx", ".js"],
      "outputFile": "index.ts",
      "exportStyle": "named",
      "namingConvention": "camelCase",
      "excludes": ["*.d.ts"]
    },
    {
      "paths": ["public/assets/icons"],
      "fileExtensions": [".svg"],
      "outputFile": "index.ts",
      "exportStyle": "named",
      "namingConvention": "PascalCase",
      "fromWithExtension": true,
      "excludes": ["*.png", "*.jpg", "*.gif"]
    }
  ]
}
```

#### 2. JavaScript Config File (`indexgen.config.js`)

You can use a JavaScript file for more complex configurations or dynamic settings:

```javascript
module.exports = {
  targets: [
    {
      paths: ['src/components', 'src/app/**/components'],
      fileExtensions: ['.tsx', '.ts', '.jsx', '.js'],
      outputFile: 'index.ts',
      exportStyle: 'named',
      namingConvention: 'PascalCase',
      excludes: ['*.d.ts', '*.test.ts', '*.stories.ts'],
    },
  ],
};
```

#### 3. Supported Config File Formats

Configuration files are searched in the following order:

1. `.indexgenrc` (JSON)
2. `.indexgenrc.json` (JSON)
3. `indexgen.config.js` (CommonJS)
4. `indexgen.config.mjs` (ES Module)
5. `indexgen.config.ts` (TypeScript)

### Configuration Options Description

| Option    | Type       | Default | Description                                                    |
| --------- | ---------- | ------- | -------------------------------------------------------------- |
| `targets` | `Target[]` | -       | Targets to process                                             |
| `log`     | `boolean`  | `true`  | Whether to output general logs (console.log, console.error, console.warn) |

### Target Options

| Option              | Type                                                               | Default                          | Description                      |
| ------------------- | ------------------------------------------------------------------ | -------------------------------- | --------------------------------- |
| `paths`             | `string[]`                                                         | -                                | Paths to process (glob patterns supported) |
| `fileExtensions`    | `string[]`                                                         | `[".tsx", ".ts", ".jsx", ".js"]` | File extensions to process        |
| `outputFile`        | `string`                                                           | `"index.ts"`                     | Output filename                   |
| `exportStyle`       | `"default" \| "named" \| "star" \| "star-as" \| "mixed" \| "auto"` | `"auto"`                         | Export processing method          |
| `namingConvention`  | `"camelCase" \| "PascalCase" \| "original"`                        | `"original"`                     | Naming conversion rule            |
| `fromWithExtension` | `boolean`                                                          | `false`                          | Whether to include file extension in from path |
| `excludes`          | `string[]`                                                         | `[]`                             | File patterns to exclude          |

### Export Style Options

| Style     | Description                | Example                                                               |
| --------- | -------------------------- | --------------------------------------------------------------------- |
| `default` | Default export only        | `export { default } from './Component';`                              |
| `named`   | Convert default to named   | `export { default as Component } from './Component';`                 |
| `star`    | Use export \*              | `export * from './Component';`                                        |
| `star-as` | Use export \* as           | `export * as Component from './Component';`                           |
| `mixed`   | Default and named in one line | `export { default as Component, named1, named2 } from './Component';` |
| `auto`    | Auto-determine based on file content | Analyze file content and select appropriate style                     |

#### Mixed Style Detailed Description

The `mixed` style analyzes file content and works as follows:

- **When default export exists**: `export { default as [Alias], [named1], [named2] } from './path';`
- **When no default export**: `export { [named1], [named2] } from './path';`

**Examples**:

```typescript
// Button.tsx (with default export)
export default function Button() { ... }
export const ButtonGroup = () => { ... }
export const ButtonSize = { ... }

// Generated index.ts
export { default as Button, ButtonGroup, ButtonSize } from './Button';

// utils.ts (no default export)
export const formatDate = () => { ... }
export const parseDate = () => { ... }

// Generated index.ts
export { formatDate, parseDate } from './utils';
```

### Naming Convention Examples

**Filename**: `user-profile.tsx`

| namingConvention | Result         | Description              |
| ---------------- | -------------- | ------------------------ |
| `original`       | `user_profile` | Default, keep original filename |
| `PascalCase`     | `UserProfile`  | For React components     |
| `camelCase`      | `userProfile`  | For utility functions    |

### fromWithExtension Option Examples

**Filename**: `icon-logo.svg`

| fromWithExtension | Result                                                   |
| ----------------- | -------------------------------------------------------- |
| `false`           | `export { default as IconLogo } from './icon-logo';`     |
| `true`            | `export { default as IconLogo } from './icon-logo.svg';` |

### Excludes Option Examples

**Patterns**: `*.d.ts, *.test.ts, *.png`

| Pattern     | Description               |
| ----------- | ------------------------- |
| `*.d.ts`    | Exclude TypeScript declaration files |
| `*.test.ts` | Exclude test files        |
| `*.png`     | Exclude PNG image files   |

### Logging Configuration

You can control console output with the `log` option:

```json
{
  "log": true,    // General logs (console.log, console.error, console.warn)
  "targets": [...]
}
```

**Logging Levels**:

- **`log: true`**: Output general task progress, errors, and warning messages
- **`log: false`**: Disable all general logs

**Usage Examples**:

```bash
# Disable logs
indexgen --paths=src/components --log=false

# Disable all logs
indexgen --paths=src/components --log=false
```

## Examples

### Component Folder Structure

```
src/components/
├── Button.tsx
├── Input.tsx
├── Modal.tsx
└── index.ts (auto-generated)
```

### Generated index.ts

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
```

### SVG File Folder Structure

```
public/assets/icons/
├── icon-logo.svg
├── icon-menu.svg
└── index.ts (auto-generated)
```

### Generated index.ts (fromWithExtension: true)

```typescript
export { default as IconLogo } from './icon-logo.svg';
export { default as IconMenu } from './icon-menu.svg';
```

## Configuration

### Creating Config Files

Create configuration files in the project root:

```bash
# Create JSON config file
cp .indexgenrc.example .indexgenrc

# Or create JavaScript config file
cp indexgen.config.js.example indexgen.config.js
```

### Adding Scripts to package.json

```json
{
  "scripts": {
    "generate:index": "indexgen --paths=src/components/**",
    "dev": "indexgen --watch"
  }
}
```

### Auto-detection During Development

```json
{
  "scripts": {
    "dev:watch": "indexgen --watch"
  }
}
```

## Operation Modes

### 1. CLI-only Mode (`cli-only`)

- When `--paths` option is provided and no config file exists
- Operates only with CLI options

### 2. Config-based Mode (`config-based`)

- When no `--paths` option is provided and config file exists
- Operates only with config file settings

### 3. Hybrid Mode (`hybrid`)

- When both `--paths` option is provided and config file exists
- CLI options override config file settings

## Notes

- The `--paths` option is required when using CLI
- Files specified in `outputFile` are automatically excluded to prevent infinite loops
- `excludes` patterns support glob patterns (`*.d.ts`, `*test*`, etc.)
- The `paths` field is required when using config files
