import { describe, expect, it } from 'vitest';
import { computeScale, sortByPagePosition } from './screenshot';
import { buildUserContent, isVisionModel } from './service';

describe('screenshot', () => {
  it('computeScale는 긴 변이 maxDim 이하면 1, 넘으면 비율 유지', () => {
    expect(computeScale(800, 600, 800)).toBe(1);
    expect(computeScale(1200, 900, 800)).toBeCloseTo(800 / 1200);
    expect(computeScale(600, 2000, 800)).toBeCloseTo(800 / 2000);
  });

  it('sortByPagePosition은 top 우선, 같은 줄은 left 순서로 정렬', () => {
    const items = [
      { style: { top: '300px', left: '0px' } },
      { style: { top: '0px', left: '400px' } },
      { style: { top: '0px', left: '0px' } },
    ];
    expect(sortByPagePosition(items).map((i) => i.style.left)).toEqual(['0px', '400px', '0px']);
  });
});

describe('service vision', () => {
  it('isVisionModel은 vision 포함 모델만 인정', () => {
    expect(isVisionModel('deepseek-v4-flash-vision-exp')).toBe(true);
    expect(isVisionModel('deepseek-v4-flash')).toBe(false);
    expect(isVisionModel('DeepSeek-V4-Flash-Vision-Exp')).toBe(true);
  });

  it('buildUserContent는 이미지 없으면 문자열, 있으면 text+image_url 배열', () => {
    expect(buildUserContent('안녕', [])).toBe('안녕');
    const out = buildUserContent('이름 옆에 써줘', ['data:image/jpeg;base64,AAA']);
    expect(out).toEqual([
      { type: 'text', text: '이름 옆에 써줘' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAA', detail: 'high' } },
    ]);
  });
});