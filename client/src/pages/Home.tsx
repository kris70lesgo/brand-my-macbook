/**
 * Reference-first minimal auction direction: warm paper, Swiss editorial type,
 * Signal Green proof points, and a tactile laptop-lid auction board as the hero.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Info,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { MacbookStickerDisplay } from "@/components/MacbookStickerDisplay";

type Currency = "USD";
type AuctionSlot = {
  id: number;
  position: string;
  size: "S" | "M" | "L";
  dimensions: string;
  brand: string | null;
  price: number;
  bids: number;
  className: string;
  tone: "mint" | "ink" | "sun" | "coral" | "blue" | "plum";
  logoUrl?: string | null;
};

const faqs = [
  ["Is this real?", "Yes. The campaign is a live concept page: the winning brands receive a die-cut vinyl decal on the laptop lid, plus a permanent link from this launch page."],
  ["Why this MacBook?", "It is the daily workstation behind product experiments, client work, and new apps. The sponsorship surface is deliberately practical: it goes where the work goes."],
  ["What does a winning bid include?", "A premium vinyl logo decal in your selected spot, the visibility that comes from daily use in public workspaces, and a linked mention in the final campaign roster."],
  ["How does bidding work?", "Choose a spot and leave a bidding intent. This prototype confirms your selection locally; a production version would connect it to a secure payment and bid-validation flow."],
  ["Can any brand join?", "Brands are reviewed for fit before being added to a real laptop. This preserves a clear, useful surface for everyone represented on it."],
];

const money = (amount: number, _currency: Currency) => {
  return `$${amount.toLocaleString("en-US")}`;
};

function BrandStamp({ slot }: { slot: AuctionSlot }) {
  const custom = slot.brand === "pixel / state";
  if (slot.logoUrl) {
    return <div className="brand-stamp brand-stamp--logo"><img src={slot.logoUrl} alt={`${slot.brand ?? "Current bidder"} logo`} /></div>;
  }
  return (
    <div className={`brand-stamp brand-stamp--${slot.tone}`}>
      <span className={custom ? "brand-stamp__pixel" : "brand-stamp__name"}>{slot.brand ?? "Open"}</span>
    </div>
  );
}

export default function Home() {
  const currency: Currency = "USD";
  const [slots, setSlots] = useState<AuctionSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AuctionSlot | null>(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidValue, setBidValue] = useState("");
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [view, setView] = useState<"auction" | "final">("auction");
  const [waitlist, setWaitlist] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const loadSlots = () => fetch("/api/slots").then((response) => response.ok ? response.json() : Promise.reject()).then(setSlots).catch(() => setCheckoutError("Live auction data is temporarily unavailable."));
    loadSlots();
    const refresh = window.setInterval(loadSlots, 15_000);
    return () => window.clearInterval(refresh);
  }, []);

  const raised = useMemo(() => slots.reduce((total, slot) => total + (slot.bids ? slot.price : 0), 0), [slots]);
  const selectedBid = selectedSlot ? Math.max(selectedSlot.price, 50) : 50;
  const depositAmount = Math.ceil((Number(bidValue) || selectedBid) * 0.2);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  }

  function chooseSlot(slot: AuctionSlot) {
    setSelectedSlot(slot);
    setBidValue(String(slot.price + 12));
    setBidSubmitted(false);
    setBidModalOpen(true);
  }

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("checkout_token");
    if (!token) return;
    const savedLogo = sessionStorage.getItem(`plan-my-mapbook-logo:${token}`);
    if (!savedLogo) return;
    let cancelled = false;
    const complete = async () => {
      for (let attempt = 0; attempt < 12 && !cancelled; attempt += 1) {
        const status = await fetch(`/api/bids/status/${token}`).then((response) => response.json());
        if (status.paid) {
          const response = await fetch("/api/bids/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkoutToken: token, logoDataUrl: savedLogo }) });
          if (!response.ok) throw new Error((await response.json()).error);
          sessionStorage.removeItem(`plan-my-mapbook-logo:${token}`);
          const slots = await fetch("/api/slots").then((response) => response.json());
          setSlots(slots);
          window.history.replaceState({}, "", window.location.pathname);
          setBidSubmitted(true);
          setBidModalOpen(true);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      if (!cancelled) setCheckoutError("Payment is still being confirmed. Keep this page open and retry shortly.");
    };
    complete().catch((error) => setCheckoutError(error instanceof Error ? error.message : "Unable to save your logo."));
    return () => { cancelled = true; };
  }, []);

  async function submitBid(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return;
    const form = new FormData(event.currentTarget);
    const logo = form.get("logo");
    if (!(logo instanceof File) || !logo.size) { setCheckoutError("Please upload your logo before checkout."); return; }
    if (logo.size > 5 * 1024 * 1024) { setCheckoutError("Logo must be 5 MB or smaller."); return; }
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const logoDataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Unable to read logo.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(logo); });
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slotId: selectedSlot.id, bidAmount: Number(bidValue), brandName: form.get("brandName"), contactName: form.get("contactName"), companyName: form.get("companyName"), email: form.get("email"), website: form.get("website"), xHandle: form.get("xHandle") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to start checkout.");
      sessionStorage.setItem(`plan-my-mapbook-logo:${result.checkoutToken}`, logoDataUrl);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to start checkout.");
      setCheckoutLoading(false);
    }
  }

  async function joinWaitlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWaitlistLoading(true);
    setWaitlistError("");
    try {
      const email = new FormData(event.currentTarget).get("email");
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to join the waitlist.");
      setWaitlist(true);
    } catch (error) {
      setWaitlistError(error instanceof Error ? error.message : "Unable to join the waitlist.");
    } finally {
      setWaitlistLoading(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Brand My Mac home">
          <img src="/brand-my-mapbook-logo.svg" alt="" className="wordmark__mark" />
          <span>brand my mac</span>
        </a>

        <nav className={menuOpen ? "top-nav top-nav--open" : "top-nav"} aria-label="Primary navigation">
          <button onClick={() => scrollTo("spots")}>Live auction</button>
          <button onClick={() => scrollTo("how")}>How it works</button>
          <button onClick={() => scrollTo("machine")}>The machine</button>
          <button onClick={() => scrollTo("faq")}>FAQ</button>
        </nav>

        <div className="header-actions">
          <div className="currency-toggle" aria-label="Auction currency"><span>$ USD</span></div>
          <button className="button button--ink button--small" onClick={() => scrollTo("spots")}>Get a spot</button>
          <button className="menu-trigger" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">
            {menuOpen ? <X size={19} /> : <span />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-rule">
          <div className="hero__status"><span /> Live auction · {slots.filter((slot) => slot.bids > 0).length} sponsored spots</div>
          <h1>Your brand, on my Mac.</h1>
          <p className="hero__lede">Your logo travels with me on a founder’s best friend: the laptop.</p>

          <div className="funding-row" aria-label="Campaign funding status">
            <div className="funding-row__total"><strong>{money(raised, currency)}</strong><span>raised</span></div>
            <div className="funding-row__goal"><span>paid deposits only</span><div className="progress-bar"><i style={{ width: `${Math.min((raised / 2959) * 100, 100)}%` }} /></div></div>
          </div>
          <p className="countdown"><Clock3 size={13} /> Auction ends in <b>12d 18h 32m</b> · select any spot to make a bid</p>

          <div className={view === "final" ? "lid-stage lid-stage--final" : "lid-stage"} aria-label={view === "final" ? "Final MacBook look with sponsor decals" : "Interactive laptop lid auction board"}>
            {view === "final" ? <MacbookStickerDisplay slots={slots} /> : <>
              <div className="lid-stage__ambient" />
              <img className="lid-stage__image lid-stage__image--supplied" src="/image1.png" alt="Silver MacBook lid used as the live auction surface" />
              <div className="auction-board">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`auction-slot ${slot.className} ${selectedSlot?.id === slot.id ? "auction-slot--selected" : ""}`}
                    onClick={() => chooseSlot(slot)}
                    aria-label={`Select spot ${slot.id}: ${slot.position}, current bid ${money(slot.price, currency)}`}
                  >
                    <span className="auction-slot__id">{String(slot.id).padStart(2, "0")}</span>
                    <span className="auction-slot__content"><BrandStamp slot={slot} /><span className="auction-slot__holder">{slot.brand ? `Held by ${slot.brand}` : "Open"}</span><span className="auction-slot__price">{money(slot.price, currency)}</span><span className="auction-slot__action">{slot.bids ? "Outbid" : "Bid now"}</span></span>
                    <span className="auction-slot__hover-cta">Outbid</span>
                  </button>
                ))}
                <div className="center-seal" aria-hidden="true"><div className="center-seal__drop" /><span>my<br />mac</span></div>
              </div>
            </>}
          </div>

          <div className="view-toggle" aria-label="Auction board view">
            <button className={view === "auction" ? "is-active" : ""} onClick={() => setView("auction")}><CircleDollarSign size={15} /> Live auction</button>
            <button className={view === "final" ? "is-active" : ""} onClick={() => setView("final")}><Sparkles size={15} /> Final look</button>
          </div>
          <p className="hero__caption">{view === "final" ? "The completed lid—every mark placed around the center emblem." : "Tap any sticker zone to check the current bid."}</p>
        </section>

        <section className="statement section-rule">
          <div className="statement__copy">
            <p className="eyebrow"><span /> One laptop. Ten brands. Everywhere work happens.</p>
            <h2>I’m financing a new workstation by selling the surface everyone sees: the lid.</h2>
            <p>Cafés, coworking spaces, small events, train tables—your mark lives in the places a solo founder actually works.</p>
            <div className="statement__actions">
              <button className="button button--ink" onClick={() => scrollTo("spots")}>Get a spot <ArrowDownRight size={17} /></button>
              <button className="text-link" onClick={() => scrollTo("how")}>How it works <ArrowDownRight size={16} /></button>
            </div>
          </div>
          <div className="statement__aside"><span className="statement__digit">01</span><p>Everyone notices the emblem.<br />Put your name around it.</p></div>
        </section>

        <section id="spots" className="auction-section section-rule">
          <div className="section-heading">
            <div>
              <h2>The auction, live.</h2>
              <p className="section-heading__lede">Every spot shows its current top bid.</p>
              <p className="section-heading__detail">Every spot begins at {money(50, currency)}. Place a higher bid to lead the auction.</p>
            </div>
          </div>
          <div className="auction-table-wrap">
            <table className="auction-table">
              <thead><tr><th>Spot</th><th>Size</th><th>Held by</th><th>Current<br />bid</th><th><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {[...slots].sort((a, b) => b.price - a.price).map((slot) => (
                  <tr key={slot.id} className={selectedSlot?.id === slot.id ? "auction-row--selected" : ""}>
                    <td className="table-spot"><span className="table-spot-number">{slot.id}</span><strong>{slot.position}</strong></td>
                    <td className="table-size"><b>{slot.size}</b><span>{slot.dimensions}</span></td>
                    <td className="table-held"><BrandStamp slot={slot} /></td>
                    <td className="table-bid-stack"><strong>{money(slot.price, currency)}</strong><span className="bid-count">{slot.bids} {slot.bids === 1 ? "bid" : "bids"}</span></td>
                    <td className="table-action"><button className="table-bid" onClick={() => chooseSlot(slot)}>Outbid</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>

        <section id="how" className="how-section section-rule">
          <div className="how-section__intro"><p className="eyebrow"><span /> Three steps</p><h2>Small surface.<br />Long way to travel.</h2></div>
          <ol className="steps-list">
            <li><span>01</span><div><h3>Pick your tile and size.</h3><p>Ten zones in three sticker sizes, each priced for its visibility and proximity to the center.</p></div></li>
            <li><span>02</span><div><h3>Lead when the auction closes.</h3><p>The best bid at the deadline wins the spot. A real campaign would follow with an approval and payment link.</p></div></li>
            <li><span>03</span><div><h3>Your sticker rides along.</h3><p>A die-cut vinyl decal becomes part of the daily workstation—and visible wherever it is opened or carried.</p></div></li>
          </ol>
        </section>

        <section id="machine" className="machine-section section-rule">
          <div className="machine-copy"><p className="eyebrow"><span /> The machine</p><h2>What the money buys.</h2><p className="machine-copy__lede">The target is a workstation made to keep up with product work on the move. Anything beyond the goal becomes fuel for the work—and the places the work travels.</p>
            <div className="machine-price"><span>Target price</span><strong>{money(2959, currency)}</strong></div>
            <a className="text-link" href="https://www.apple.com/macbook-pro/" target="_blank" rel="noreferrer">Check comparable pricing <ExternalLink size={15} /></a>
          </div>
          <div className="machine-card">
          <div className="machine-card__visual"><img src="/machineimage.png" alt="Close detail of the campaign MacBook" /></div>
            <div className="spec-grid">
              <div><span>Machine</span><strong>Pro 14, Silver</strong></div><div><span>Chip</span><strong>M-series, 10-core</strong></div>
              <div><span>Memory</span><strong>32 GB unified</strong></div><div><span>Storage</span><strong>1 TB SSD</strong></div>
              <div><span>Display</span><strong>14.2” XDR</strong></div><div><span>Keyboard</span><strong>Touch ID, backlit</strong></div>
            </div>
          </div>
        </section>

        <section id="faq" className="faq-section section-rule">
          <div className="faq-section__title"><p className="eyebrow"><span /> Details</p><h2>Questions<br />& answers.</h2><p>Everything that a real campaign needs to make clear before you pick a spot.</p></div>
          <div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className="waitlist-section">
          <div className="waitlist-section__image"><img src="/waitlistimage.png" alt="A founder workspace with a stickered laptop lid" /></div>
          <div className="waitlist-section__content"><p className="eyebrow"><span /> Take your own machine</p><h2>Want to do this with your own laptop?</h2><p>You set the machine and the prices. The stickers, bidding system, and campaign page follow.</p>
            {waitlist ? <div className="waitlist-success"><Check size={19} /> You’re on the early list.</div> : <form onSubmit={joinWaitlist}><label className="sr-only" htmlFor="email">Email address</label><input id="email" name="email" type="email" required placeholder="your@email.com" /><button className="button button--ink" type="submit" disabled={waitlistLoading}>{waitlistLoading ? "Joining…" : <>Join waitlist <ArrowUpRight size={17} /></>}</button></form>}
            {waitlistError && <p role="alert" className="form-error">{waitlistError}</p>}
            <small>One thoughtful email when it opens. Nothing else.</small>
          </div>
        </section>

        <section className="founder-section section-rule">
          <div className="founder-mark"><img src="/brand-my-mapbook-logo.svg" alt="" /></div>
          <div><p className="eyebrow"><span /> A note from the builder</p><h2>Built in public. Carried in public.</h2><p>I’m a solo product builder making software, trying new formats, and turning a necessary tool into a small shared billboard. For a real campaign, reach out with your mark and where it should point.</p></div>
          <div className="founder-links"><a href="mailto:hello@example.com"><Mail size={16} /> Send an email</a><a href="#top" onClick={(event) => { event.preventDefault(); scrollTo("top"); }}>Back to top <ArrowUpRight size={16} /></a></div>
        </section>
      </main>

      <Dialog open={bidModalOpen} onOpenChange={setBidModalOpen}>
        <DialogContent className="bid-dialog" showCloseButton={false}>
          {selectedSlot && (
            <div className="bid-dialog__frame">
              <button className="bid-dialog__close" onClick={() => setBidModalOpen(false)} aria-label="Close bid form"><X size={20} /></button>
              {bidSubmitted ? (
                <div className="bid-success" aria-live="polite">
                  <div className="bid-success__mark"><Check size={25} /></div>
                  <DialogTitle>Your bid intent is ready.</DialogTitle>
                  <DialogDescription>We’ve reserved the details for spot {selectedSlot.id}. A real production flow would continue to secure payment from here.</DialogDescription>
                  <button className="button button--blue" onClick={() => setBidModalOpen(false)}>Back to auction</button>
                </div>
              ) : (
                <form className="bid-form" onSubmit={submitBid}>
                  <div className="bid-form__intro">
                    <DialogTitle>Spot {selectedSlot.id} · {selectedSlot.position}</DialogTitle>
                    <DialogDescription>{selectedSlot.size === "L" ? "Large" : selectedSlot.size === "M" ? "Medium" : "Small"} sticker · {selectedSlot.dimensions}</DialogDescription>
                    <p>Current bid <strong>{money(selectedSlot.price, currency)}</strong> by {selectedSlot.brand} · {selectedSlot.bids} bids</p>
                  </div>

                  <label className="field field--wide"><span>Your bid (USD)</span><div className="currency-input"><input type="number" min={selectedBid} value={bidValue} onChange={(event) => setBidValue(event.target.value)} required /><b>$</b></div><small>Minimum {money(selectedBid, currency)}</small></label>

                  <div className="deposit-summary">
                    <div><span>Deposit, 20% of {money(Number(bidValue) || selectedBid, currency)}</span><strong>{money(depositAmount, currency)}</strong></div>
                    <div><span>Due now</span><strong>{money(depositAmount, currency)}</strong></div>
                    <p>Refunded in full if you don’t win. If you do, the remainder is charged only when the auction closes.</p>
                  </div>

                  <div className="form-grid">
                    <label className="field"><span>Brand name</span><input name="brandName" required placeholder="Microsoft" /></label>
                    <label className="field"><span>Your name</span><input name="contactName" required placeholder="Jane Doe" /></label>
                    <label className="field"><span>Company name</span><input name="companyName" required placeholder="Microsoft Corporation" /></label>
                    <label className="field"><span>Email</span><input name="email" type="email" required placeholder="you@company.com" /></label>
                    <label className="field"><span>Website <em>(optional)</em></span><input name="website" type="url" placeholder="https://yourbrand.com" /></label>
                    <label className="field"><span>X handle <em>(optional)</em></span><input name="xHandle" placeholder="@yourbrand" /></label>
                    <label className="file-field"><span>Logo</span><input name="logo" type="file" required accept="image/png,image/jpeg,image/svg+xml" /><i>Upload your logo <ArrowUpRight size={15} /></i></label>
                  </div>

                  {checkoutError && <p role="alert" className="form-error">{checkoutError}</p>}
                  <div className="bid-form__footer"><button className="button button--blue" type="submit" disabled={checkoutLoading}>{checkoutLoading ? "Opening secure checkout…" : <>Pay {money(depositAmount, "USD")} deposit <ArrowUpRight size={17} /></>}</button><small><Info size={14} /> Your deposit is 20% of the bid. Details and logo are stored only after Dodo confirms payment.</small></div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="site-footer">
        <span>© 2026 Brand My Mac</span><div><a href="#faq">Privacy</a><a href="#faq">Terms</a></div><p>This independent concept is not affiliated with or endorsed by any laptop manufacturer.</p>
      </footer>
    </div>
  );
}
