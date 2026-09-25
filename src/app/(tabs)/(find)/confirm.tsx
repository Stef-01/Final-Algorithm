import { router } from 'expo-router';

import { ChoicePill, ConversationStep } from '@/components/ConversationStep';
import { Placeholder } from '@/components/Placeholder';
import { PillButton } from '@/components/Sheet';

const priorities = ['ADHD experience', 'Longer appointments', 'Collaborative decisions', 'Mental health experience'];

// Screen 03 — preference confirmation. Only shown when an uncertain inference could change the matches.
export default function ConfirmPreferences() {
  return (
    <ConversationStep icon="icCheck" title="Here's what seems to matter most." note="Anything wrong?">
      {priorities.map((p) => (
        <ChoicePill key={p} label={p} onPress={() => {}} />
      ))}
      <PillButton label="Find my matches" onPress={() => router.push('/matching')} />
      <Placeholder phase={1} />
    </ConversationStep>
  );
}
