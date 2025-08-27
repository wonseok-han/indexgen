import {
  getConfig,
  parseBoolean,
  parseCommaSeparated,
  printHelp,
  setLoggingConfig,
  error,
  log,
} from './utils';
import type { ParsedCliArgs, TargetConfig } from './types';
import { generateIndex, startWatchMode } from './generator';

/**
 * 커맨드 라인 인자를 파싱하여 설정 값을 반환합니다.
 * @param args 커맨드 라인 인자
 * @returns 파싱된 설정 값
 */
export function parseCliArgs(args: string[]): ParsedCliArgs {
  const overrides: Partial<TargetConfig> = {};
  let isWatch = false;
  let isHelp = false;
  let hasConfigOptions = false;
  let logOverride: boolean | undefined;
  let debugOverride: boolean | undefined;

  for (const arg of args) {
    if (arg === '--watch') {
      isWatch = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      isHelp = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const [rawKey, rawVal] = arg.replace(/^--/, '').split('=');
      const key = rawKey?.trim();
      const val = rawVal === undefined ? true : rawVal.trim();

      if (
        [
          'paths',
          'outputFile',
          'fileExtensions',
          'exportStyle',
          'namingConvention',
          'fromWithExtension',
          'excludes',
          'log',
          'debug',
        ].includes(key || '')
      ) {
        hasConfigOptions = true;
      }

      switch (key) {
        case 'paths': {
          const paths =
            typeof val === 'string' ? parseCommaSeparated(val) : undefined;
          if (paths) overrides.paths = paths;
          break;
        }
        case 'outputFile': {
          if (typeof val === 'string' && val) overrides.outputFile = val;
          break;
        }
        case 'fileExtensions': {
          const exts =
            typeof val === 'string' ? parseCommaSeparated(val) : undefined;
          if (exts)
            overrides.fileExtensions = exts.map((ext) =>
              ext.startsWith('.') ? ext : `.${ext}`
            );
          break;
        }
        case 'excludes': {
          const excludes =
            typeof val === 'string' ? parseCommaSeparated(val) : undefined;
          if (excludes) overrides.excludes = excludes;
          break;
        }
        case 'exportStyle': {
          if (typeof val === 'string' && val)
            overrides.exportStyle = val as TargetConfig['exportStyle'];
          break;
        }
        case 'namingConvention': {
          if (typeof val === 'string' && val)
            overrides.namingConvention =
              val as TargetConfig['namingConvention'];
          break;
        }
        case 'fromWithExtension': {
          const boolVal = parseBoolean(val);
          if (typeof boolVal === 'boolean')
            overrides.fromWithExtension = boolVal;
          break;
        }
        case 'log': {
          const boolVal = parseBoolean(val);
          if (typeof boolVal === 'boolean') {
            logOverride = boolVal;
          }
          break;
        }
        case 'debug': {
          const boolVal = parseBoolean(val);
          if (typeof boolVal === 'boolean') {
            debugOverride = boolVal;
          }
          break;
        }
        default: {
          printHelp();
          process.exit(1);
        }
      }
    }
  }

  let mode: ParsedCliArgs['mode'];

  const config = getConfig();
  const hasPackageConfig =
    config?.targets &&
    config.targets.length > 0 &&
    config.targets[0]?.paths &&
    config.targets[0]?.paths.length > 0;

  const hasPaths = overrides.paths && overrides.paths.length > 0;

  if (hasPackageConfig && hasPaths && hasConfigOptions) {
    mode = 'hybrid';
  } else if (!hasPackageConfig && hasPaths) {
    mode = 'cli-only';
  } else if (hasPackageConfig) {
    mode = 'config-based';
  } else {
    mode = 'cli-only';
  }

  return { mode, overrides, isWatch, isHelp, logOverride, debugOverride };
}

/**
 * 커맨드 라인 인자를 파싱하여 설정 값을 반환합니다.
 * @returns void
 */
export function runCli(): void {
  const args = process.argv.slice(2);
  const { mode, overrides, isWatch, isHelp, logOverride, debugOverride } =
    parseCliArgs(args);

  if (isHelp) {
    printHelp();
    return;
  }

  if (logOverride !== undefined || debugOverride !== undefined) {
    const currentConfig = getConfig();
    const currentLog = currentConfig?.log ?? true;
    const currentDebug = currentConfig?.debug ?? false;

    const finalLog = logOverride !== undefined ? logOverride : currentLog;
    const finalDebug =
      debugOverride !== undefined ? debugOverride : currentDebug;

    setLoggingConfig(finalLog, finalDebug);
  }

  log('🔍 Applied mode: ', mode);

  if (mode === 'hybrid') {
    if (isWatch) {
      startWatchMode(overrides.paths?.[0], overrides);
    } else {
      generateIndex(overrides.paths?.[0], overrides);
    }
  } else if (mode === 'cli-only') {
    if (!overrides.paths || overrides.paths.length === 0) {
      error('❌ Folder path must be specified in CLI-only mode.');
      return;
    }

    if (isWatch) {
      startWatchMode(overrides.paths[0], overrides);
    } else {
      generateIndex(overrides.paths[0], overrides);
    }
  } else {
    if (isWatch) {
      startWatchMode(undefined, overrides);
    } else {
      if (overrides.paths && overrides.paths.length > 0) {
        generateIndex(overrides.paths[0], overrides);
      } else {
        generateIndex(undefined, overrides);
      }
    }
  }
}
