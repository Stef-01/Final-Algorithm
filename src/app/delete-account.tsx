import { router } from 'expo-router';
import { Text } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';
import { useProfile } from '@/lib/profile';

export default function DeleteAccount() {
  const { clear } = useProfile();

  const confirm = async () => {
    await clear();
    router.dismissAll();
    router.replace('/');
  };

  return (
    <Sheet>
      <Text style={sheetText.heading}>Are you sure?</Text>
      <Text style={sheetText.body}>
        Deleting your account will permanently erase convos with your connections.
      </Text>
      <PillButton label="Confirm delete" onPress={confirm} />
      <PillButton label="Not now" variant="text" onPress={() => router.back()} />
    </Sheet>
  );
}
