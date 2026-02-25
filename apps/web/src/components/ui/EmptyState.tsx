export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <p className="text-[hsl(var(--muted-foreground))]">{message}</p>
    </div>
  );
}
