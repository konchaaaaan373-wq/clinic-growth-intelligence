// =========================================================
// 集患スタイルのアイコン解決
//
// ルール: UIにOS依存のデフォルト絵文字は使わない。
// アイコンは @phosphor-icons/react（duotone）に統一し、
// 環境（OS・ブラウザ・PDF）で見た目が変わらないようにする。
// =========================================================

import {
  Books,
  Buildings,
  Compass,
  MagnifyingGlass,
  Megaphone,
  Plant,
  Scales,
  Sparkle,
  Trophy,
  type Icon,
} from "@phosphor-icons/react";
import type { ClinicStyleIconKey, ClinicStyleType } from "../lib/types";

const ICONS: Record<ClinicStyleIconKey, Icon> = {
  trophy: Trophy,
  search: MagnifyingGlass,
  books: Books,
  megaphone: Megaphone,
  compass: Compass,
  town: Buildings,
  sprout: Plant,
  scales: Scales,
};

/** 旧レポート（絵文字のみ保持）からの互換マッピング */
const EMOJI_TO_KEY: Record<string, ClinicStyleIconKey> = {
  "🏆": "trophy",
  "🔍": "search",
  "📚": "books",
  "📣": "megaphone",
  "🧭": "compass",
  "🏘": "town",
  "🌱": "sprout",
  "⚖️": "scales",
};

type Props = {
  style: ClinicStyleType;
  size?: number;
  className?: string;
};

export default function StyleIcon({ style, size = 40, className }: Props) {
  const key = style.icon ?? (style.emoji ? EMOJI_TO_KEY[style.emoji] : undefined);
  const IconComponent = (key && ICONS[key]) || Sparkle;
  return <IconComponent size={size} weight="duotone" className={className} aria-hidden />;
}
