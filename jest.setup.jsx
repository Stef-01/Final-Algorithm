jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The My care rating pop-up appears at random; tests that want it roll the dice themselves.
jest.mock('@/features/care/ratePrompt', () => ({ ...jest.requireActual('@/features/care/ratePrompt'), promptRoll: jest.fn(() => 0.99) }));
