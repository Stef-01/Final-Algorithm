import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { booked, nextDue, PLANS, rebate } from '@/features/care/plans';
import type { SavedItem } from '@/features/match/saved';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

const year = new Date().getFullYear();
const paula: SavedItem = { clinicianId: 'paula-garrido', fit: 'Good fit', savedAt: `${year}-01-02`, team: true, visits: [`${year - 1}-12-01`, `${year}-02-03`, `${year}-03-03`] };
const physio: SavedItem = { clinicianId: 'yuri-lima', fit: 'Good fit', savedAt: `${year}-01-02`, team: true, visits: [`${year}-04-04`] };

describe('care plans', () => {
  it('counts this year’s booked visits with the people each plan covers', () => {
    const team = [
      { item: paula, role: 'psychologist' as const },
      { item: physio, role: 'physiotherapist' as const },
    ];
    expect(booked(PLANS[0], team)).toBe(2);
    expect(booked(PLANS[1], team)).toBe(1);
  });

  it('next due follows the last visit: a fortnight for therapy, three months for a GP', () => {
    expect(nextDue({ ...paula, visits: ['2026-09-01'] }, 'psychologist')).toBe('2026-09-15');
    expect(nextDue({ ...paula, visits: ['2026-09-01'] }, 'gp')).toBe('2026-11-30');
    expect(nextDue({ ...paula, visits: undefined }, 'psychologist')).toBeNull();
  });

  it('rebates only from what the practice publishes', () => {
    expect(rebate(253, 104)).toBe(149);
    expect(rebate(null, 104)).toBeNull();
    expect(rebate(120, null)).toBeNull();
  });

  it('Profile shows your plans, what’s booked, money back, and when you last and next see people', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('watl_saved', JSON.stringify([paula]));
    /* eslint-disable @typescript-eslint/no-require-imports */
    renderRouter(
      {
        _layout: require('@/app/_layout'),
        '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
        '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
        '(tabs)/(find)/index': () => null,
        '(tabs)/saved': () => null,
        '(tabs)/settings': require('@/app/(tabs)/settings').default,
      },
      { initialUrl: '/settings' },
    );
    expect(await screen.findByText('Mental health plan')).toBeOnTheScreen();
    expect(screen.getByText('10 sessions a year')).toBeOnTheScreen();
    fireEvent(screen.getByLabelText('I have a mental health plan'), 'valueChange', true);
    expect(await screen.findByLabelText('2 of 10 booked this year')).toBeOnTheScreen();
    expect(screen.getByText('$149 back')).toBeOnTheScreen();
    expect(screen.getByText('Your people')).toBeOnTheScreen();
    expect(screen.getByText('Last')).toBeOnTheScreen();
  });
});
