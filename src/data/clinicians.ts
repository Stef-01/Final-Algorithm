import type { ImageSourcePropType } from 'react-native';

import { professionals } from '@server/data/professionals';
import { experiencedWith, practiceStyle } from '@server/engine/explain';
import type { ClinicianRecord } from '@server/engine/types';

import type { Clinician } from '@/features/match/types';

// The app shows the ADHDme network's professionals (server/data/professionals.json).

const photos: Record<string, ImageSourcePropType> = {
  'anubhav-saxena': require('../../assets/clinicians/anubhav-saxena.jpg'),
  'anu-saxena': require('../../assets/clinicians/anu-saxena.jpg'),
  'paula-garrido': require('../../assets/clinicians/paula-garrido.jpg'),
  'kate-row': require('../../assets/clinicians/kate-row.jpg'),
  'ellie-putland': require('../../assets/clinicians/ellie-putland.jpg'),
  'lachlan-avent': require('../../assets/clinicians/lachlan-avent.jpg'),
  'samantha-courtney': require('../../assets/clinicians/samantha-courtney.jpg'),
  'lauren-poulos': require('../../assets/clinicians/lauren-poulos.jpg'),
  'alice-bui': require('../../assets/clinicians/alice-bui.jpg'),
  'meera-lakhani': require('../../assets/clinicians/meera-lakhani.jpg'),
  'jessica-katsamatsas': require('../../assets/clinicians/jessica-katsamatsas.jpg'),
  'bart-traynor': require('../../assets/clinicians/bart-traynor.jpg'),
  'jeff-leech': require('../../assets/clinicians/jeff-leech.jpg'),
  'michael-rehardt': require('../../assets/clinicians/michael-rehardt.jpg'),
  'flynn-simonis': require('../../assets/clinicians/flynn-simonis.jpg'),
  'lara-schulz': require('../../assets/clinicians/lara-schulz.jpg'),
  'fiona-alexander': require('../../assets/clinicians/fiona-alexander.jpg'),
  'debbie-hirte': require('../../assets/clinicians/debbie-hirte.jpg'),
  'romney-taylor': require('../../assets/clinicians/romney-taylor.jpg'),
  'erin-lysle': require('../../assets/clinicians/erin-lysle.jpg'),
  'donna-italiano': require('../../assets/clinicians/donna-italiano.jpg'),
  'kate-dallimore': require('../../assets/clinicians/kate-dallimore.jpg'),
  'sarah-savage': require('../../assets/clinicians/sarah-savage.jpg'),
  'yuri-lima': require('../../assets/clinicians/yuri-lima.jpg'),
  'tom-hissey': require('../../assets/clinicians/tom-hissey.jpg'),
  'lester-rafanan': require('../../assets/clinicians/lester-rafanan.jpg'),
};

/** Short availability for the practical strip, e.g. "Tomorrow" (PRD §30). */
export function availabilityShort(days: number | null) {
  if (days === null) return 'Book online';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  return days < 14 ? 'Next week' : 'In 2+ weeks';
}

const MODE_LABEL = { in_person: 'In person', telehealth: 'Telehealth' } as const;

export function toView(r: ClinicianRecord): Clinician {
  const p = r.practical;
  return {
    id: r.id,
    name: r.name,
    firstName: r.firstName,
    profession: r.profession,
    role: r.role,
    practice: r.practice,
    suburb: r.location.suburb,
    city: r.location.city,
    photo: photos[r.id],
    bio: r.bio,
    credentials: r.credentials,
    qualifications: r.qualifications ?? [],
    bookingUrl: r.bookingUrl,
    practical: {
      nextAvailableShort: availabilityShort(p.daysUntilAvailable),
      nextAvailable: p.nextAvailable,
      modes: p.modes.map((m) => MODE_LABEL[m]),
      fee: p.fee,
      gapAfterMedicare: p.gapAfterMedicare,
      billingNote: p.billingNote,
      weekends: p.weekends,
      daysUntilAvailable: p.daysUntilAvailable,
    },
    experiencedWith: experiencedWith(r),
    practiceStyle: practiceStyle(r),
  };
}

export const clinicians: Clinician[] = professionals.map(toView);

export function getClinician(id: string) {
  return clinicians.find((c) => c.id === id);
}
