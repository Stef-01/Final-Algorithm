import { router } from 'expo-router';
import { Text } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';

export default function WhyLastName() {
  return (
    <Sheet>
      <Text style={sheetText.heading}>Why last name?</Text>
      <Text style={sheetText.body}>
        Adding your last name helps create a safer, more authentic and accountable community
      </Text>
      <PillButton label="OK got it" onPress={() => router.back()} />
    </Sheet>
  );
}
