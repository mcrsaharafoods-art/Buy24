import { APP_NAME } from "@/lib/constants";

export function SiteFooter({ supportEmail }: { supportEmail: string }) {
  return (
    <footer className="mt-16 border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <a href={`mailto:${supportEmail}`} className="hover:text-foreground">
          {supportEmail}
        </a>
      </div>
    </footer>
  );
}
