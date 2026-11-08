declare module '*.svg' {
  import type { ComponentType } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const SvgComponent: ComponentType<SvgProps>;
  export default SvgComponent;
}

declare module '*.png' {
  const imageSource: import('react-native').ImageSourcePropType;
  export default imageSource;
}

declare module '*.css';
