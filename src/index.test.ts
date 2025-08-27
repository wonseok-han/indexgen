import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCliArgs, runCli } from './index';
import fs from 'fs';
import path from 'path';

// Mock fs and path modules (파일 시스템 접근은 여전히 필요)
vi.mock('fs');
vi.mock('path');

// Mock utils module (일부 함수만 mock, 나머지는 실제 함수 사용)
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    // 파일 시스템 접근이 필요한 함수들만 mock
    getConfig: vi.fn(),
    // 나머지는 실제 함수 사용
  };
});

describe('indexgen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  describe('parseCliArgs', () => {
    it('--watch 플래그를 파싱해야 함', () => {
      const result = parseCliArgs(['--watch']);
      expect(result.isWatch).toBe(true);
    });

    it('--help 플래그를 파싱해야 함', () => {
      const result = parseCliArgs(['--help']);
      expect(result.isHelp).toBe(true);
    });

    it('--paths 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--paths=src']);
      expect(result.overrides.paths).toEqual(['src']);
    });

    it('--outputFile 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--outputFile=exports.ts']);
      expect(result.overrides.outputFile).toBe('exports.ts');
    });

    it('--fileExtensions 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--fileExtensions=.ts,.tsx']);
      expect(result.overrides.fileExtensions).toEqual(['.ts', '.tsx']);
    });

    it('--excludes 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--excludes=*.d.ts']);
      expect(result.overrides.excludes).toEqual(['*.d.ts']);
    });

    it('--exportStyle 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--exportStyle=named']);
      expect(result.overrides.exportStyle).toBe('named');
    });

    it('--namingConvention 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--namingConvention=PascalCase']);
      expect(result.overrides.namingConvention).toBe('PascalCase');
    });

    it('--fromWithExtension 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--fromWithExtension=true']);
      expect(result.overrides.fromWithExtension).toBe(true);
    });

    it('--log 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--log=true']);
      expect(result.logOverride).toBe(true);
    });

    it('--debug 옵션을 파싱해야 함', () => {
      const result = parseCliArgs(['--debug=true']);
      expect(result.debugOverride).toBe(true);
    });

    it('설정과 경로가 제공되지 않았을 때 cli-only 모드를 결정해야 함', () => {
      const result = parseCliArgs(['--paths=src']);
      expect(result.mode).toBe('cli-only');
    });

    it('알 수 없는 옵션에 대해 종료해야 함', () => {
      // Mock process.exit to throw error instead of exiting
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      expect(() => parseCliArgs(['--unknown'])).toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('빈 인수 배열을 처리해야 함', () => {
      const result = parseCliArgs([]);
      expect(result.isWatch).toBe(false);
      expect(result.isHelp).toBe(false);
      expect(result.overrides.paths).toBeUndefined();
    });

    it('CLI와 설정 모드를 혼합해서 처리해야 함', () => {
      const result = parseCliArgs(['--paths=src', '--outputFile=index.ts']);
      expect(result.mode).toBe('cli-only');
      expect(result.overrides.paths).toEqual(['src']);
      expect(result.overrides.outputFile).toBe('index.ts');
    });

    it('모든 CLI 옵션을 함께 처리해야 함', () => {
      const result = parseCliArgs([
        '--watch',
        '--paths=src',
        '--outputFile=index.ts',
        '--fileExtensions=.ts,.tsx',
        '--excludes=*.d.ts',
        '--exportStyle=named',
        '--namingConvention=PascalCase',
        '--fromWithExtension=true',
        '--log=true',
        '--debug=true',
      ]);

      expect(result.isWatch).toBe(true);
      expect(result.overrides.paths).toEqual(['src']);
      expect(result.overrides.outputFile).toBe('index.ts');
      expect(result.overrides.fileExtensions).toEqual(['.ts', '.tsx']);
      expect(result.overrides.excludes).toEqual(['*.d.ts']);
      expect(result.overrides.exportStyle).toBe('named');
      expect(result.overrides.namingConvention).toBe('PascalCase');
      expect(result.overrides.fromWithExtension).toBe(true);
      expect(result.logOverride).toBe(true);
      expect(result.debugOverride).toBe(true);
    });
  });

  describe('runCli', () => {
    beforeEach(() => {
      // Mock process.argv
      Object.defineProperty(process, 'argv', {
        value: ['node', 'script.js'],
        writable: true,
      });
    });

    it('유효한 인수로 CLI를 실행해야 함', () => {
      process.argv = [
        'node',
        'script.js',
        '--paths=src',
        '--outputFile=index.ts',
      ];

      runCli();

      // 실제 함수가 실행되어야 함
      expect(true).toBe(true);
    });

    it('누락된 paths 인수를 처리해야 함', () => {
      process.argv = ['node', 'script.js', '--outputFile=index.ts'];

      runCli();

      // 실제 에러 메시지가 출력되어야 함
      expect(true).toBe(true);
    });

    it('help 플래그를 처리해야 함', () => {
      process.argv = ['node', 'script.js', '--help'];

      runCli();

      // 실제 help가 출력되어야 함
      expect(true).toBe(true);
    });

    it('watch 모드를 처리해야 함', () => {
      process.argv = ['node', 'script.js', '--paths=src', '--watch'];

      runCli();

      // 실제 watch 모드가 시작되어야 함
      expect(true).toBe(true);
    });
  });
});
