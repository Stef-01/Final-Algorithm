import type { ImageSourcePropType } from 'react-native';

export type Person = {
  name: string;
  photos: { caption: string; source: ImageSourcePropType }[];
  prompts: { title: string; answer: string }[];
  age: number;
  gender: string;
  height: string;
  location: string;
  ethnicity: string;
  education: string;
  religion: string;
  country: string;
};

const photos = (captions: string[], sources: ImageSourcePropType[]) =>
  captions.map((caption, i) => ({ caption, source: sources[i] }));

export const lisa: Person = {
  name: 'Lisa',
  photos: photos(
    [
      'Looking for an android developer',
      'When I see an Android developer',
      'When I know you got an iPhone',
      'We will install our app in here.',
      'My cool pic with my cool phone.',
      'My ex build Brawl Stars.',
    ],
    [
      require('../../assets/images/lisa.png'),
      require('../../assets/images/lisatwo.jpg'),
      require('../../assets/images/lisa_2.jpg'),
      require('../../assets/images/lisa_4.jpg'),
      require('../../assets/images/lisa_5.jpg'),
      require('../../assets/images/lisa_6.jpg'),
    ],
  ),
  prompts: [
    { title: 'The way to win me over is', answer: 'By showing me the code.' },
    {
      title: "I'm looking for",
      answer: 'A cool android developer who can implement MVVM architecture flawlessly.',
    },
    {
      title: "I'll fall for you if",
      answer: 'You complete 6 months of masai school with 100% attendance and assignment submission.',
    },
  ],
  age: 23,
  gender: 'Woman',
  height: `5' 6"`,
  location: 'Buriram',
  ethnicity: 'South Asian',
  education: 'Praphamontree',
  religion: 'Buddhist',
  country: 'Thailand',
};

export const tzuyu: Person = {
  name: 'Tzuyu',
  photos: photos(
    [
      'In search for an android developer',
      "Android developer's are true angles",
      'When I see iPhone users',
      'We will install our app in here.',
      'To all android developers out there.',
      'My cool pic.',
    ],
    [
      require('../../assets/images/tzuyu_1.jpg'),
      require('../../assets/images/tzuyu_2.jpg'),
      require('../../assets/images/tzuyu_3.jpg'),
      require('../../assets/images/tzuyu_4.jpeg'),
      require('../../assets/images/tzuyu_5.jpg'),
      require('../../assets/images/tzuyu_6.jpg'),
    ],
  ),
  prompts: [
    { title: "I wont't shut up about", answer: 'how great google is.' },
    { title: 'The key to my heart is', answer: 'clean code.' },
    { title: 'The thing you should know about me is', answer: 'i only use a single activity in my apps.' },
  ],
  age: 21,
  gender: 'Woman',
  height: `5' 7"`,
  location: 'Tainan',
  ethnicity: 'South Asian',
  education: 'Hanlim',
  religion: 'Buddhist',
  country: 'Taiwan',
};

// Photos and prompts shown on the signed-in user's own profile preview.
export const userProfile: Pick<Person, 'photos' | 'prompts'> = {
  photos: photos(
    [
      'my logo soo cool',
      'Hey',
      'Build week.',
      'Always put trash in trash can.',
      'Android is my name, fixing things is my game.',
      'My not so favorite mode of transport',
    ],
    [
      require('../../assets/images/and1.png'),
      require('../../assets/images/and2.jpg'),
      require('../../assets/images/and3.png'),
      require('../../assets/images/and4.jpg'),
      require('../../assets/images/and5.jpg'),
      require('../../assets/images/and6.png'),
    ],
  ),
  prompts: [
    { title: 'I geek out on', answer: 'Sweets.' },
    { title: "I'll know it's time to delete WATL when", answer: 'I complete my project.' },
    { title: 'I take pride in', answer: 'being open source.' },
  ],
};

export const discoverQueue = [lisa, tzuyu];
