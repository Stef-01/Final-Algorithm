import { createElement } from 'react';

import { colors, fonts } from '@/lib/theme';

type Props = { value: Date; onChange: (date: Date) => void; maximumDate?: Date };

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The community date picker has no web implementation, so use the browser's native date input.
export function DatePicker({ value, onChange, maximumDate }: Props) {
  return createElement('input', {
    type: 'date',
    value: iso(value),
    max: maximumDate ? iso(maximumDate) : undefined,
    'aria-label': 'Date of birth',
    onChange: (e: { target: { value: string } }) => {
      const [y, m, d] = e.target.value.split('-').map(Number);
      if (y) onChange(new Date(y, m - 1, d));
    },
    style: {
      fontFamily: fonts.medium,
      fontSize: 26,
      color: colors.black,
      border: 'none',
      borderBottom: '1px solid #B0B0B0',
      padding: '8px 0',
      background: 'transparent',
    },
  });
}
