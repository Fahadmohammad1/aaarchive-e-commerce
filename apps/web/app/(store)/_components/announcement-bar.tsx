export function AnnouncementBar({ message }: { message: string }) {
  return (
    <p className="border-b bg-sunken py-2 text-center text-muted-foreground type-mono-micro">
      {message}
    </p>
  );
}
