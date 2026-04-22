export default function SiteFooter() {
  const columns = [
    {
      heading: "Resources",
      links: ["Support", "Crisis Resources", "Consultants"],
    },
    {
      heading: "Legal",
      links: ["Privacy Policy", "Terms of Service", "Contact Us"],
    },
  ];

  return (
    <footer className="border-t border-border bg-muted/30 px-8 py-14 md:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-2">
        <div className="space-y-4">
          <div className="font-heading text-lg font-bold tracking-tight text-foreground">
            CompanionX
          </div>
          <p className="max-w-xs font-sans text-[13px] leading-relaxed text-muted-foreground">
            Dedicated to the architectural integrity of mental health through
            anonymity, precision, and clinical excellence.
          </p>
          <p className="pt-2 font-sans text-[10px] text-primary">
            © 2025 CompanionX. All rights reserved.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 font-sans">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <span className="border-b border-border pb-2 text-[10px] font-semibold text-foreground">
                {col.heading}
              </span>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-[12px] tracking-wider text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
