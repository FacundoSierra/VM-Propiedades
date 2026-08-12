interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  dark?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  dark = false,
}: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-3 font-serif text-3xl leading-tight tracking-tight md:text-4xl ${
          dark ? "text-cream" : "text-graphite"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-base leading-relaxed ${
            dark ? "text-cream/70" : "text-graphite-soft"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
