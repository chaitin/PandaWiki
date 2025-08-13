/* eslint-disable @typescript-eslint/no-explicit-any */
import Lottie from 'lottie-react';
import { CSSProperties } from 'react';

const LottieIcon = ({
  id,
  src,
  loop = true,
  autoplay = true,
  style,
}: {
  id: string;
  src: any;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
}) => {
  return (
    <Lottie
      id={id}
      animationData={src}
      loop={loop}
      autoplay={autoplay}
      style={{ ...style }}
    />
  );
};

export default LottieIcon;
