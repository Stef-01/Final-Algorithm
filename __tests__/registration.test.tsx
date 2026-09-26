import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { getProfessional } from '../server/mcp';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));
// As if a reviewer had checked Paula on AHPRA's register (scripts/registration.py).
jest.mock('../server/data/registrations.json', () => ({ 'paula-garrido': { body: 'AHPRA', number: 'PSY0001234567', checkedOn: '2026-09-20' } }));

/* eslint-disable @typescript-eslint/no-require-imports */
const routes = {
  _layout: require('@/app/_layout'),
  '(tabs)/_layout': require('@/app/(tabs)/_layout').default,
  '(tabs)/(find)/_layout': require('@/app/(tabs)/(find)/_layout').default,
  '(tabs)/(find)/index': () => null,
  '(tabs)/saved': () => null,
  '(tabs)/settings': () => null,
  'clinician/[id]': require('@/app/clinician/[id]').default,
};

describe('registration checked', () => {
  it('shows the date of the check, linking to the public register, only for people checked', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderRouter(routes, { initialUrl: '/clinician/paula-garrido' });
    fireEvent.press(await screen.findByText(/^Registration checked · 20 Sept? 2026$/));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('ahpra.gov.au'));
    screen.unmount();
    renderRouter(routes, { initialUrl: '/clinician/alice-bui' });
    await screen.findByText('About Alice');
    expect(screen.queryByText(/Registration checked/)).toBeNull();
  });

  it('the connector says when, never the number', () => {
    expect(getProfessional('paula-garrido')!.registration_checked).toEqual({ register: 'AHPRA', on: '2026-09-20' });
    expect(getProfessional('alice-bui')!.registration_checked).toBeNull();
  });
});
