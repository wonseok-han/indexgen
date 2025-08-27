import { IndexGenConfig, TargetConfig } from "./types";

export const DEFAULT_TARGETS_CONFIG: TargetConfig = {
  paths: [],
  fileExtensions: [".tsx", ".ts", ".jsx", ".js"],
  outputFile: "index.ts",
  exportStyle: "auto",
  namingConvention: "original",
  fromWithExtension: false, // from 경로에 확장자를 포함할지 여부
  excludes: [], // 제외할 파일 패턴
};

export const DEFAULT_CONFIG: IndexGenConfig = {
  targets: [DEFAULT_TARGETS_CONFIG],
  log: true,
  debug: false,
};
