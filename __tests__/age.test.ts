import { ageOn } from '@/lib/age';

describe('ageOn', () => {
  const today = new Date(2026, 8, 25); // 25 Sep 2026

  it('counts a birthday earlier this year', () => {
    expect(ageOn(new Date(2000, 0, 1), today)).toBe(26);
  });

  it('does not count a birthday later this year', () => {
    expect(ageOn(new Date(2000, 11, 31), today)).toBe(25);
  });

  it('counts a birthday that is today', () => {
    expect(ageOn(new Date(2008, 8, 25), today)).toBe(18);
  });

  it('is 17 the day before an 18th birthday', () => {
    expect(ageOn(new Date(2008, 8, 26), today)).toBe(17);
  });
});
