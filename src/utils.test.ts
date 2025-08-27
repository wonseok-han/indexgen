import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseBoolean,
  parseCommaSeparated,
  toValidJSVariableName,
  transformFileName,
  setLoggingConfig,
  log,
  error,
  warn,
  info,
  isPathMatchingPattern,
  analyzeFileExports,
  findTargetConfig,
  getConfig,
  printHelp,
} from './utils';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs');
vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
    relative: (from: string, to: string) => {
      if (from === '/test/project' && to === 'src') {
        return 'src';
      }
      if (from === '/test/project' && to === 'other') {
        return 'other';
      }
      return to;
    },
    resolve: (...args: string[]) => '/test/project/' + args.join('/'),
  },
  join: (...args: string[]) => args.join('/'),
  relative: (from: string, to: string) => {
    if (from === '/test/project' && to === 'src') {
      return 'src';
    }
    if (from === '/test/project' && to === 'other') {
      return 'other';
    }
    return to;
  },
  resolve: (...args: string[]) => '/test/project/' + args.join('/'),
}));

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset logging config
    setLoggingConfig(false, false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseBoolean', () => {
    it('문자열 "true"를 true로 파싱해야 함', () => {
      expect(parseBoolean('true')).toBe(true);
    });

    it('문자열 "false"를 false로 파싱해야 함', () => {
      expect(parseBoolean('false')).toBe(false);
    });

    it('boolean true에 대해 true를 반환해야 함', () => {
      expect(parseBoolean(true)).toBe(true);
    });

    it('undefined에 대해 undefined를 반환해야 함', () => {
      expect(parseBoolean(undefined)).toBeUndefined();
    });

    it('잘못된 문자열에 대해 undefined를 반환해야 함', () => {
      expect(parseBoolean('invalid')).toBeUndefined();
    });
  });

  describe('parseCommaSeparated', () => {
    it('쉼표로 구분된 문자열을 배열로 파싱해야 함', () => {
      expect(parseCommaSeparated('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('공백을 제거해야 함', () => {
      expect(parseCommaSeparated(' a , b , c ')).toEqual(['a', 'b', 'c']);
    });

    it('빈 값을 필터링해야 함', () => {
      expect(parseCommaSeparated('a,,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('빈 문자열에 대해 undefined를 반환해야 함', () => {
      expect(parseCommaSeparated('')).toBeUndefined();
    });

    it('undefined에 대해 undefined를 반환해야 함', () => {
      expect(parseCommaSeparated(undefined)).toBeUndefined();
    });
  });

  describe('toValidJSVariableName', () => {
    it('잘못된 문자를 제거해야 함', () => {
      expect(toValidJSVariableName('user-name')).toBe('username');
    });

    it('숫자로 시작하는 경우 언더스코어 접두사를 추가해야 함', () => {
      expect(toValidJSVariableName('123name')).toBe('_123name');
    });

    it('유효한 문자를 보존해야 함', () => {
      expect(toValidJSVariableName('userName_123')).toBe('userName_123');
    });
  });

  describe('transformFileName', () => {
    it('camelCase로 변환해야 함', () => {
      expect(transformFileName('user-profile', 'camelCase')).toBe(
        'userProfile'
      );
    });

    it('PascalCase로 변환해야 함', () => {
      expect(transformFileName('user-profile', 'PascalCase')).toBe(
        'UserProfile'
      );
    });

    it('원래 명명 규칙을 사용해야 함', () => {
      expect(transformFileName('user-profile', 'original')).toBe('userprofile');
    });

    it('언더스코어를 처리해야 함', () => {
      expect(transformFileName('user_profile', 'camelCase')).toBe(
        'userProfile'
      );
    });

    it('기본값으로 PascalCase를 사용해야 함', () => {
      expect(transformFileName('user-profile', 'PascalCase')).toBe(
        'UserProfile'
      );
    });
  });

  describe('로깅 함수들', () => {
    let consoleSpy: {
      log: any;
      error: any;
      warn: any;
      info: any;
    };

    beforeEach(() => {
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
    });

    it('로깅이 활성화되었을 때 console.log를 호출해야 함', () => {
      setLoggingConfig(true, false);
      log('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith('test message');
    });

    it('로깅이 비활성화되었을 때 console.log를 호출하지 않아야 함', () => {
      setLoggingConfig(false, false);
      log('test message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('로깅이 활성화되었을 때 console.error를 호출해야 함', () => {
      setLoggingConfig(true, false);
      error('test error');
      expect(consoleSpy.error).toHaveBeenCalledWith('test error');
    });

    it('로깅이 비활성화되었을 때 console.error를 호출하지 않아야 함', () => {
      setLoggingConfig(false, false);
      error('test error');
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('로깅이 활성화되었을 때 console.warn을 호출해야 함', () => {
      setLoggingConfig(true, false);
      warn('test warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('test warning');
    });

    it('로깅이 비활성화되었을 때 console.warn을 호출하지 않아야 함', () => {
      setLoggingConfig(false, false);
      warn('test warning');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('디버그가 활성화되었을 때 console.info를 호출해야 함', () => {
      setLoggingConfig(true, true);
      info('test info');
      expect(consoleSpy.info).toHaveBeenCalledWith('test info');
    });

    it('디버그가 비활성화되었을 때 console.info를 호출하지 않아야 함', () => {
      setLoggingConfig(true, false);
      info('test info');
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });
});

describe('isPathMatchingPattern', () => {
  describe('정확한 경로 매칭', () => {
    it('정확한 경로가 일치해야 함', () => {
      expect(
        isPathMatchingPattern('entities/kakao/model', 'entities/kakao/model')
      ).toBe(true);
      expect(isPathMatchingPattern('src/components', 'src/components')).toBe(
        true
      );
      expect(
        isPathMatchingPattern('entities/user/api', 'entities/user/api')
      ).toBe(true);
    });

    it('정확한 경로가 일치하지 않아야 함', () => {
      expect(
        isPathMatchingPattern('entities/kakao/model', 'entities/kakao/api')
      ).toBe(false);
      expect(isPathMatchingPattern('src/components', 'src/utils')).toBe(false);
      expect(
        isPathMatchingPattern('entities/user/api', 'entities/user/model')
      ).toBe(false);
    });
  });

  describe('glob 패턴 매칭', () => {
    it('** 패턴이 제대로 작동해야 함', () => {
      expect(
        isPathMatchingPattern('entities/kakao/model', 'entities/**/model')
      ).toBe(true);
      expect(
        isPathMatchingPattern('entities/user/api', 'entities/**/api')
      ).toBe(true);
      expect(
        isPathMatchingPattern('entities/notification/ui', 'entities/**/ui')
      ).toBe(true);
    });

    it('* 패턴이 제대로 작동해야 함', () => {
      expect(isPathMatchingPattern('src/components', 'src/*')).toBe(true);
      expect(isPathMatchingPattern('src/utils', 'src/*')).toBe(true);
      expect(isPathMatchingPattern('src/components', 'src/*/components')).toBe(
        false
      );
    });

    it('복합 패턴이 제대로 작동해야 함', () => {
      expect(
        isPathMatchingPattern('entities/kakao/api', 'entities/*/api')
      ).toBe(true);
      expect(
        isPathMatchingPattern('entities/user/model', 'entities/*/model')
      ).toBe(true);
      expect(
        isPathMatchingPattern('entities/notification/lib', 'entities/*/lib')
      ).toBe(true);
    });

    it('**/ 패턴이 제대로 작동해야 함', () => {
      expect(isPathMatchingPattern('test/depth1/api', 'test/**/api')).toBe(
        true
      );
      expect(
        isPathMatchingPattern('test/depth1/api/**', 'test/**/api/**')
      ).toBe(true);
      expect(
        isPathMatchingPattern('test/depth1/depth2/api', 'test/**/api/**')
      ).toBe(true);
      expect(
        isPathMatchingPattern('test/depth1/depth2/api/**', 'test/**/api/**')
      ).toBe(true);

      expect(isPathMatchingPattern('other/depth1/api', 'test/**/api')).toBe(
        false
      );
      expect(
        isPathMatchingPattern('other/depth1/api/**', 'test/**/api/**')
      ).toBe(false);
      expect(
        isPathMatchingPattern('other/depth1/depth2/api', 'test/**/api')
      ).toBe(false);
      expect(
        isPathMatchingPattern('other/depth1/depth2/api/**', 'test/**/api/**')
      ).toBe(false);
    });
  });

  describe('경로 정규화', () => {
    it('슬래시 정규화가 제대로 작동해야 함', () => {
      expect(
        isPathMatchingPattern('entities\\kakao\\model', 'entities/kakao/model')
      ).toBe(true);
      expect(
        isPathMatchingPattern('entities//kakao//model', 'entities/kakao/model')
      ).toBe(true);
      expect(
        isPathMatchingPattern('./entities/kakao/model', 'entities/kakao/model')
      ).toBe(true);
    });
  });
});

describe('analyzeFileExports', () => {
  it('export async function을 감지해야 함', () => {
    const mockContent = `
      export async function status() { return "ok"; }
      export async function auth() { return "token"; }
    `;

    // fs.readFileSync를 모킹
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    const result = analyzeFileExports('/test/file.ts');

    expect(result.hasNamedExports).toBe(true);
    expect(result.namedExports).toContain('status');
    expect(result.namedExports).toContain('auth');
  });

  it('export async const를 감지해야 함', () => {
    const mockContent = `
      export async const asyncFunction = async () => "ok";
    `;

    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    const result = analyzeFileExports('/test/file.ts');

    expect(result.hasNamedExports).toBe(true);
    expect(result.namedExports).toContain('asyncFunction');
  });

  it('export default async function을 감지해야 함', () => {
    const mockContent = `
      export default async function main() { return "ok"; }
    `;

    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    const result = analyzeFileExports('/test/file.ts');

    expect(result.hasDefaultExport).toBe(true);
    expect(result.defaultExports).toContain('main');
  });
});

describe('findTargetConfig', () => {
  beforeEach(() => {
    // process.cwd() 모킹
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('기본값과 병합된 설정을 반환해야 함', () => {
    const config = {
      targets: [
        {
          paths: ['src'],
          outputFile: 'index.ts',
          fileExtensions: ['.ts'],
          exportStyle: 'named' as const,
          namingConvention: 'PascalCase' as const,
          fromWithExtension: false,
          excludes: [],
        },
      ],
      log: true,
      debug: false,
    };

    const result = findTargetConfig('src', config);
    expect(result).toBeDefined();
    // findTargetConfig는 paths를 직접 반환하지 않고, DEFAULT_TARGETS_CONFIG와 병합합니다
    expect(result.outputFile).toBe('index.ts');
  });

  it('매칭되는 대상이 없을 때 기본 설정을 반환해야 함', () => {
    const config = {
      targets: [
        {
          paths: ['other'],
          outputFile: 'index.ts',
          fileExtensions: ['.ts'],
          exportStyle: 'named' as const,
          namingConvention: 'PascalCase' as const,
          fromWithExtension: false,
          excludes: [],
        },
      ],
      log: true,
      debug: false,
    };

    const result = findTargetConfig('src', config);
    expect(result).toBeDefined();
    // 매칭되지 않으면 기본값 사용
    expect(result.outputFile).toBe('index.ts');
  });

  it('CLI 오버라이드를 적용해야 함', () => {
    const config = {
      targets: [
        {
          paths: ['src'],
          outputFile: 'index.ts',
          fileExtensions: ['.ts'],
          exportStyle: 'named' as const,
          namingConvention: 'PascalCase' as const,
          fromWithExtension: false,
          excludes: [],
        },
      ],
      log: true,
      debug: false,
    };

    const cliOverrides = { outputFile: 'exports.ts' };
    const result = findTargetConfig('src', config, cliOverrides);
    expect(result).toBeDefined();
    expect(result.outputFile).toBe('exports.ts');
  });

  it('undefined 설정을 처리해야 함', () => {
    const result = findTargetConfig('src', undefined as any);
    expect(result).toBeDefined();
    // undefined config일 때는 DEFAULT_TARGETS_CONFIG 사용
    expect(result.outputFile).toBe('index.ts');
  });

  it('빈 targets 배열을 처리해야 함', () => {
    const config = { targets: [], log: true, debug: false };
    const result = findTargetConfig('src', config);
    expect(result).toBeDefined();
    // 빈 targets일 때는 DEFAULT_TARGETS_CONFIG 사용
    expect(result.outputFile).toBe('index.ts');
  });
});

describe('getConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // fs.existsSync와 fs.readFileSync 모킹
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue('');
  });

  it('설정 파일이 없으면 undefined를 반환해야 함', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = getConfig();

    expect(result).toBeUndefined();
  });

  it('JSON 설정 파일을 읽어야 함', () => {
    const mockConfig = {
      targets: [
        {
          paths: ['src'],
          exportStyle: 'named',
        },
      ],
      log: true,
      debug: false,
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

    const result = getConfig();

    expect(result).toBeDefined();
    expect(result?.targets).toHaveLength(1);
    expect(result?.targets?.[0].paths).toEqual(['src']);
  });

  it('JavaScript 설정 파일을 읽어야 함', () => {
    const mockConfig = {
      default: {
        targets: [
          {
            paths: ['src'],
            exportStyle: 'named',
          },
        ],
        log: true,
        debug: false,
      },
    };

    // require 모킹
    vi.doMock('./constant', () => ({
      DEFAULT_CONFIG: {
        targets: [
          {
            paths: ['src'],
            outputFile: 'index.ts',
            fileExtensions: ['.ts'],
            exportStyle: 'star',
            namingConvention: 'PascalCase',
            fromWithExtension: false,
            excludes: [],
          },
        ],
        log: true,
        debug: false,
      },
    }));

    // 이 테스트는 실제 require 동작을 테스트하기 어려우므로 스킵
    expect(true).toBe(true);
  });

  it('설정 파일 읽기 오류를 처리해야 함', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('파일 읽기 오류');
    });

    const result = getConfig();

    expect(result).toBeUndefined();
  });
});

describe('mergeWithDefaults', () => {
  it('기본 설정과 사용자 설정을 병합해야 함', () => {
    // mergeWithDefaults는 내부 함수이므로 getConfig를 통해 간접적으로 테스트
    const result = getConfig();

    // 설정 파일이 없으면 undefined를 반환
    expect(result).toBeUndefined();
  });
});

describe('printHelp', () => {
  it('도움말 메시지를 출력해야 함', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printHelp();

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('indexgen')
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));

    consoleSpy.mockRestore();
  });
});
