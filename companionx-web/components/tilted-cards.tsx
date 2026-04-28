import Image from "next/image";

const cards = [
  {
    src: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=750&fit=crop&crop=face",
    alt: "Professional consultant",
    caption: "Professional Consultant",
    rotation: "-rotate-[4deg]",
    translateY: "-translate-y-2",
    hoverTranslateY: "hover:-translate-y-4",
  },
  {
    src: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&h=750&fit=crop",
    alt: "Client in a safe space",
    caption: "Safe & Anonymous",
    rotation: "rotate-[6deg]",
    translateY: "translate-y-4",
    hoverTranslateY: "hover:translate-y-2",
  },
];

export default function TiltedCards() {
  return (
    <div className="relative flex h-[420px] w-full items-center justify-center">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`absolute ${card.rotation} ${card.translateY} ${card.hoverTranslateY} transition-all duration-300 ease-out hover:rotate-0 hover:shadow-2xl`}
        >
          <div className="w-[260px] border border-border bg-card shadow-lg rounded-none">
            <div className="relative h-[280px] w-full overflow-hidden">
              <Image
                src={card.src}
                alt={card.alt}
                fill
                className="object-cover"
                sizes="260px"
              />
            </div>
            <div className="border-t border-border px-4 py-3">
              <p className="font-sans text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
                {card.caption}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
