import Image from "next/image";

export default function LaunchpadBrand({
  size = 36,
  wordmarkClassName = "text-slate-900",
}: {
  size?: number;
  wordmarkClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/launchpad-mark.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0"
        priority
      />
      <span className={`font-bold tracking-tight ${wordmarkClassName}`}>LaunchPAD</span>
    </span>
  );
}
