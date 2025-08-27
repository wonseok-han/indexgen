# 🚀 indexgen-cli 배포 가이드

## 📋 배포 전 체크리스트

### 1. 코드 상태 확인
- [ ] 모든 테스트 통과 (`npm test`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 변경사항 커밋 완료

### 2. 토큰 설정 확인
- [ ] NPM_TOKEN이 GitHub Secrets에 설정됨
- [ ] GitHub Actions 권한 확인

## 🔄 배포 워크플로우

### 방법 1: 자동화된 배포 (추천)

#### 패치 버전 (1.0.1 → 1.0.2)
```bash
npm run release:patch
```

#### 마이너 버전 (1.0.1 → 1.1.0)
```bash
npm run release:minor
```

#### 메이저 버전 (1.0.1 → 2.0.0)
```bash
npm run release:major
```

**자동 실행 과정**:
1. `package.json` 버전 업데이트
2. Git 태그 생성
3. GitHub에 푸시
4. NPM 배포

### 방법 2: 수동 배포

#### 1단계: 버전 업데이트
```bash
# 패치 버전
npm version patch

# 마이너 버전  
npm version minor

# 메이저 버전
npm version major
```

#### 2단계: 빌드 및 테스트
```bash
npm run build
npm test
```

#### 3단계: Git 커밋 및 태그
```bash
git add .
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"
git tag "v$(node -p "require('./package.json').version)"
git push origin main --tags
```

#### 4단계: NPM 배포
```bash
npm publish
```

## 🏷️ GitHub Release 생성

### 자동 생성 (GitHub Actions)
- `chore(release)` 커밋 메시지와 함께 푸시하면 자동 생성

### 수동 생성
1. GitHub Repository → Releases → Create a new release
2. Tag 선택: `v1.0.2`
3. Release title: `v1.0.2`
4. Description: 릴리즈 노트 붙여넣기
5. Publish release

## 🔧 GitHub Actions 워크플로우

### publish.yml
- **트리거**: GitHub Release 생성 시
- **동작**: NPM 자동 배포
- **주의**: 이미 배포된 버전은 중복 배포 방지

### release.yml  
- **트리거**: `package.json` 변경 + `chore(release)` 커밋
- **동작**: 자동 태그 생성 + GitHub Release 생성

## 🚨 문제 해결

### 중복 배포 에러
```
npm error 403 Forbidden - You cannot publish over the previously published versions
```

**해결 방법**:
1. 이미 배포된 버전인지 확인
2. 새로운 버전으로 업데이트 후 재배포

### NPM 로그인 실패
```
npm ERR! code ERR_INVALID_ARG_TYPE
```

**해결 방법**:
1. NPM 토큰 생성 (https://www.npmjs.com/settings/tokens)
2. GitHub Secrets (Repository-Settings-Secrets and variables)에 `NPM_TOKEN` 추가

## 📝 릴리즈 노트 작성

### 기본 구조

**릴리즈 노트 예시**:
```markdown
# indexgen-cli v1.0.2

## 🐛 Bug Fixes
- 수정된 버그 내용

## ✨ New Features  
- 새로운 기능

## 🛠 Technical Improvements
- 기술적 개선사항

## 📋 Full Changelog
- 수정된 파일 목록

## 🚀 Installation
npm install -g indexgen-cli@1.0.2
```

## 📋 배포 체크리스트

### 배포 전
- [ ] 코드 테스트 완료
- [ ] 버전 번호 확인
- [ ] 릴리즈 노트 준비

### 배포 후
- [ ] NPM 패키지 확인
- [ ] GitHub Release 확인
- [ ] 문서 업데이트

---

**💡 팁**: `npm run release:patch`가 가장 간단하고 안전한 방법입니다!
