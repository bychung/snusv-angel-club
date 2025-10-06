# PDF 스타일 마커 시스템

PDF 문서 생성 시 동적 데이터에 다양한 스타일을 적용할 수 있는 확장 가능한 마커 시스템입니다.

## 미리보기 스타일 (PREVIEW)

**가장 중요!** 미리보기 모드에서 모든 동적 데이터는 `<<PREVIEW>>` 마커로 통일됩니다.

### 미리보기 스타일 변경 방법

`lib/pdf/lpa-generator.ts`의 `STYLE_MARKERS` 객체에서 `PREVIEW` 설정만 변경하면 됩니다:

```typescript
PREVIEW: {
  start: '<<PREVIEW>>',
  end: '<<PREVIEW_END>>',
  color: '#0066CC',    // 파란색 (원하는 색상으로 변경)
  bold: false,         // true로 변경하면 굵게
  italic: false,       // true로 변경하면 기울임체
},
```

### 예시

#### 파란색 (현재 설정)

```typescript
color: '#0066CC', bold: false, italic: false
```

#### 빨간색 볼드

```typescript
color: '#CC0000', bold: true, italic: false
```

#### 초록색 이탤릭

```typescript
color: '#00AA00', bold: false, italic: true
```

#### 보라색 볼드 이탤릭

```typescript
color: '#9966CC', bold: true, italic: true
```

## 동작 방식

### 1. 템플릿 처리 (template-processor.ts)

```typescript
// isPreview가 true일 때
fundName → <<PREVIEW>>펀드명<<PREVIEW_END>>
userName → <<PREVIEW>>사용자명<<PREVIEW_END>>
totalCap → <<PREVIEW>>10,000,000<<PREVIEW_END>>
```

### 2. PDF 렌더링 (lpa-generator.ts)

- `PREVIEW` 마커를 감지
- `STYLE_MARKERS.PREVIEW` 설정에 따라 색상/볼드/이탤릭 적용
- 일반 문서(isPreview=false)에서는 마커 없이 검은색으로 표시

## 추가 스타일

필요한 경우 다른 용도의 스타일도 사용 가능:

### BOLD (볼드체)

```typescript
<<BOLD>>굵은 텍스트<<BOLD_END>>
```

### ITALIC (이탤릭)

```typescript
<<ITALIC>>기울임 텍스트<<ITALIC_END>>
```

### RED (빨간색)

```typescript
<<RED>>빨간 텍스트<<RED_END>>
```

### 스타일 중첩

```typescript
<<PREVIEW>><<BOLD>>중요한 데이터<<BOLD_END>><<PREVIEW_END>>
```

## 새로운 스타일 추가

`STYLE_MARKERS`에 항목 추가:

```typescript
GREEN: {
  start: '<<GREEN>>',
  end: '<<GREEN_END>>',
  color: '#00AA00',
  bold: false,
  italic: false,
}
```

## 색상 참고

### 파란색 계열

- `#0066CC` - 기본 파란색 (현재)
- `#0099FF` - 밝은 파란색
- `#003399` - 진한 파란색

### 빨간색 계열

- `#CC0000` - 기본 빨간색
- `#FF0000` - 순수 빨간색
- `#990000` - 진한 빨간색

### 초록색 계열

- `#00AA00` - 기본 초록색
- `#00CC00` - 밝은 초록색
- `#006600` - 진한 초록색

### 보라색 계열

- `#9966CC` - 라벤더
- `#663399` - 진한 보라색

## 권장 설정

### 강조 (추천)

```typescript
color: '#0066CC', bold: true, italic: false
// 파란색 + 굵게 = 눈에 잘 띔
```

### 부드러운 강조

```typescript
color: '#0066CC', bold: false, italic: true
// 파란색 + 기울임 = 우아하게
```

### 경고

```typescript
color: '#CC0000', bold: true, italic: false
// 빨간색 + 굵게 = 주의 필요
```

## 주의사항

1. **색상만 변경**: `PREVIEW` 항목의 `color` 값만 변경
2. **한 곳에서 관리**: 모든 미리보기 데이터가 동일한 스타일 적용
3. **실시간 반영**: 서버 재시작 없이 바로 적용됨
4. **인쇄 고려**: 너무 밝은 색상은 인쇄 시 잘 안 보일 수 있음
