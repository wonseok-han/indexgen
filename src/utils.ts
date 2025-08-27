import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG, DEFAULT_TARGETS_CONFIG } from './constant';
import { IndexGenConfig, TargetConfig } from './types';

// 로깅 유틸리티
let logEnabled = true;
let debugEnabled = false;

/**
 * 로깅 설정을 설정합니다.
 * @param log - 로깅 설정
 * @param debug - 디버깅 설정
 */
export function setLoggingConfig(log: boolean, debug: boolean): void {
  logEnabled = log;
  debugEnabled = debug;
}

/**
 * 로그를 출력합니다.
 * @param args - 로그 메시지
 */
export function log(...args: any[]): void {
  if (logEnabled) {
    console.log(...args);
  }
}

/**
 * 에러 로그를 출력합니다.
 * @param args - 에러 메시지
 */
export function error(...args: any[]): void {
  if (logEnabled) {
    console.error(...args);
  }
}

/**
 * 경고 로그를 출력합니다.
 * @param args - 경고 메시지
 */
export function warn(...args: any[]): void {
  if (logEnabled) {
    console.warn(...args);
  }
}

/**
 * 정보 로그를 출력합니다.
 * @param args - 정보 메시지
 */
export function info(...args: any[]): void {
  if (debugEnabled) {
    console.info(...args);
  }
}

/**
 * 타겟 설정을 찾습니다.
 * @param folderPath 폴더 경로
 * @param config 설정
 * @param cliOverrides 커맨드 라인 옵션
 * @returns 타겟 설정
 */
export function findTargetConfig(
  folderPath: string | undefined,
  config: IndexGenConfig,
  cliOverrides?: Partial<TargetConfig>
): TargetConfig {
  let targetConfig: TargetConfig | undefined;

  log(`🔍 findTargetConfig called: folderPath=${folderPath}`);

  if (config?.targets && Array.isArray(config.targets)) {
    if (folderPath) {
      const relativePath = path.relative(process.cwd(), folderPath);
      log(`🔍 Relative path: ${relativePath}`);

      for (const target of config.targets) {
        log(`🔍 Checking target:`, {
          paths: target.paths,
          exportStyle: target.exportStyle,
        });
        if (target.paths && Array.isArray(target.paths)) {
          for (const watchPath of target.paths) {
            log(`🔍 Checking watchPath: ${watchPath}`);
            if (isPathMatchingPattern(relativePath, watchPath)) {
              targetConfig = { ...DEFAULT_TARGETS_CONFIG, ...target };
              break;
            }
          }
          if (targetConfig) break;
        }
      }
    } else if (config.targets.length > 0) {
      log(`🔍 Using first configuration`);
      targetConfig = { ...DEFAULT_TARGETS_CONFIG, ...config.targets[0] };
    }
  }

  if (!targetConfig) {
    log(`🔍 Using default values`);
    targetConfig = { ...DEFAULT_TARGETS_CONFIG };
  }

  log(`🔍 Final targetConfig:`, { exportStyle: targetConfig.exportStyle });

  if (cliOverrides) {
    targetConfig = { ...targetConfig, ...cliOverrides };
  }

  return targetConfig;
}

/**
 * 설정 파일에서 indexgen 설정을 읽어옵니다
 * @returns indexgen 설정 객체 또는 undefined
 */
export function getConfig(): IndexGenConfig | undefined {
  const configFiles = [
    '.indexgen-cli',
    '.indexgen-cli.json',
    'indexgen-cli.config.js',
    'indexgen-cli.config.mjs',
    'indexgen-cli.config.ts',
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(process.cwd(), configFile);

    if (fs.existsSync(configPath)) {
      try {
        if (
          configFile.endsWith('.js') ||
          configFile.endsWith('.mjs') ||
          configFile.endsWith('.ts')
        ) {
          // JavaScript/TypeScript 설정 파일
          const config = require(configPath);
          const fileConfig = config.default || config;

          if (fileConfig) {
            // DEFAULT_CONFIG와 병합하여 기본값 채우기
            return mergeWithDefaults(fileConfig);
          }
        } else {
          // JSON 설정 파일
          const content = fs.readFileSync(configPath, 'utf-8');
          const fileConfig = JSON.parse(content);

          if (fileConfig) {
            // DEFAULT_CONFIG와 병합하여 기본값 채우기
            return mergeWithDefaults(fileConfig);
          }
        }
      } catch (err) {
        error(`⚠️  Failed to read config file ${configFile}:`, err);
        continue;
      }
    }
  }

  // 설정 파일이 없으면 undefined 반환
  return undefined;
}

/**
 * 설정을 DEFAULT_CONFIG와 병합하여 기본값을 채웁니다
 * @param config - 사용자 설정
 * @returns 병합된 설정
 */
function mergeWithDefaults(config: any): IndexGenConfig {
  const merged: IndexGenConfig = { ...DEFAULT_CONFIG };

  if (config.targets && Array.isArray(config.targets)) {
    merged.targets = config.targets.map((target: any) => ({
      ...DEFAULT_CONFIG.targets[0], // 기본 target 설정
      ...target, // 사용자 설정으로 오버라이드
    }));
  }

  return merged;
}

/**
 * 문자열을 불린 값으로 파싱하는 유틸리티
 * @param value - 파싱할 값 (문자열, 불린, undefined)
 * @returns 파싱된 불린 값 또는 undefined
 */
export function parseBoolean(
  value: string | true | undefined
): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === true) return true;
  const lowered = String(value).toLowerCase();
  if (lowered === 'true') return true;
  if (lowered === 'false') return false;
  return undefined;
}

/**
 * 쉼표로 구분된 문자열을 배열로 파싱하는 함수
 * @param value - 쉼표로 구분된 문자열
 * @returns 파싱된 배열 또는 undefined
 */
export function parseCommaSeparated(
  value: string | undefined
): string[] | undefined {
  if (!value) return undefined;

  const raw = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (raw.length === 0) return undefined;

  return raw;
}

/**
 * 파일명을 유효한 JavaScript 변수명으로 변환
 * @param str - 변환할 파일명 문자열
 * @returns 유효한 JavaScript 변수명
 */
export function toValidJSVariableName(str: string): string {
  let validName = str.replace(/[^a-zA-Z0-9_]/g, '');
  if (/^[0-9]/.test(validName)) {
    validName = '_' + validName;
  }
  return validName;
}

/**
 * 네이밍 규칙에 따라 파일명을 변환
 * @param name - 변환할 파일명
 * @param namingConvention - 적용할 네이밍 규칙 (camelCase, original, PascalCase)
 * @returns 변환된 파일명
 */
export function transformFileName(
  name: string,
  namingConvention: string
): string {
  // 먼저 하이픈과 언더스코어를 제거하고 camelCase로 변환
  const camelCaseName = name.replace(
    /[-_]([a-z])/g,
    (_match: string, letter: string) => letter.toUpperCase()
  );

  switch (namingConvention) {
    case 'camelCase':
      return camelCaseName.charAt(0).toLowerCase() + camelCaseName.slice(1);
    case 'original':
      return toValidJSVariableName(name);
    case 'PascalCase':
    default:
      return camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  }
}

/**
 * 파일의 export 문을 분석합니다
 * @param filePath - 분석할 파일 경로
 * @returns export 정보 객체
 */
export function analyzeFileExports(filePath: string): {
  hasDefaultExport: boolean;
  hasNamedExports: boolean;
  namedExports: string[];
  typeExports: string[];
  defaultExports: string[];
} {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 주석을 제외한 실제 코드에서만 export 검색
    const allLines = content.split('\n');
    const codeLines = allLines.filter((line) => {
      const trimmedLine = line.trim();
      return (
        !trimmedLine.startsWith('//') &&
        !trimmedLine.startsWith('/*') &&
        !trimmedLine.startsWith('*')
      );
    });

    // 라인 중간의 주석도 제거
    const cleanCodeLines = codeLines.map((line) => {
      // // 주석 제거
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex).trim();
      }
      return line;
    });

    const codeContent = cleanCodeLines.join('\n');

    // 문자열 리터럴(", ', `) 내부 내용 제거 후 분석 (주석 외 추가 오탐 방지)
    const codeWithoutStrings = codeContent
      .replace(/`(?:\\.|[\s\S])*?`/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '');

    const hasDefaultExport = /export\s+default\s+/.test(codeWithoutStrings);

    info(`🔍 hasDefaultExport debugging:`, {
      hasDefaultExport,
      hasExportDefault: /export\s+default\s+/.test(codeWithoutStrings),
      hasExportBraceDefault: /export\s+\{\s*default\s*\}/.test(
        codeWithoutStrings
      ),
      codeContentSample: codeWithoutStrings.substring(0, 500), // First 500 characters only
    });

    // 모든 export 타입 찾기
    const namedExports: string[] = [];
    const typeExports: string[] = [];
    const defaultExports: string[] = [];

    // 1. export function/const/class/enum (value exports)
    const valueExportPatterns = [
      /export\s+async\s+function\s+(\w+)/g, // export async function
      /export\s+function\s+(\w+)/g, // export function
      /export\s+async\s+const\s+(\w+)/g, // export async const
      /export\s+const\s+(\w+)/g, // export const
      /export\s+class\s+(\w+)/g, // export class
      /export\s+enum\s+(\w+)/g, // export enum
    ];

    valueExportPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(codeWithoutStrings)) !== null) {
        if (match[1] && !namedExports.includes(match[1])) {
          namedExports.push(match[1]);
        }
      }
    });

    // 2. export interface/type (type-only exports)
    const typeExportPatterns = [
      /export\s+interface\s+(\w+)/g,
      /export\s+type\s+(\w+)/g,
    ];

    typeExportPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(codeWithoutStrings)) !== null) {
        if (match[1] && !typeExports.includes(match[1])) {
          typeExports.push(match[1]);
        }
      }
    });

    // 2. export { a, b, c } 형태 (주석과 템플릿 리터럴 제외)
    const lines = codeWithoutStrings.split('\n');
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      // 주석 라인은 건너뛰기
      if (
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.startsWith('*')
      ) {
        return;
      }

      const exportGroupPattern = /export\s+\{\s*([^}]+)\s*\}/g;
      let groupMatch;
      while ((groupMatch = exportGroupPattern.exec(trimmedLine)) !== null) {
        if (groupMatch[1]) {
          const exports = groupMatch[1].split(',').map((e) => e.trim());
          exports.forEach((exp) => {
            // default나 *가 아닌 경우만 추가
            if (
              exp &&
              !/^default\b/.test(exp) &&
              !exp.includes('*') &&
              !exp.includes(' as ')
            ) {
              const cleanExp = exp.split(' as ')[0]?.trim();
              if (cleanExp && !namedExports.includes(cleanExp)) {
                namedExports.push(cleanExp);
              }
            }
          });
        }
      }
    });

    // 3. export default const/function/class (이름을 가진 default 만 추출)
    const defaultPatterns = [
      /export\s+default\s+async\s+const\s+(\w+)/g, // export default async const
      /export\s+default\s+const\s+(\w+)/g, // export default const
      /export\s+default\s+async\s+function\s+(\w+)/g, // export default async function
      /export\s+default\s+function\s+(\w+)/g, // export default function
      /export\s+default\s+class\s+(\w+)/g, // export default class
    ];

    defaultPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(codeWithoutStrings)) !== null) {
        if (match[1] && !defaultExports.includes(match[1])) {
          defaultExports.push(match[1]);
        }
      }
    });

    info(`🔍 analyzeFileExports debugging:`, {
      filePath,
      contentLength: content.length,
      namedExports,
      defaultExports,
    });

    const hasNamedExports = namedExports.length > 0;

    info(`📊 Final results:`, {
      hasDefaultExport,
      hasNamedExports,
      namedExports,
      typeExports,
      defaultExports,
    });

    return {
      hasDefaultExport,
      hasNamedExports,
      namedExports,
      typeExports,
      defaultExports,
    };
  } catch (err) {
    error(`❌ Failed to analyze file: ${filePath}`, err);
    return {
      hasDefaultExport: false,
      hasNamedExports: false,
      namedExports: [],
      typeExports: [],
      defaultExports: [],
    };
  }
}

/**
 * 경로가 glob 패턴 또는 정확한 경로와 일치하는지 확인합니다
 * - glob 패턴: entities/**\/api/**, src/*\/ui 등
 * - 정확한 경로: entities/kakao/model, src/components 등
 * @param relativePath - 확인할 상대 경로 (process.cwd() 기준)
 * @param watchPath - glob 패턴 또는 정확한 경로
 * @returns 패턴 매칭 여부
 */
export function isPathMatchingPattern(
  relativePath: string,
  watchPath: string
): boolean {
  // 경로 구분자 정규화 (Windows/Unix 공통 처리)
  const normalize = (p: string) => {
    // Windows 백슬래시를 슬래시로 변환
    let result = p.replace(/\\/g, '/');
    // 연속된 슬래시를 하나로 정규화
    result = result.replace(/\/+/g, '/');
    // 앞의 ./ 제거
    result = result.replace(/^\.\//, '');
    return result;
  };

  const rel = normalize(relativePath);
  const watch = normalize(watchPath);

  // 정확한 경로 매칭 (glob 패턴이 아닌 경우)
  if (!watch.includes('*')) {
    return rel === watch;
  }

  // glob 패턴 처리
  const escapeRegex = (s: string) => s.replace(/[.+^${}()|\[\]\\]/g, '\\$&');
  const replaceGlobs = (s: string) =>
    s
      // '**' → '.*' (슬래시 포함 모든 문자)
      .replace(/\*\*/g, '.*')
      // 남은 '*' → '[^/]*' (슬래시 제외 0+ 문자)
      .replace(/\*/g, '[^/]*');

  // glob 패턴을 정규식으로 변환
  const toRegex = (glob: string): RegExp => {
    const normalized = normalize(glob);

    // '**' 단독이면 모두 매칭
    if (normalized === '**') {
      return new RegExp('^.*$');
    }

    // '/**'로 끝나면 베이스 디렉토리 자체도 매칭되도록 처리
    if (normalized.endsWith('/**')) {
      const base = normalized.slice(0, -3); // '/**' 제거
      const escapedBase = replaceGlobs(escapeRegex(base));
      return new RegExp(`^${escapedBase}(?:/.*)?$`);
    }

    // 일반 변환
    const escaped = replaceGlobs(escapeRegex(normalized));
    return new RegExp(`^${escaped}$`);
  };

  const regex = toRegex(watch);
  return regex.test(rel);
}

/**
 * 도움말 메시지를 출력합니다.
 */
export function printHelp(): void {
  console.log(`
indexgen-cli - A tool that automatically scans folders to generate index.ts files

Usage:
  indexgencli --paths=<path1,path2> [options]

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
  indexgencli --paths=src/components/**
  indexgencli --paths=src/components/**,src/**/ui/** --watch --exportStyle=named
  indexgencli --paths=src/components/** --log=false --debug=true
  indexgencli --watch
`);
}
