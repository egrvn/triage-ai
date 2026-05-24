import { motion, type SVGMotionProps } from "framer-motion";

type IconProps = SVGMotionProps<SVGSVGElement> & {
  size?: number;
};

const pathProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

function Svg({ size = 24, children, ...props }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      initial={{ opacity: 0.8, scale: 0.96 }}
      whileHover={{ opacity: 1, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
      {...props}
    >
      {children}
    </motion.svg>
  );
}

export function SuccessIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M20 6 9 17l-5-5" /></Svg>;
}

export function MenuCloseIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M5 7h14M5 12h14M5 17h14" /></Svg>;
}

export function PlayPauseIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M8 5v14l11-7-11-7Z" /><motion.path {...pathProps} d="M4 5v14" /></Svg>;
}

export function LockUnlockIcon(props: IconProps) {
  return <Svg {...props}><motion.rect {...pathProps} x="4" y="10" width="16" height="10" rx="2" /><motion.path {...pathProps} d="M8 10V7a4 4 0 0 1 7.4-2.1" /></Svg>;
}

export function CopiedIcon(props: IconProps) {
  return <Svg {...props}><motion.rect {...pathProps} x="8" y="8" width="11" height="11" rx="2" /><motion.path {...pathProps} d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></Svg>;
}

export function NotificationIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><motion.path {...pathProps} d="M13.7 21a2 2 0 0 1-3.4 0" /></Svg>;
}

export function HeartIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></Svg>;
}

export function DownloadDoneIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M12 3v11" /><motion.path {...pathProps} d="m7 9 5 5 5-5" /><motion.path {...pathProps} d="M5 20h14" /></Svg>;
}

export function SendIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="m22 2-7 20-4-9-9-4 20-7Z" /><motion.path {...pathProps} d="M22 2 11 13" /></Svg>;
}

export function ToggleIcon(props: IconProps) {
  return <Svg {...props}><motion.rect {...pathProps} x="3" y="7" width="18" height="10" rx="5" /><motion.circle {...pathProps} cx="15" cy="12" r="3" /></Svg>;
}

export function EyeToggleIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><motion.circle {...pathProps} cx="12" cy="12" r="3" /></Svg>;
}

export function VolumeIcon(props: IconProps) {
  return <Svg {...props}><motion.path {...pathProps} d="M11 5 6 9H3v6h3l5 4V5Z" /><motion.path {...pathProps} d="M15 9.5a4 4 0 0 1 0 5" /><motion.path {...pathProps} d="M18 7a8 8 0 0 1 0 10" /></Svg>;
}
