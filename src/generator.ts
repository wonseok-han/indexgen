import fs from 'fs';
import path from 'path';
import { DEFAULT_TARGETS_CONFIG } from './constant';
import type { TargetConfig } from './types';
import {
  analyzeFileExports,
  getConfig,
  transformFileName,
  error,
  log,
  info,
  isPathMatchingPattern,
  findTargetConfig,
} from './utils';
import chokidar from 'chokidar';

/**
 * 파일이 처리 대상인지 확인합니다.
 * @param fileName 파일명
 * @param filePath 파일 경로
 * @param isDirectory 디렉토리 여부
 * @param targetConfig 타겟 설정
 * @returns 처리 대상 여부
 */
function shouldProcessFile(
  fileName: string,
  filePath: string,
  isDirectory: boolean,
  targetConfig: TargetConfig
): boolean {
  if (isDirectory) {
    return false;
  }

  // 제외 패턴 확인
  if (targetConfig.excludes && targetConfig.excludes.length > 0) {
    for (const excludePattern of targetConfig.excludes) {
      if (excludePattern.startsWith('*.')) {
        const ext = excludePattern.substring(1);
        if (fileName.endsWith(ext)) {
          return false;
        }
      } else if (excludePattern.startsWith('*')) {
        const suffix = excludePattern.substring(1);
        if (fileName.endsWith(suffix)) {
          return false;
        }
      } else if (fileName === excludePattern) {
        return false;
      }
    }
  }

  // 출력 파일 제외
  const outputFileName = targetConfig.outputFile || 'index.ts';
  if (fileName === outputFileName) {
    return false;
  }

  // 파일 확장자 확인
  const fileExt = path.extname(fileName);
  return targetConfig.fileExtensions.includes(fileExt);
}

/**
 * 하위 폴더가 처리 대상인지 확인합니다.
 * @param folderName 폴더명
 * @param folderPath 폴더 경로
 * @param targetConfig 타겟 설정
 * @returns 처리 대상 여부
 */
function shouldProcessSubfolder(
  folderName: string,
  folderPath: string,
  targetConfig: TargetConfig
): boolean {
  if (folderName.startsWith('.') || folderName === 'node_modules') {
    return false;
  }

  const indexPath = path.join(
    folderPath,
    targetConfig.outputFile || 'index.ts'
  );
  return fs.existsSync(indexPath);
}

/**
 * 파일 내보내기 문을 생성합니다.
 * @param file 파일 이름
 * @param filePath 파일 경로
 * @param fromPath 출력 경로
 * @param transformedName 변환된 이름
 * @param targetConfig 타겟 설정
 * @returns 내보내기 문
 */
function generateExportStatements(
  file: string,
  filePath: string,
  fromPath: string,
  transformedName: string,
  targetConfig: TargetConfig
): string[] {
  const exportStatements: string[] = [];

  switch (targetConfig.exportStyle) {
    case 'named':
      exportStatements.push(
        `export { default as ${transformedName} } from './${fromPath}';`
      );
      break;
    case 'default':
      exportStatements.push(`export { default } from './${fromPath}';`);
      break;
    case 'star':
      exportStatements.push(`export * from './${fromPath}';`);
      break;
    case 'star-as':
      exportStatements.push(
        `export * as ${transformedName} from './${fromPath}';`
      );
      break;
    case 'mixed':
      log(`🔍 Processing with mixed style: ${file}`);
      const exportInfo = analyzeFileExports(filePath);
      info(`🔍 File analysis result:`, {
        file: file,
        hasDefaultExport: exportInfo.hasDefaultExport,
        hasNamedExports: exportInfo.hasNamedExports,
        namedExports: exportInfo.namedExports,
        typeExports: exportInfo.typeExports,
        defaultExports: exportInfo.defaultExports,
      });

      const identifierRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

      const valueExports: string[] = [];
      if (exportInfo.hasDefaultExport) {
        const defaultAliasCandidate =
          exportInfo.defaultExports[0] || transformedName;
        const defaultAlias = identifierRegex.test(defaultAliasCandidate)
          ? defaultAliasCandidate
          : transformedName;
        valueExports.push(`default as ${defaultAlias}`);
      }
      if (exportInfo.hasNamedExports && exportInfo.namedExports.length > 0) {
        const uniqueNamed = Array.from(new Set(exportInfo.namedExports)).filter(
          (name) => identifierRegex.test(name)
        );
        if (uniqueNamed.length > 0) {
          valueExports.push(...uniqueNamed);
        }
      }

      const uniqueTypeExports = Array.from(
        new Set(exportInfo.typeExports)
      ).filter((name) => identifierRegex.test(name));

      if (valueExports.length > 0) {
        exportStatements.push(
          `export { ${valueExports.join(', ')} } from './${fromPath}';`
        );
      }

      if (uniqueTypeExports.length > 0) {
        exportStatements.push(
          `export type { ${uniqueTypeExports.join(', ')} } from './${fromPath}';`
        );
      }

      if (valueExports.length === 0 && uniqueTypeExports.length === 0) {
        exportStatements.push(`export * from './${fromPath}';`);
      }
      break;
    case 'auto':
    default:
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasDefaultExport =
        content.includes('export default') ||
        content.includes('export { default }');

      if (hasDefaultExport) {
        exportStatements.push(
          `export { default as ${transformedName} } from './${fromPath}';`
        );
      } else {
        exportStatements.push(`export * from './${fromPath}';`);
      }
      break;
  }

  return exportStatements;
}

/**
 * 디렉토리 내 파일들을 처리하여 인덱스 파일을 생성합니다.
 * @param dirPath 디렉토리 경로
 * @param targetConfig 타겟 설정
 * @param pattern 패턴
 */
function processDirectory(
  dirPath: string,
  targetConfig: TargetConfig,
  pattern?: string
): void {
  try {
    const files = fs.readdirSync(dirPath);
    const componentFiles: string[] = [];
    const subfolders: string[] = [];

    // 파일과 폴더 분류
    files.forEach((file: string) => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (shouldProcessSubfolder(file, filePath, targetConfig)) {
          subfolders.push(file);
        }
        // 재귀적으로 하위 디렉토리 처리
        if (!file.startsWith('.') && file !== 'node_modules') {
          processDirectory(filePath, targetConfig, pattern);
        }
      } else if (shouldProcessFile(file, filePath, false, targetConfig)) {
        componentFiles.push(file);
      }
    });

    // 패턴 매칭 확인
    const relativePath = path.relative(process.cwd(), dirPath);
    let shouldProcessDirectory = false;

    if (pattern) {
      // CLI에서 전달된 경로와 현재 디렉토리 경로를 비교
      shouldProcessDirectory = isPathMatchingPattern(relativePath, pattern);

      // 상대 경로 매칭이 실패한 경우 절대 경로로도 시도
      if (!shouldProcessDirectory) {
        const absolutePattern = path.resolve(pattern);
        const absoluteDirPath = path.resolve(dirPath);

        if (absoluteDirPath === absolutePattern) {
          shouldProcessDirectory = true;
          log(`🔍 Absolute path matching successful: ${absoluteDirPath}`);
        }
      }
    } else {
      shouldProcessDirectory =
        getConfig()?.targets?.some((target) => {
          if (target.paths && Array.isArray(target.paths)) {
            return target.paths.some((watchPath) =>
              isPathMatchingPattern(relativePath, watchPath)
            );
          }
          return false;
        }) ?? false;
    }

    if (!shouldProcessDirectory) {
      if (componentFiles.length > 0 || subfolders.length > 0) {
        log(`📁 Pattern not matched, skipping: ${dirPath}`);
      }
      return;
    }

    // 처리할 파일이나 폴더가 없으면 건너뛰기
    if (componentFiles.length === 0 && subfolders.length === 0) {
      log(`📁 No files or folders to process in ${dirPath}`);
      return;
    }

    log(`🔍 Pattern matching folder detected: ${dirPath}`);

    // 인덱스 파일 생성
    const exportStatements: string[] = [];
    const outputFileName = targetConfig.outputFile || 'index.ts';

    // 컴포넌트 파일 처리
    componentFiles.forEach((file) => {
      const fileName = path.basename(file, path.extname(file));
      const transformedName = transformFileName(
        fileName,
        targetConfig.namingConvention
      );
      const filePath = path.join(dirPath, file);
      const fromPath = targetConfig.fromWithExtension ? file : fileName;

      log(
        `🔍 Processing file: ${file} (exportStyle: ${targetConfig.exportStyle})`
      );

      exportStatements.push(
        ...generateExportStatements(
          file,
          filePath,
          fromPath,
          transformedName,
          targetConfig
        )
      );
    });

    // 하위 폴더 처리
    subfolders.forEach((folder) => {
      exportStatements.push(`export * from './${folder}';`);
    });

    // 인덱스 파일 작성
    const indexPath = path.join(dirPath, outputFileName);
    const outputDir = path.dirname(indexPath);

    if (outputDir !== dirPath && !fs.existsSync(outputDir)) {
      log(`📁 Creating folder: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const indexContent = exportStatements.join('\n') + '\n';
    fs.writeFileSync(indexPath, indexContent, 'utf-8');

    log(
      `✅ ${indexPath} created successfully (${componentFiles.length} files, ${subfolders.length} folders)`
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error(`❌ Directory processing error (${dirPath}):`, errorMessage);
  }
}

/**
 * 디렉토리를 재귀적으로 처리합니다.
 * @param fullPath 폴더 경로
 * @param targetConfig 타겟 설정
 * @param pattern 패턴
 * @returns void
 */
function processDirectoryRecursively(
  fullPath: string,
  targetConfig: TargetConfig,
  pattern?: string
): void {
  processDirectory(fullPath, targetConfig, pattern);
}

/**
 * 인덱스 파일을 생성합니다.
 * @param folderPath 폴더 경로
 * @param cliOverrides 커맨드 라인 옵션
 * @returns void
 */
export function generateIndex(
  folderPath: string | undefined,
  cliOverrides?: Partial<TargetConfig>
): void {
  try {
    const config = getConfig();

    if (folderPath) {
      let actualFolderPath = folderPath;
      if (!folderPath.includes('**')) {
        actualFolderPath = folderPath.replace(/\/$/, '');
      }

      const fullPath = path.resolve(actualFolderPath.split('**')[0]);

      if (!fs.existsSync(fullPath)) {
        error(`❌ Folder does not exist: ${fullPath}`);
        return;
      }

      let targetConfig: TargetConfig;
      if (config) {
        targetConfig = findTargetConfig(actualFolderPath, config, cliOverrides);
      } else {
        log('🔍 No config file, running with defaults + CLI options');
        targetConfig = {
          ...DEFAULT_TARGETS_CONFIG,
          ...(cliOverrides || {}),
        } as TargetConfig;
      }

      // processDirectoryRecursively로 통합 처리 (단일/재귀 모두 지원)
      // CLI에서 전달된 경로를 pattern으로 사용하여 정확한 매칭 보장
      processDirectoryRecursively(fullPath, targetConfig, actualFolderPath);
    } else {
      if (!config || !config.targets || config.targets.length === 0) {
        error('❌ No indexgen configuration found in config file.');
        return;
      }

      log('🔍 Generating index file with config file...');

      config.targets.forEach((target) => {
        if (target.paths && Array.isArray(target.paths)) {
          target.paths.forEach((watchPath) => {
            log(`📁 Processing: ${watchPath}`);

            let actualPath = watchPath;
            if (watchPath.includes('**')) {
              const basePath = watchPath.split('**')[0];
              if (basePath) {
                actualPath = basePath.replace(/\/$/, '');
              }
            }

            generateIndex(actualPath, cliOverrides);
          });
        }
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error('❌ Index generation error:', errorMessage);
  }
}

/**
 * 파일 변경 감지 모드를 시작합니다.
 * @param folderPath 폴더 경로
 * @param overrides 커맨드 라인 옵션
 * @returns void
 */
export function startWatchMode(
  folderPath: string | undefined,
  overrides: Partial<TargetConfig>
): void {
  if (folderPath) {
    // 특정 폴더 감시 (CLI-only 또는 hybrid)
    log(`🔍 Starting file change detection: ${folderPath}`);

    const config = getConfig();
    // 설정 파일이 없어도 동작하도록 기본값 + CLI 옵션 사용
    const targetConfig = config
      ? findTargetConfig(folderPath, config, overrides)
      : ({
          ...DEFAULT_TARGETS_CONFIG,
          ...(overrides || {}),
        } as TargetConfig);
    const outputFileName = targetConfig.outputFile || 'index.ts';

    // glob 패턴 watch를 위한 베이스 경로 계산
    let actualWatchPath = folderPath;
    let patternForMatch: string | undefined = undefined;
    if (folderPath.includes('**')) {
      const basePath = folderPath.split('**')[0];
      if (basePath) {
        actualWatchPath = basePath.replace(/\/$/, '');
        patternForMatch = folderPath; // 이벤트 매칭에 사용
        log(
          `🔍 Converting to watch glob pattern: ${folderPath} → ${actualWatchPath}`
        );
      }
    }

    const watcher = chokidar.watch(actualWatchPath, {
      ignored: [
        /(^|[\/\\])\../, // 숨김 파일 무시
        new RegExp(`${outputFileName.replace('.', '\\.')}$`), // outputFile 무시
        /\.d\.ts$/, // 타입 정의 파일 무시
      ],
      persistent: true,
    });

    const shouldProcessEvent = (filePath: string) => {
      if (!patternForMatch) return true; // 정확 경로 감시인 경우 바로 처리
      const fileDir = path.dirname(filePath);
      const relativePath = path.relative(process.cwd(), fileDir);
      return isPathMatchingPattern(
        relativePath.replace(/\\/g, '/'),
        patternForMatch
      );
    };

    watcher.on('add', (filePath: string) => {
      const fileName = path.basename(filePath);
      if (fileName === outputFileName) return;
      if (!shouldProcessEvent(filePath)) return;
      log(`📝 File added: ${fileName}`);
      generateIndex(folderPath, overrides);
    });

    watcher.on('unlink', (filePath: string) => {
      const fileName = path.basename(filePath);
      if (fileName === outputFileName) return;
      if (!shouldProcessEvent(filePath)) return;
      log(`🗑️  File deleted: ${fileName}`);
      generateIndex(folderPath, overrides);
    });

    watcher.on('change', (filePath: string) => {
      const fileName = path.basename(filePath);
      if (fileName === outputFileName) return;
      if (!shouldProcessEvent(filePath)) return;
      log(`📝 File changed: ${fileName}`);
      generateIndex(folderPath, overrides);
    });

    process.on('SIGINT', () => {
      watcher.close();
      process.exit(0);
    });
  } else {
    // 설정 파일의 targets 설정으로 감시 (config-based)
    const config = getConfig();
    if (!config || !config.targets || config.targets.length === 0) {
      error('❌ No indexgen configuration found in config file.');
      return;
    }

    log('🔍 Starting watch mode with config file...');

    const watchers: any[] = [];

    config.targets.forEach((target) => {
      if (target.paths && Array.isArray(target.paths)) {
        target.paths.forEach((watchPath) => {
          log(`📁 Starting watch: ${watchPath}`);

          const targetConfig = findTargetConfig(watchPath, config, overrides);
          const outputFileName = targetConfig.outputFile || 'index.ts';

          // glob 패턴을 실제 경로로 변환
          let actualWatchPath = watchPath;
          let patternForMatch: string | undefined = undefined;
          if (watchPath.includes('**')) {
            const basePath = watchPath.split('**')[0];
            if (basePath) {
              actualWatchPath = basePath.replace(/\/$/, '');
              patternForMatch = watchPath;
              log(
                `🔍 Converting to watch glob pattern: ${watchPath} → ${actualWatchPath}`
              );
            }
          }

          const watcher = chokidar.watch(actualWatchPath, {
            ignored: [
              /(^|[\/\\])\../,
              new RegExp(`${outputFileName.replace('.', '\\.')}$`),
              /\.d\.ts$/,
            ],
            persistent: true,
          });

          const shouldProcessEvent = (filePath: string) => {
            if (!patternForMatch) return true;
            const fileDir = path.dirname(filePath);
            const relativePath = path.relative(process.cwd(), fileDir);
            return isPathMatchingPattern(
              relativePath.replace(/\\/g, '/'),
              patternForMatch
            );
          };

          watcher.on('add', (filePath: string) => {
            const fileName = path.basename(filePath);
            if (fileName === outputFileName) return;
            if (!shouldProcessEvent(filePath)) return;
            log(`📝 File added: ${fileName} (${watchPath})`);
            generateIndex(actualWatchPath, overrides);
          });

          watcher.on('unlink', (filePath: string) => {
            const fileName = path.basename(filePath);
            if (fileName === outputFileName) return;
            if (!shouldProcessEvent(filePath)) return;
            log(`🗑️  File deleted: ${fileName} (${watchPath})`);
            generateIndex(actualWatchPath, overrides);
          });

          watcher.on('change', (filePath: string) => {
            const fileName = path.basename(filePath);
            if (fileName === outputFileName) return;
            if (!shouldProcessEvent(filePath)) return;
            log(`📝 File changed: ${fileName} (${watchPath})`);
            generateIndex(actualWatchPath, overrides);
          });

          watchers.push(watcher);
        });
      }
    });

    process.on('SIGINT', () => {
      log('\n🛑 Stopping watch mode...');
      watchers.forEach((watcher) => watcher.close());
      process.exit(0);
    });
  }
}
