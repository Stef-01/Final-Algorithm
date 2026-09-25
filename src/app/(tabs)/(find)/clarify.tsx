import { router } from 'expo-router';

import { ChoicePill, ConversationStep } from '@/components/ConversationStep';
import { Placeholder } from '@/components/Placeholder';

const options = ['Recommend the best one', 'Explain them and decide together', 'Let me decide after explaining', 'Not sure'];

// Screen 02 — adaptive clarification. Tapping an answer moves on; there is no next button.
export default function Clarify() {
  return (
    <ConversationStep
      icon="icQuestion"
      title="When there are several reasonable options, what do you prefer?"
      note="One thing would help me narrow this down."
    >
      {options.map((o) => (
        <ChoicePill key={o} label={o} onPress={() => router.push('/matching')} />
      ))}
      <Placeholder phase={1} />
    </ConversationStep>
  );
}
