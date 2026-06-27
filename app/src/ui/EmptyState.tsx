interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="bg-card p-12 rounded-xl text-center text-subtle">
      <p className="text-lg font-medium mb-1">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
