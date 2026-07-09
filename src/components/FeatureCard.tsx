type Props = {
  icon?: React.ReactNode;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: Props) {
  return (
    <div className="card p-5 transition hover:shadow-cardHover">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>
    </div>
  );
}
