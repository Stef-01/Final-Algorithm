import { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { IconName, icons } from './icons';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

// `color` recolours every filled/stroked shape, like an Android `tint`.
export function Icon({ name, size = 24, color, style }: Props) {
  let xml: string = icons[name];
  if (color) {
    xml = xml
      .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${color}"`);
  }
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}
