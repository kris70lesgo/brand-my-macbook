import { useEffect, useRef, useState } from "react";
import "./final-look.css";

type Slot = { id: number; brand: string | null; logoUrl?: string | null };
type Position = { id: number; x: number; y: number; width: number; aspect: number; tone: string };

const SOURCE_WIDTH = 1536;
const PERSPECTIVE = "matrix3d(1.2210538621, -0.0863897834, 0, 0.0001186462, 0.1040580007, 1.1810178003, 0, -0.0000644276, 0, 0, 1, 0, 354, 111, 0, 1)";
const POSITIONS: Position[] = [
  { id: 1, x: 8, y: 14, width: 27, aspect: 9.5 / 5.5, tone: "mint" }, { id: 2, x: 38, y: 11, width: 27, aspect: 9.5 / 5.5, tone: "ink" }, { id: 3, x: 70, y: 10, width: 24, aspect: 9.5 / 5.5, tone: "sun" },
  { id: 4, x: 9, y: 42, width: 18, aspect: 1, tone: "blue" }, { id: 5, x: 27, y: 42, width: 17, aspect: 1, tone: "coral" }, { id: 6, x: 64, y: 43, width: 18, aspect: 1, tone: "plum" },
  { id: 7, x: 81, y: 43, width: 16, aspect: 1, tone: "sun" }, { id: 8, x: 9, y: 73, width: 27, aspect: 9.5 / 4, tone: "mint" }, { id: 9, x: 40, y: 73, width: 28, aspect: 9.5 / 4, tone: "plum" }, { id: 10, x: 72, y: 73, width: 25, aspect: 9.5 / 4, tone: "blue" },
];

/** Display-only preview. Completed purchase logos are supplied by the server. */
export function MacbookStickerDisplay({ slots }: { slots: Slot[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const updateScale = () => setScale(element.clientWidth / SOURCE_WIDTH);
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div className="final-macbook" ref={host} aria-label="Final MacBook campaign preview">
    <img src="/finallook.png" alt="Angled silver MacBook" className="final-macbook__image" />
    <div className="final-macbook__surface-scale" style={{ transform: `scale(${scale})` }} aria-hidden="true"><div className="lid-perspective-surface" style={{ width: 1000, height: 700, transform: PERSPECTIVE }}>
      {POSITIONS.map((position) => {
        const slot = slots.find((item) => item.id === position.id);
        return <div key={position.id} className={`final-sticker final-sticker--${position.tone} ${slot?.logoUrl ? "final-sticker--purchased" : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, width: `${position.width}%`, aspectRatio: String(position.aspect) }}>
          {slot?.logoUrl ? <img src={slot.logoUrl} alt={`${slot.brand ?? "Brand"} logo`} /> : <span>YOUR<br />LOGO</span>}
        </div>;
      })}
    </div></div>
  </div>;
}
