import { ReactNode } from "react";

export default function ActionCard({
  icon,
  label,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<any>;
  label?: string;
  title: string;
  description: React.ReactNode;
  href?: string;
}) {
  const Icon = icon;
  return (
    <section className="rounded-xl border border-border-light dark:border-border-dark p-8">
      <div className="mb-8 flex items-center justify-between">
        <Icon size={24} className="text-accent" aria-hidden="true" />
        {label && (
          <span className="text-xs uppercase tracking-[0.2em] text-muted">{label}</span>
        )}
      </div>
      <h2 className="text-lg font-bold mb-1">{title}</h2>
      <p className="mb-8 text-sm text-muted">{description}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-light px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
        >
          {title}
        </a>
      ) : null}
    </section>
  );
}
