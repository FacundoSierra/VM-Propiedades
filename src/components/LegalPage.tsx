import type { ReactNode } from "react";
import PageHero from "./PageHero";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} />
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <div className="space-y-6 text-sm leading-relaxed text-graphite-soft [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-graphite [&_strong]:text-graphite">
          {children}
        </div>
      </section>
    </>
  );
}
