import type { ClinicianRecord } from '../engine/types';
import amyChen from './clinicians/amy-chen.json';
import danielReyes from './clinicians/daniel-reyes.json';
import ellaBrooks from './clinicians/ella-brooks.json';
import graceOkafor from './clinicians/grace-okafor.json';
import hannahLee from './clinicians/hannah-lee.json';
import lucyNguyen from './clinicians/lucy-nguyen.json';
import michaelObrien from './clinicians/michael-obrien.json';
import oliverSmith from './clinicians/oliver-smith.json';
import priyaNair from './clinicians/priya-nair.json';
import raviSingh from './clinicians/ravi-singh.json';
import samPatel from './clinicians/sam-patel.json';
import tomWalsh from './clinicians/tom-walsh.json';

// Fictional clinicians used only by the engine tests. Not real people, never shown in the app.
export const fixtureClinicians = [
  amyChen,
  danielReyes,
  ellaBrooks,
  graceOkafor,
  hannahLee,
  lucyNguyen,
  michaelObrien,
  oliverSmith,
  priyaNair,
  raviSingh,
  samPatel,
  tomWalsh,
] as ClinicianRecord[];
