import { describe, expect, it } from 'vitest';
import { computeTextboxGeometry } from './tools';

const a4 = { width: 59528, height: 84188, marginLeft: 8504, marginRight: 8504, marginTop: 8504, marginBottom: 8504 };

describe('computeTextboxGeometry', () => {
  it('% 좌표를 HWPUNIT으로 변환 (콘텐츠 영역 = 여백 제외)', () => {
    const g = computeTextboxGeometry(a4, { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 });
    expect(g).toEqual({ width: 42520, height: 67180, horzOffset: 0, vertOffset: 0 });
  });

  it('기본 크기는 폭 30% / 높이 10%', () => {
    const g = computeTextboxGeometry(a4, { xPercent: 10, yPercent: 20 });
    expect(g.width).toBe(12756);
    expect(g.height).toBe(6718);
    expect(g.horzOffset).toBe(4252);
    expect(g.vertOffset).toBe(13436);
  });

  it('콘텐츠 영역 밖으로 나가면 안쪽으로 clamp', () => {
    const g = computeTextboxGeometry(a4, { xPercent: 95, yPercent: 95, widthPercent: 50, heightPercent: 50 });
    expect(g.horzOffset).toBe(42520 - 21260);
    expect(g.vertOffset).toBe(67180 - 33590);
  });
});