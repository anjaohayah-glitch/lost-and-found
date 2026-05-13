import Svg, { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';

type FoxLogoProps = {
  size?: number;
};

export default function FoxLogo({ size = 140 }: FoxLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 140 140" accessibilityLabel="FoxFindz logo">
      <Circle cx="70" cy="70" r="66" fill="#FFF0EA" />
      <G>
        <Polygon points="35,47 47,15 62,49" fill="#FF6B35" />
        <Polygon points="78,49 93,15 105,47" fill="#FF6B35" />
        <Polygon points="41,46 49,27 58,49" fill="#E05520" />
        <Polygon points="82,49 91,27 99,46" fill="#E05520" />
        <Ellipse cx="70" cy="73" rx="45" ry="43" fill="#FF6B35" />
        <Path
          d="M31 67 C38 101 52 119 70 119 C88 119 102 101 109 67 C96 91 85 104 70 104 C55 104 44 91 31 67Z"
          fill="#FFF8F5"
        />
        <Ellipse cx="53" cy="67" rx="8" ry="9" fill="#FFFFFF" />
        <Ellipse cx="87" cy="67" rx="8" ry="9" fill="#FFFFFF" />
        <Ellipse cx="55" cy="68" rx="4.5" ry="5.5" fill="#1A0A00" />
        <Ellipse cx="89" cy="68" rx="4.5" ry="5.5" fill="#1A0A00" />
        <Circle cx="57" cy="65" r="1.7" fill="#FFFFFF" />
        <Circle cx="91" cy="65" r="1.7" fill="#FFFFFF" />
        <Ellipse cx="70" cy="85" rx="6" ry="4.5" fill="#E05520" />
        <Path
          d="M62 91 Q70 99 78 91"
          stroke="#E05520"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </G>
      <G transform="translate(89 90) rotate(-22)">
        <Circle cx="0" cy="0" r="14" fill="none" stroke="#1A0A00" strokeWidth="5" />
        <Path d="M10 10 L31 31" stroke="#1A0A00" strokeWidth="6" strokeLinecap="round" />
        <Circle cx="0" cy="0" r="9" fill="#FFFFFF" opacity={0.35} />
      </G>
    </Svg>
  );
}
