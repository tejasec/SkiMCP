import React from 'react';
import {
  ShieldCheck,
  TriangleAlert,
  Siren,
  Search,
  Globe,
  GitCompareArrows,
  ClipboardCopy,
  Library,
  Target,
  Terminal,
  FlaskConical,
  Folder,
  Link,
  KeyRound,
  Gauge,
  History,
  ScrollText,
  FileJson,
  Sprout,
  Package,
  Save,
  ChartColumn,
  Trash2,
  Moon,
  Sun,
  CalendarDays,
  Trophy,
  Medal,
  Blocks,
  CircleCheck,
  Check,
  X,
  CircleX,
  Layers,
  Asterisk,
  EyeOff,
  Diff,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  CornerDownLeft,
  CornerDownRight,
  ArrowRight,
  type LucideProps,
} from 'lucide-react';

export type IconName =
  | 'shield'
  | 'shield-check'
  | 'warning'
  | 'critical'
  | 'search'
  | 'globe'
  | 'diff'
  | 'copy'
  | 'library'
  | 'target'
  | 'terminal'
  | 'flask'
  | 'folder'
  | 'link'
  | 'key'
  | 'gauge'
  | 'history'
  | 'scroll'
  | 'file-json'
  | 'sprout'
  | 'package'
  | 'save'
  | 'chart'
  | 'trash'
  | 'moon'
  | 'sun'
  | 'calendar'
  | 'trophy'
  | 'medal'
  | 'blocks'
  | 'check-circle'
  | 'check'
  | 'close'
  | 'close-circle'
  | 'layers'
  | 'asterisk'
  | 'eye-off'
  | 'diff-delta'
  | 'chevron-down'
  | 'chevron-up'
  | 'external-link'
  | 'corner-down-left'
  | 'sub-item'
  | 'arrow-right';

const ICON_REGISTRY: Record<IconName, React.ComponentType<LucideProps>> = {
  'shield': ShieldCheck,
  'shield-check': ShieldCheck,
  'warning': TriangleAlert,
  'critical': Siren,
  'search': Search,
  'globe': Globe,
  'diff': GitCompareArrows,
  'copy': ClipboardCopy,
  'library': Library,
  'target': Target,
  'terminal': Terminal,
  'flask': FlaskConical,
  'folder': Folder,
  'link': Link,
  'key': KeyRound,
  'gauge': Gauge,
  'history': History,
  'scroll': ScrollText,
  'file-json': FileJson,
  'sprout': Sprout,
  'package': Package,
  'save': Save,
  'chart': ChartColumn,
  'trash': Trash2,
  'moon': Moon,
  'sun': Sun,
  'calendar': CalendarDays,
  'trophy': Trophy,
  'medal': Medal,
  'blocks': Blocks,
  'check-circle': CircleCheck,
  'check': Check,
  'close': X,
  'close-circle': CircleX,
  'layers': Layers,
  'asterisk': Asterisk,
  'eye-off': EyeOff,
  'diff-delta': Diff,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'external-link': ArrowUpRight,
  'corner-down-left': CornerDownLeft,
  'sub-item': CornerDownRight,
  'arrow-right': ArrowRight,
};

export interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  className?: string;
  size?: number | string;
}

export function Icon({
  name,
  size = '1em',
  className = '',
  style,
  ...rest
}: IconProps) {
  const Component = ICON_REGISTRY[name];
  if (!Component) {
    console.warn(`[Icon] Unknown icon name: "${name}"`);
    return null;
  }
  return (
    <Component
      size={size}
      className={`inline-icon ${className}`}
      style={{
        verticalAlign: '-0.15em',
        display: 'inline-block',
        ...style,
      }}
      {...rest}
    />
  );
}

export default Icon;
