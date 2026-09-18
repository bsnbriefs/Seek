import NotificationBell from "./NotificationBell";
import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
const AdminPage = lazy(() => import("./AdminPage"));
const NotificationsPage = lazy(() => import("./NotificationsPage"));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center px-5">
          <p className="font-body text-sm text-red-700">{String(this.state.err.message || this.state.err)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  submitRequest,
  suggestNeedStructure,
  explainSeekNeed,
  seekAiAssist,
  submitCelebrateRsvp,
  getCelebrateRsvpCount,
  submitOffer,
  uploadOfferMedia,
  submitVolunteer,
  initializeDonation,
  verifyDonation,
  listPublishedRequests,
  getRequestEvidence,
  listLiveSupportCases,
  uploadRequestEvidence,
  listMatchedOfferRequestIds,
  mapRequestRow,
  getUserSession,
  userLogout,
  userSignUp,
  userSignIn,
  sendMagicLink,
  requestPasswordReset,
  startGoogleSignIn,
  captureAuthRedirect,
  listMyRequests,
  listMyOffers,
  listMyGifts,
  listReceivedForMe,
  refreshUserSession,
  getPublicMember,
  updateMyUsername,
  checkUsernameAvailable,
  listMyOfferInterestsSummary,
  deleteRejectedRequest,
  postRequestPublicUpdate,
  uploadAppreciationMedia,
  getRequestAppreciation,
  listPublishedImpact,
  listPublicOffers,
  getOfferMedia,
  submitOfferInterest,
  closeMyOffer,
  listMyOfferInterests,
  getOfferInterestCount,
  markOfferInterestStatus,
  uploadProfilePhoto,
  listCelebrateRsvps,
  updateCelebrateRsvpStatus,
  closeCelebrateInvite,
  getMyProfile,
  getCachedAvatarUrl,
  cacheAvatarUrl,
  listAppreciationStories,
  getPublishedImpactById,
  getSeekLiveStats,
  getOutreachRaised,
  listRecentGifts,
  listPublicSponsors,
  getPublicRequestById,
  listRequestDonors,
  submitSafetyReport,
  enableSeekPush,
  startSupportConversation,
  listSupportMessages,
  sendSupportMessage,
} from "./lib/seekApi";

import {
  listMyNotifications,
} from "./lib/notificationApi";
import { listCommunityInteractions, addCommunityReaction, addCommunityComment } from "./lib/communityApi";
import { getSeekViewCount, recordSeekView } from "./lib/viewApi";

import {
  adminLogin,
  getAdminSession,
  adminLogout,
  getAdminRequests,
  updateAdminRequestStatus
} from "./lib/adminApi";
  import {
  Menu, X, ArrowRight, HandHeart, HeartHandshake, Search, ShoppingBag,
  Utensils, Shirt, Stethoscope, GraduationCap, Home as HomeIcon, Baby,
  Package, Briefcase, Bus, AlertTriangle, Wallet, MoreHorizontal,
  ShieldCheck, BadgeCheck, Check, Clock, MapPin, ChevronRight, Users,
  Handshake, Building2, CheckCircle2, Upload, Mail, Phone, ArrowUpRight, Sun, Moon, Bell, Plus, User, Sparkles, Eye
} from "lucide-react";

/* ---------------------------------------------------------
   SEEK — community assistance platform (a project of BSN Foundation)
   Single-file demo build. Client-side only — no backend yet.
   Everything under "DEMO DATA" below is illustrative and will be
   replaced once Supabase is connected.
--------------------------------------------------------- */

const LOGO_SRC = "/seek-logo.png";

/* ---------------- Design tokens ---------------- */
const C = {
  deepTeal: "#0D3B3B",
  teal: "#1BAA9C",
  green: "#63C167",
  bg: "var(--seek-bg, #F2F5F3)",
  white: "var(--seek-card, #FFFFFF)",
  ink: "var(--seek-ink, #0F211F)",
};


const SEEK_LANGS = [
  { id: "en", label: "English" },
  { id: "pcm", label: "Nigerian Pidgin" },
  { id: "ha", label: "Hausa" },
  { id: "yo", label: "Yoruba" },
  { id: "ig", label: "Igbo" },
  { id: "fr", label: "Francais" },
  { id: "es", label: "Espanol" },
];
const SEEK_I18N = {
  en: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Ask for what you need. Offer what you can.",
    needHelp: "I need help",
    wantHelp: "I want to help",
    seeStories: "See stories",
    language: "Language",
  },
  pcm: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Ask wetin you need. Offer wetin you fit give.",
    needHelp: "I need help",
    wantHelp: "I wan help",
    seeStories: "See stories",
    language: "Language",
  },
  ha: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Nemi abin da kake bukata. Ba da abin da za ka iya.",
    needHelp: "Ina bukatar taimako",
    wantHelp: "Ina so in taimaka",
    seeStories: "Duba labarai",
    language: "Harshe",
  },
  yo: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Beere ohun ti o nilo. Fun ohun ti o le fun.",
    needHelp: "Mo nilo iranlowo",
    wantHelp: "Mo fe ran lowo",
    seeStories: "Wo awon itan",
    language: "Ede",
  },
  ig: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Rio ihe i choro. Nye ihe i nwere.",
    needHelp: "A choro m enyemaka",
    wantHelp: "A choro m inyere aka",
    seeStories: "Lee akuko",
    language: "Asusu",
  },
  fr: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Demandez ce dont vous avez besoin. Offrez ce que vous pouvez.",
    needHelp: "J'ai besoin d'aide",
    wantHelp: "Je veux aider",
    seeStories: "Voir les recits",
    language: "Langue",
  },
  es: {
    hero: "ASK. SEEK. FIND.",
    askOffer: "Pide lo que necesitas. Ofrece lo que puedas.",
    needHelp: "Necesito ayuda",
    wantHelp: "Quiero ayudar",
    seeStories: "Ver historias",
    language: "Idioma",
  },
};
function readSeekLang() {
  try { return localStorage.getItem("seek_lang") || "en"; } catch (_e) { return "en"; }
}
function tSeek(key) {
  const lang = readSeekLang();
  return (SEEK_I18N[lang] && SEEK_I18N[lang][key]) || SEEK_I18N.en[key] || key;
}

const FONTS = (
  <style>{`
    .font-display { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: -0.03em; }
    .font-body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: 0.005em; line-height: 1.6; }
    @keyframes seekSpinIn { from { transform: rotate(-90deg) scale(0.6); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }
    .seek-theme-icon { animation: seekSpinIn 0.35s ease; }
    html { scroll-behavior: smooth; }

    html, body { background-color: var(--seek-bg, #F2F5F3); }
    html.seek-dark { color-scheme: dark; }
    html.seek-dark h1, html.seek-dark h2 { color: #B8EDE3 !important; }
    html.seek-dark h3 { color: #D7EEE8 !important; }
    html.seek-dark .text-\[\#0D3B3B\] { color: #B8EDE3 !important; }
    html.seek-dark .text-\[\#0D3B3B\]\/20,
    html.seek-dark .text-\[\#0D3B3B\]\/25,
    html.seek-dark .text-\[\#0D3B3B\]\/30,
    html.seek-dark .text-\[\#0D3B3B\]\/35,
    html.seek-dark .text-\[\#0D3B3B\]\/40,
    html.seek-dark .text-\[\#0D3B3B\]\/45,
    html.seek-dark .text-\[\#0D3B3B\]\/50,
    html.seek-dark .text-\[\#0D3B3B\]\/55,
    html.seek-dark .text-\[\#0D3B3B\]\/60,
    html.seek-dark .text-\[\#0D3B3B\]\/65,
    html.seek-dark .text-\[\#0D3B3B\]\/70,
    html.seek-dark .text-\[\#0D3B3B\]\/75,
    html.seek-dark .text-\[\#0D3B3B\]\/80,
    html.seek-dark .text-\[\#0D3B3B\]\/90 { color: #B7CEC8 !important; }
    html.seek-dark p, html.seek-dark .font-body { color: #C5D4D0 !important; }
    html.seek-dark .bg-white, html.seek-dark .bg-white * { color: unset; }
    html.seek-dark .bg-white { color: #E8F2EF !important; }
    html.seek-dark .bg-white h1, html.seek-dark .bg-white h2, html.seek-dark .bg-white h3 { color: #E8F2EF !important; }
    html.seek-dark .bg-white .text-\[\#0D3B3B\] { color: #E8F2EF !important; }
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/20,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/25,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/30,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/35,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/40,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/45,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/50,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/55,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/60,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/65,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/70,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/75,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/80,
    html.seek-dark .bg-white .text-\[\#0D3B3B\]\/90 { color: #C5D4D0 !important; }


    html.seek-dark body { background-color: #121414; color: #C9D6D2; }
    html.seek-dark header { background: #000000 !important; border-color: #000000 !important; }
    html.seek-dark header + div, html.seek-dark .sticky.top-24 { background: #121414 !important; border-color: rgba(255,255,255,0.06) !important; }
    html.seek-dark .seek-tabs button { color: #D7E6E2 !important; }
    html.seek-dark .seek-tabs button.border-\[\#1BAA9C\] { color: #8DE3C5 !important; }
    html.seek-dark header .text-\[\#0D3B3B\],
    html.seek-dark header button { color: #F4F1EA !important; }
    html.seek-dark .bg-white { background-color: #152220 !important; color: #E8F2EF; }
    html.seek-dark .bg-white h1,
    html.seek-dark .bg-white h2,
    html.seek-dark .bg-white h3,
    html.seek-dark .bg-white p,
    html.seek-dark .bg-white label,
    html.seek-dark .bg-white span,
    html.seek-dark .bg-white button,
    html.seek-dark .bg-white .text-\[\#0D3B3B\] { color: #E8F2EF !important; }
    html.seek-dark .bg-white input,
    html.seek-dark .bg-white textarea,
    html.seek-dark .bg-white select {
      background: #FFFFFF !important;
      color: #1A1D24 !important;
      border-color: rgba(26,29,36,0.18) !important;
    }
    html.seek-dark .bg-white input::placeholder,
    html.seek-dark .bg-white textarea::placeholder { color: #6B7280 !important; opacity: 1; }

        @keyframes seek-loop {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -120; }
    }
    .seek-connector path { stroke-dasharray: 6 10; animation: seek-loop 3.2s linear infinite; }
    @keyframes seekLiveBlink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.15; }
    }
    .seek-live-blink { animation: seekLiveBlink 0.8s steps(1) infinite; }
    @keyframes seekLivePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(0.75); }
    }
    @keyframes seekTicker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .seek-ticker-track {
      display: inline-flex;
      gap: 2.5rem;
      animation: seekTicker 80s linear infinite;
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      .seek-ticker-track { animation: none; }
    }
    .seek-live-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #E11D48;
      animation: seekLivePulse 1.1s ease-in-out infinite;
    }
    .seek-live-ring {
      position: absolute;
      inset: -3px;
      border-radius: 999px;
      background: #E11D48;
      opacity: 0.35;
      animation: seekLivePulse 1.1s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .seek-connector path { animation: none; }
    }
  `}</style>
);

/* ---------------- APP DATA ---------------- */

const CATEGORIES = [
  { id: "celebrate", label: "Celebrate & Connect", icon: HeartHandshake },
  { id: "company", label: "Company / Friends", icon: Users },
  { id: "accompany", label: "Accompaniment", icon: Users },
  { id: "study", label: "Study companion", icon: GraduationCap },
  { id: "food", label: "Food", icon: Utensils },
  { id: "clothing", label: "Clothing", icon: Shirt },
  { id: "medical", label: "Medical", icon: Stethoscope },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "housing", label: "Housing", icon: HomeIcon },
  { id: "baby", label: "Baby & Family", icon: Baby },
  { id: "household", label: "Household Items", icon: Package },
  { id: "employment", label: "Employment & Business", icon: Briefcase },
  { id: "transport", label: "Transportation", icon: Bus },
  { id: "emergency", label: "Emergency", icon: AlertTriangle },
  { id: "financial", label: "Financial Assistance", icon: Wallet },
  { id: "other", label: "Other", icon: MoreHorizontal },
];
const SWIPE_SEQ = ["home", "for-you", "seek-help", "give", "offers", "celebrate"];
const CONNECT_CATS = ["Company / Friends", "Celebrate & Connect", "Accompaniment", "Study companion"];
function isFinancialNeed(req) {
  if (!req) return false;
  if (CONNECT_CATS.includes(req.category)) return false;
  const cat = String(req.category || "").toLowerCase();
  if (/job|employ|mentor|counsel|compan|friend|celebrat/.test(cat)) return false;
  const kind = String(req.type || req.need_type || "").toLowerCase();
  if (["item", "goods", "time", "company", "connect", "job"].includes(kind)) return false;
  return Number(req.amountNeeded || req.amount_needed || 0) > 0;
}

function videoKindLabel(req) {
  if (req?.feedKind === "impact") return "Impact";
  if (req?.feedKind === "appreciation") return "Appreciation";
  const cat = String(req?.category || "").toLowerCase();
  if (CONNECT_CATS.includes(req?.category) || /celebrat|connect|compan|friend/.test(cat)) return "Invitation";
  if (/job|employ|mentor|counsel/.test(cat)) return "Looking for work";
  return "Neighbour story";
}


const PARTNERS = [
  { name: "BSN Foundation", href: "https://barristerstreet.org" },
  { name: "Seek community", href: "/" },
];

const IMPACT_STATS = [
  { value: "3,000+", label: "Lives supported" },
  { value: "₦50M+", label: "Public donations before Seek" },
  { value: "30+", label: "Volunteers" },
  { value: "18+", label: "Communities across Nigeria" },
];

const OUTREACH_CAMPAIGNS = [
  { id: "pad-a-girl", title: "Pad a Girl Child", blurb: "A girl should not miss school because of her period.", amount: 5000, budget: 5000000, story: "Some girls stay home when their period comes because a pack of pads is out of reach. BSN has already walked into those classrooms with kits. This year we need ₦5 million to do it again. ₦5,000 puts pads in a girl's bag. Give so she is in class next week, not at home.", photos: ["/outreach/FB_IMG_1789290313295.jpg", "/outreach/FB_IMG_1789290326493.jpg"], videos: ["/outreach/lv_0_20260913121349.mp4", "/outreach/lv_0_20260913160713.mp4"] },
  { id: "back-to-school", title: "Back to School", blurb: "A child should not start term without a bag.", amount: 10000, budget: 4000000, story: "You have seen the children with new bags. That picture is last year's work. This year's bags are not bought yet. ₦4 million covers bags, books and shoes across the school year. Give one bag. Give ten. The next child on that line is waiting on this page.", photos: ["/outreach/FB_IMG_1789290503303.jpg", "/outreach/FB_IMG_1789290509360.jpg", "/outreach/file_00000000cad4824682d5ab15bcc82459.png"], videos: ["/outreach/AQN7O_S0spdsy0cyUq5Z2OZ_g0YOo11XiRxFoVfISX8iHzIl2VGfM9wg27n9vMUJz-PoslRTk7snwc_r30L7xrAG (1).mp4", "/outreach/TWMate.com-96cccfdb09d177ca8d521c0d0252d811.mp4"] },
  { id: "skills", title: "Skill Acquisition / Youth Empowerment", blurb: "A young person with a trade can feed a home.", amount: 15000, budget: 5000000, story: "The last class sat in a small room and left with a skill they can charge for. The next class is unfunded. ₦5 million runs the year: tools, trainers, a place to sit. Your gift keeps a young person in that room instead of on the street.", photos: ["/outreach/GiuXLqBWgAA7uSH.jpg", "/outreach/GiuXM-0W0AAADJ3.jpg", "/outreach/GiuYPAlWwAAQxCC.jpg", "/outreach/GiuYPTLWYAMqhWC.jpg"], videos: ["/outreach/SgdcvYN0JNW6FQTn.mp4"] },
  { id: "hospital", title: "Hospital Visitations", blurb: "Someone in a ward should not eat alone.", amount: 10000, budget: 5000000, story: "BSN walks into wards with food and a face that stayed. The next ward visit needs ₦5 million this year. A gift today is a basket on a bedside table this month.", photos: ["/outreach/IMG_20260701_104225 (2).jpg", "/outreach/IMG_20260701_105547.jpg", "/outreach/IMG_20260701_111430.jpg", "/outreach/file_000000009dec722f87f63a47ae3202fd (3).png"], videos: ["/outreach/lv_0_20260913172307.mp4"] },
  { id: "food-drive", title: "Charity / Food Drive", blurb: "A family should not sleep hungry this week.", amount: 5000, budget: 5500000, story: "Those packs on the table went to homes last outreach. The cupboard is empty again. ₦5.5 million fills packs for the year. Give one pack. We will take it.", photos: ["/outreach/FB_IMG_1789290417201.jpg", "/outreach/FB_IMG_1789290419768.jpg"], videos: ["/outreach/5y_puvyl-vIFzHJa.mp4", "/outreach/TWMate.com-af962006a3f58cf503f15dfc230444a6.mp4"] },
];

/* ---------------- Small building blocks ---------------- */

function Logo({ light = false, className = "h-8" }) {
  return (
    <div className="flex items-center gap-2">
      <img loading="lazy" decoding="async" src={LOGO_SRC} alt="Seek" className={className + " w-auto object-contain"} />
    </div>
  );
}

function ShopSupportStrip({ setPage, tone = "page" }) {
  const preview = ["/shop/seek-cap.png", "/shop/seek-tee.png", "/shop/seek-hoodie.png"];
  return (
    <div className={"rounded-3xl border border-[#0D3B3B]/10 bg-white p-5 " + (tone === "modal" ? "mt-4 text-left" : "mt-6")}>
      <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Support SEEK in another way</p>
      <p className="mt-1 font-display font-bold text-[#0D3B3B]">Shop official SEEK merchandise and wear the mission.</p>
      <p className="mt-1 text-sm text-[#0D3B3B]/55">This does not replace a gift to a request. Orders go through the SEEK store.</p>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {preview.map((src) => (
          <img key={src} src={src} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover bg-[#F2F5F3]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ))}
      </div>
      <button type="button" className="mt-3 text-sm font-bold text-[#1BAA9C]" onClick={() => { setPage("shop"); window.scrollTo(0, 0); }}>Visit SEEK Store</button>
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "font-display font-semibold inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const variants = {
    primary: "text-white shadow-[0_8px_24px_-8px_rgba(13,59,59,0.55)] hover:shadow-[0_12px_28px_-8px_rgba(13,59,59,0.65)] hover:-translate-y-0.5 focus-visible:ring-[#1BAA9C]",
    secondary: "bg-white text-[#0D3B3B] border border-[#0D3B3B]/15 hover:border-[#0D3B3B]/30 hover:-translate-y-0.5 focus-visible:ring-[#0D3B3B]",
    ghost: "text-[#0D3B3B] hover:bg-[#0D3B3B]/5",
    light: "bg-white/10 text-white border border-white/25 hover:bg-white/20 backdrop-blur-sm",
  };
  const style = variant === "primary" ? { background: `linear-gradient(135deg, ${C.teal}, ${C.green})` } : undefined;
  return (
    <button className={`${base} ${variants[variant]} ${className}`} style={style} {...props}>
      {children}
    </button>
  );
}



const SEEK_FACE = "/seek-logo.png";

async function shareSeekStory({ title, path, mediaUrl }) {
  const url = `${window.location.origin}${path.startsWith("/") ? path : "/" + path}`;
  const caption = title || "A story on SEEK";
  if (mediaUrl && typeof navigator.canShare === "function") {
    try {
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      const ext = String(blob.type || "").includes("video") ? "mp4" : String(blob.type || "").includes("png") ? "png" : "jpg";
      const file = new File([blob], `seek-story.${ext}`, { type: blob.type || "video/mp4" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: caption, text: caption });
        return "media";
      }
    } catch (_e) {}
  }
  try {
    if (navigator.share) {
      await navigator.share({ title: caption, text: "ASK. SEEK. FIND.", url });
      return "shared";
    }
  } catch (_e) {}
  window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  return "whatsapp";
}

function SeekVideoWatermark() {
  return (
    <img
      src={SEEK_FACE}
      alt=""
      className="pointer-events-none absolute bottom-3 right-3 z-20 h-9 w-9 rounded-full object-contain opacity-80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)]"
    />
  );
}
function isBsnPost(row = {}) {
  const blob = [row.title, row.description, row.name, row.contactEmail, row.requester_name, row.display_name, row.category].join(" ").toLowerCase();
  return blob.includes("bsn") || blob.includes("barrister street");
}
function postAvatar(url, row = {}) {
  if (isBsnPost(row)) return SEEK_FACE;
  return url || "";
}

function daysPosted(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Just now";
  const secs = Math.floor(ms / 1000);
  if (secs < 1) return "Just now";
  if (secs === 1) return "1 second ago";
  if (secs < 60) return secs + " seconds ago";
  const mins = Math.floor(secs / 60);
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return mins + " minutes ago";
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return hours + " hours ago";
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return days + " days ago";
}

function VerifiedBadge({ className = "" }) {
  return (
    <span className={"inline-flex items-center gap-1 rounded-full bg-[#1BAA9C]/12 text-[#0D3B3B] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + className} title="Verified SEEK account">
      <BadgeCheck size={12} />
      Verified
    </span>
  );
}

function formatSeekStatus(status) {
  const map = {
    pending_review: "Under review",
    verification_required: "Needs a check",
    published: "Open for help",
    partially_funded: "Partly funded",
    matched: "Help in progress",
    fulfilled: "Need met",
    closed: "Closed",
    rejected: "Not published",
  };
  return map[status] || status || "Under review";
}

function SeekVerifiedCheck({ className = "" }) {
  return (
    <span
      title="Seeker"
      aria-label="Seeker"
      className={`inline-flex items-center justify-center h-[18px] w-[18px] rounded-full bg-[#1D9BF0] text-white shrink-0 ${className}`}
    >
      <Check size={11} strokeWidth={3} />
    </span>
  );
}

function VerificationBadge({ status }) {
    const map = {
    pending_review: {
      label: "Under review",
      icon: Clock,
      cls: "bg-amber-100 text-amber-800",
    },
    verification_required: {
      label: "Under review",
      icon: Clock,
      cls: "bg-amber-100 text-amber-800",
    },
    published: {
      label: "Open for help",
      icon: BadgeCheck,
      cls: "bg-[#1BAA9C]/10 text-[#0D3B3B]",
    },
    partially_funded: {
      label: "Partly funded",
      icon: BadgeCheck,
      cls: "bg-[#1BAA9C]/10 text-[#0D3B3B]",
    },
    fulfilled: {
      label: "Need met",
      icon: CheckCircle2,
      cls: "bg-[#63C167]/15 text-[#0D3B3B]",
    },
    closed: {
      label: "Closed",
      icon: Clock,
      cls: "bg-slate-100 text-slate-700",
    },
    rejected: {
      label: "Rejected",
      icon: AlertTriangle,
      cls: "bg-red-100 text-red-800",
    },
  };

  const m = map[status] || map.pending_review;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold font-body ${m.cls}`}>
      <Icon size={13} /> {m.label}
    </span>
  );
}

function UrgencyBadge({ level }) {
  const map = {
    normal: "bg-slate-100 text-slate-600",
    urgent: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };
  if (level === "normal") return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold font-body uppercase tracking-wide ${map[level]}`}>
      {level}
    </span>
  );
}

function ProgressBar({ raised, needed }) {
  const n = Number(needed);
  if (!n) return null;
  const pct = Math.min(100, Math.round((Number(raised || 0) / n) * 100));
  return (
    <div>
      <div className="h-2 w-full rounded-full bg-[#0D3B3B]/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.green})` }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between text-sm font-body">
        <span className="font-semibold text-[#0D3B3B]">₦{raised.toLocaleString()} raised</span>
        <span className="text-[#0D3B3B]/50">of ₦{needed.toLocaleString()}</span>
      </div>
    </div>
  );
}

function CategoryCard({ cat, onClick }) {
  const Icon = cat.icon;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-2xl bg-white p-5 text-left shadow-sm border border-[#0D3B3B]/5 hover:border-[#1BAA9C]/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
        style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.green})` }}
      >
        <Icon size={20} />
      </span>
      <span className="font-display font-semibold text-[#0D3B3B]">{cat.label}</span>
    </button>
  );
}


const COMMUNITY_REACTIONS = [
  { key: "support", emoji: "❤️", label: "Support" },
  { key: "encourage", emoji: "🙏", label: "Encourage" },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
  { key: "help", emoji: "🤝", label: "I can help" },
];

function CommunityInteractions({ targetType, targetId, compact = false }) {
  const [data, setData] = useState({ comments: [], reactions: {}, userReaction: null });
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    if (!targetType || !targetId) return;
    const next = await listCommunityInteractions(targetType, targetId);
    setData(next || { comments: [], reactions: {}, userReaction: null });
  };

  useEffect(() => { load(); }, [targetType, targetId]);

  const react = async (reactionType) => {
    setError(""); setNotice("");
    const lockKey = "seek_react_" + targetType + "_" + targetId;
    let existing = "";
    try { existing = localStorage.getItem(lockKey) || ""; } catch (_e) {}
    if (existing && existing !== reactionType) {
      setError("You already reacted to this post.");
      return;
    }
    try {
      await addCommunityReaction({ targetType, targetId, reactionType });
      try { localStorage.setItem(lockKey, reactionType); } catch (_e) {}
      await load();
    } catch (err) {
      setError(err?.message || "Please sign in to react.");
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setSaving(true);
    try {
      await addCommunityComment({ targetType, targetId, body: comment });
      setComment("");
      setOpen(true);
      setNotice("Comment posted.");
      await load();
    } catch (err) {
      setError(err?.message || "Could not post your comment.");
    } finally { setSaving(false); }
  };

  const totalReactions = COMMUNITY_REACTIONS.reduce(
    (sum, reaction) => sum + Number(data.reactions?.[reaction.key] || 0),
    0
  );
  const commentsCount = data.comments?.length || 0;

  return (
    <div className={`${compact ? "mt-4" : "mt-6"}`}>
      <div className="flex items-center justify-between gap-2 border-t border-[#0D3B3B]/8 pt-3">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setError(""); setNotice(""); }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${open ? "bg-[#E8F6F2] text-[#168F84]" : "text-[#0D3B3B]/55"}`}
        >
          {commentsCount > 0 ? `Comments ${commentsCount}` : "Comment"}
        </button>
      </div>

      {(error || notice) && (
        <p className={`mt-2 px-1 text-xs ${error ? "text-red-600" : "text-[#168F84]"}`}>
          {error || notice}
        </p>
      )}

      {open && (
        <div className="mt-3 rounded-2xl bg-[#F7FAF8] p-3 sm:p-4">
          <form onSubmit={submitComment} className="flex gap-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Write something kind or useful…"
              className="min-w-0 flex-1 resize-none rounded-xl border border-[#0D3B3B]/10 bg-white px-3 py-2.5 text-sm text-[#0D3B3B] placeholder:text-[#0D3B3B]/35 focus:outline-none focus:ring-2 focus:ring-[#1BAA9C]/30"
            />
            <button
              disabled={saving || !comment.trim()}
              type="submit"
              className="self-end rounded-xl bg-[#0D3B3B] px-3.5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-35"
            >
              {saving ? "…" : "Post"}
            </button>
          </form>

          <p className="mt-2 px-1 text-[10px] leading-relaxed text-[#0D3B3B]/40">
            Keep it kind. Never post private contact details, payment credentials or sensitive information.
          </p>

          {commentsCount > 0 ? (
            <div className="mt-3 space-y-2">
              {data.comments.map((item) => (
                <div key={item.id} className="rounded-xl bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-[#DDEBE7]" />
                    )}
                    <span className="text-xs font-semibold text-[#0D3B3B]">{item.display_name || "A neighbour"}</span>
                    <span className="text-[10px] text-[#0D3B3B]/30">{daysPosted(item.created_at)}</span>
                  </div>
                  <p className="mt-1.5 pl-8 text-sm leading-relaxed text-[#0D3B3B]/72 whitespace-pre-wrap">{item.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 px-1 text-xs text-[#0D3B3B]/45">Be the first to encourage this person.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SeekDonateModal({ request, campaign, onClose }) {
  const session = getUserSession();
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [amount, setAmount] = useState(String(campaign?.amount || 10000));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const title = request?.title || campaign?.title || "SEEK";
  const place = request?.location || campaign?.location || "";
  const kind = request ? "neighbour" : "outreach";
  if (!request && !campaign) return null;
  const chips = [5000, 10000, 25000, 50000];
  return (
    <div className="fixed inset-0 z-[180] bg-black/40 flex items-center justify-center p-5" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          try {
            if (!String(name || "").trim()) throw new Error("Add your name so the neighbour knows who helped.");
            if (!String(email || "").trim()) throw new Error("Add an email for your receipt.");
            const gift = Number(amount);
            if (!Number.isFinite(gift) || gift < 100) throw new Error("Enter an amount of at least ₦100.");
            const result = await initializeDonation({
              amount: gift,
              email: String(email).trim(),
              requestId: request?.id || null,
              campaignId: campaign?.id || null,
              anonymous: false,
              donorName: request
                ? String(name).trim()
                : String(name).trim() + " · " + title + (campaign?.id ? " [" + campaign.id + "]" : ""),
              coverFee: true,
              callbackUrl: request
                ? window.location.origin + "/request/" + request.id
                : `${window.location.origin}/give${campaign?.id ? "?outreach=" + encodeURIComponent(campaign.id) : ""}`,
            });
            if (!result?.authorization_url) throw new Error("Paystack did not open.");
            window.location.href = result.authorization_url;
          } catch (err) {
            setError(err.message || "Payment could not start.");
            setLoading(false);
          }
        }}
        className="w-full max-w-[22rem] rounded-2xl bg-[#101415] text-white p-4 shadow-2xl border border-white/10"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8DE3C5]">Secure donation</p>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-white/10">×</button>
        </div>
        <p className="mt-3 text-sm text-white/80">
          Supporting <span className="font-semibold text-white">{title}</span>{place ? " · " + place : ""}{kind === "outreach" ? " · BSN outreach" : ""}
        </p>
        <input required className="mt-3 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-sm text-white" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <input required type="email" className="mt-2 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-sm text-white" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for receipt" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((n) => (
            <button key={n} type="button" onClick={() => setAmount(String(n))} className={"rounded-full px-2.5 py-1.5 text-xs font-bold " + (Number(amount) === n ? "bg-[#1BAA9C] text-[#0D3B3B]" : "bg-white/10 text-white")}>₦{n.toLocaleString()}</button>
          ))}
        </div>
        <input required inputMode="numeric" className="mt-2 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-sm text-white" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ₦" />
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <button type="submit" disabled={loading} className="mt-3 w-full rounded-full bg-[#1BAA9C] text-[#0D3B3B] py-3 text-sm font-extrabold">
          {loading ? "Opening Paystack…" : "Authorize ₦" + Number(amount || 0).toLocaleString()}
        </button>
      </form>
    </div>
  );
}

function RequestCard({ req, onHelp, onView }) {
  const [donateOpen, setDonateOpen] = useState(false);
  const needed = Number(req.amountNeeded || req.amount_needed || 0);
  const raised = Number(req.amountRaised || req.amount_raised || 0);
  const face = postAvatar(req.avatarUrl || req.avatar_url, req) || SEEK_FACE;
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 border border-[#0D3B3B]/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1BAA9C]">{req.category || "Need"}{isBsnPost(req) ? " · Admin" : ""}</p>
      <div className="mt-3 flex items-start gap-3">
        <img loading="lazy" decoding="async" src={face} alt="" className="h-12 w-12 rounded-full object-cover bg-white" />
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg text-[#0D3B3B] leading-snug">{req.title}</h3>
          <p className="mt-1 text-sm text-[#0D3B3B]/55">{[req.location, daysPosted(req.created_at || req.createdAt)].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {req.description ? <p className="mt-3 text-sm text-[#0D3B3B]/70 line-clamp-2">{req.description}</p> : null}
      {CONNECT_CATS.includes(req.category) ? (
        <p className="mt-3 text-sm text-[#0D3B3B]/70">Looking for company, not money.</p>
      ) : needed > 0 ? (
        <div className="mt-3"><ProgressBar raised={raised} needed={needed} /></div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-[#0D3B3B]">Any amount helps.</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onView && <button type="button" onClick={() => onView(req)} className="flex-1 rounded-full border border-[#0D3B3B]/15 py-2.5 text-sm font-semibold text-[#0D3B3B]">View story</button>}
        <button type="button" onClick={() => CONNECT_CATS.includes(req.category) ? (onHelp && onHelp(req)) : setDonateOpen(true)} className="flex-1 rounded-full bg-[#1BAA9C] py-2.5 text-sm font-bold text-white">
          {CONNECT_CATS.includes(req.category) ? "I can be there" : "Give now"}
        </button>
      </div>
      <CommunityInteractions targetType="request" targetId={req.id} compact />
      {donateOpen && <SeekDonateModal request={req} onClose={() => setDonateOpen(false)} />}
    </div>
  );
}


function SocialLinks({ light = false }) {
  const cls = light
    ? "h-10 w-10 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/50 flex items-center justify-center"
    : "h-10 w-10 rounded-full border border-[#0D3B3B]/15 text-[#0D3B3B] hover:border-[#1BAA9C] hover:text-[#1BAA9C] flex items-center justify-center bg-white";
  return (
    <div className="flex items-center justify-center gap-2">
      <a className={cls} href="https://wa.me/447402427408" target="_blank" rel="noreferrer" aria-label="WhatsApp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3.5A10 10 0 0 0 3.2 17.6L2 22l4.5-1.2A10 10 0 1 0 20 3.5zm-8 16.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.6.7.7-2.5-.2-.3A8.2 8.2 0 1 1 12 19.7zm4.7-6.1c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.6l.4-.5.1-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.6 11.5 11.5 0 0 0 4.4 3.9 15 15 0 0 0 1.5.5 3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3z"/></svg>
      </a>
      <a className={cls} href="https://www.instagram.com/bsnfoundationng" target="_blank" rel="noreferrer" aria-label="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
      </a>
      <a className={cls} href="https://x.com/BSNFoundation_" target="_blank" rel="noreferrer" aria-label="X">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3h3l-7.5 8.6L22 21h-6.2l-4.9-6.4L5.2 21H2l8-9.2L2.3 3H8.6l4.4 5.8L18 3z"/></svg>
      </a>
    </div>
  );
}


function CountUp({ value }) {
  const raw = (value === undefined || value === null || value === "undefined") ? "0" : String(value);
  const target = Number(raw.replace(/[^0-9.]/g, "")) || 0;
  const prefix = raw.trim().startsWith("₦") ? "₦" : "";
  const [shown, setShown] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / 900);
        setShown(Math.round(target * p));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.disconnect();
    }, { threshold: 0.35 });
    io.observe(node);
    return () => io.disconnect();
  }, [target]);
  if (!target) return <span>{raw}</span>;
  return <span ref={ref}>{prefix}{shown.toLocaleString()}</span>;
}



function OutreachStory({ campaign, onBack, onDonate }) {
  const [raised, setRaised] = useState(0);
  useEffect(() => {
    if (!campaign?.title) return;
    getOutreachRaised(campaign.title, campaign.id).then(setRaised).catch(() => setRaised(0));
  }, [campaign?.title, campaign?.id]);
  if (!campaign) return null;
  return (
    <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-20">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-[#1BAA9C] mb-6">Back to Give</button>
      <p className="font-body text-[11px] tracking-[0.22em] uppercase text-[#0D3B3B]/40 mb-2">Already done</p>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0D3B3B] mb-4">{campaign.title}</h1>
      <p className="font-body text-[#0D3B3B]/70 mb-6">{campaign.story || campaign.blurb}</p>
      {campaign.budget ? (
        <div className="mb-6 rounded-2xl bg-white border border-[#0D3B3B]/08 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45">What this year costs</p>
          <p className="font-display font-bold text-2xl text-[#0D3B3B] mt-1">₦{Number(campaign.budget).toLocaleString()}</p>
          <div className="mt-3"><ProgressBar raised={raised} needed={campaign.budget} /></div>
          <p className="mt-2 text-xs text-[#0D3B3B]/50">Give what you can. We will take it from there.</p>
        </div>
      ) : null}
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        {(campaign.videos || []).map((src) => (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video key={src} src={encodeURI(src)} className="w-full bg-black" controls playsInline preload="none" controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} />
            <SeekVideoWatermark />
          </div>
        ))}
        {(campaign.photos || []).map((src) => (
          <img key={src} src={encodeURI(src)} alt="" className="w-full h-48 object-cover rounded-2xl" />
        ))}
      </div>
      <Button variant="primary" onClick={onDonate}>Donate to support this outreach</Button>
    </section>
  );
}

function OutreachCheckout({ campaign, onClose }) {
  return <SeekDonateModal campaign={campaign} onClose={onClose} />;
}


function SectionLabel({ children }) {
  return (
    <span className="inline-block font-body text-xs font-semibold uppercase tracking-[0.18em] text-[#1BAA9C] mb-3">
      {children}
    </span>
  );
}

/* ---------------- Navbar / Footer ---------------- */


function getSeekTheme() {
  try {
    const saved = localStorage.getItem("seek_theme");
    if (saved === "dark") return "dark";
    if (saved === "light") return "light";
    return "light";
  } catch (_e) {
    return "light";
  }
}

function applySeekTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  const root = document.documentElement;
  root.classList.toggle("seek-dark", next === "dark");
  if (next === "dark") {
    root.style.setProperty("--seek-bg", "#121414");
    root.style.setProperty("--seek-card", "#1A2220");
    root.style.setProperty("--seek-ink", "#C9D6D2");
    root.style.setProperty("--seek-head", "#B8EDE3");
    root.style.setProperty("--seek-wash", "rgba(18,20,20,0.92)");
    root.style.setProperty("--seek-photo", "none");
    root.style.backgroundColor = "#121414";
    if (document.body) {
      document.body.style.backgroundColor = "#121414";
      document.body.style.color = "#C9D6D2";
    }
  } else {
    root.style.setProperty("--seek-bg", "#F2F5F3");
    root.style.setProperty("--seek-card", "#FFFFFF");
    root.style.setProperty("--seek-ink", "#0F211F");
    root.style.setProperty("--seek-wash", "rgba(242,245,243,0.72)");
    root.style.setProperty("--seek-photo", "url('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1800&q=60')");
    root.style.backgroundColor = "#F2F5F3";
    if (document.body) {
      document.body.style.backgroundColor = "#F2F5F3";
      document.body.style.color = "#0F211F";
    }
  }
  try { localStorage.setItem("seek_theme", next); } catch (_e) {}
  return next;
}

function NavInboxButton({ userSession, setPage }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!userSession?.access_token) { setUnread(0); return; }
    let stop = false;
    const load = () => listMyNotifications(30).then((rows) => {
      if (stop) return;
      setUnread((Array.isArray(rows) ? rows : []).filter((n) => !n.read_at).length);
    }).catch(() => {});
    load();
    const id = setInterval(load, 12000);
    return () => { stop = true; clearInterval(id); };
  }, [userSession?.access_token, userSession?.user?.id]);
  return (
    <button type="button" onClick={() => { setPage(userSession?.access_token ? "notifications" : "account"); window.history.pushState({}, "", userSession?.access_token ? "/notifications" : "/account"); }} aria-label="Inbox" className="relative p-2">
      <Bell size={20} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-5 px-1 rounded-full bg-[#1BAA9C] text-[10px] font-bold text-white flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
      )}
    </button>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => getSeekTheme());
  useEffect(() => { applySeekTheme(theme); }, [theme]);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="p-2 text-current"
    >
      {dark ? <Sun size={20} className="seek-theme-icon" /> : <Moon size={20} className="seek-theme-icon" />}
    </button>
  );
}



function CaseDonateSheet({ request, onClose }) {
  return <SeekDonateModal request={request} onClose={onClose} />;
}


function FeatureStrip({ page, setPage }) {
  const [moreOpen, setMoreOpen] = useState(false);
  let currentOfferFilter = "";
  try { currentOfferFilter = sessionStorage.getItem("seek_offer_filter") || ""; } catch (_e) {}
  const moreActive = ["volunteer", "about", "impact", "shop", "jobs", "mentorship", "counselling"].includes(page) || (page === "offers" && ["job", "mentorship", "counselling"].includes(currentOfferFilter));
  const items = [
    { id: "home", label: "Home" },
    { id: "for-you", label: "For You" },
    { id: "discover", label: "Discover" },
    { id: "seek-help", label: "Seek Help" },
    { id: "give", label: "Give" },
    { id: "offers", label: "Giveaways" },
    { id: "shop", label: "Shop" },
    { id: "celebrate", label: "Connect" },
  ];
  const go = (item) => {
    if (item.filter) {
      try { sessionStorage.setItem("seek_offer_filter", item.filter); } catch (_e) {}
      setPage("offers");
    } else {
      try { sessionStorage.removeItem("seek_offer_filter"); } catch (_e) {}
      setPage(item.id);
    }
    setMoreOpen(false);
    window.scrollTo(0, 0);
  };
  return (
    <div className="seek-tabs sticky top-24 z-[108] bg-white/95 backdrop-blur border-b border-[#0D3B3B]/8">
      <div className="mx-auto max-w-6xl px-5 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 min-w-max py-2 items-center">
          {items.map((item) => {
            let offerFilter = "";
            try { offerFilter = sessionStorage.getItem("seek_offer_filter") || ""; } catch (_e) {}
            const active = page === item.id || (item.filter && page === "offers" && offerFilter === item.filter);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item)}
                className={`shrink-0 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${active ? "text-[#0D3B3B] border-[#1BAA9C]" : "text-[#0D3B3B]/55 border-transparent hover:text-[#0D3B3B]"}`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="relative shrink-0">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={`px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${moreActive || moreOpen ? "text-[#0D3B3B] border-[#1BAA9C]" : "text-[#0D3B3B]/55 border-transparent hover:text-[#0D3B3B]"}`}
            >
              More
            </button>
            {moreOpen && (
              <div className="fixed right-3 top-32 w-56 max-h-[70vh] overflow-y-auto rounded-2xl border border-[#0D3B3B]/10 bg-white p-2 shadow-2xl z-[160]">
                {[
                  ["organisations", "For organisations"],
                  ["impact", "Impact"],
                  ["volunteer", "Volunteer"],
                  ["jobs", "Jobs", "job"],
                  ["mentorship", "Mentorship", "mentorship"],
                  ["counselling", "Counselling", "counselling"],
                ].map(([id, label, filter]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (filter) { try { sessionStorage.setItem("seek_offer_filter", filter); } catch (_e) {} }
                      else { try { sessionStorage.removeItem("seek_offer_filter"); } catch (_e) {} }
                      setMoreOpen(false);
                      setPage(filter ? "offers" : id);
                      window.scrollTo(0, 0);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#0D3B3B] hover:bg-[#F2F5F3]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Navbar({ page, setPage, userSession }) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    if (!userSession?.access_token) { setAvatar(""); return; }
    const cached = getCachedAvatarUrl();
    if (cached) setAvatar(cached);
    getMyProfile().then((p) => { if (p?.avatar_url) setAvatar(p.avatar_url); }).catch(() => {});
  }, [userSession]);
  const links = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "seek-help", label: "Seek Help", icon: HeartHandshake },
    { id: "celebrate", label: "Connect & Celebrate", icon: Users },
    { id: "give", label: "Help Someone", icon: Wallet },
    { id: "offers", label: "Giveaways", icon: Package },
    { id: "impact", label: "Impact", icon: BadgeCheck },
    { id: "volunteer", label: "Volunteer", icon: Users },
    { id: "about", label: "About", icon: ShieldCheck },
  ];
  const go = (id) => { setPage(id); setOpen(false); window.scrollTo(0, 0); };
  return (
    <header className="sticky top-0 z-[110] relative bg-white border-b border-[#0D3B3B]/8">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 flex items-center justify-between h-16">
        <button onClick={() => go("home")} className="shrink-0"><Logo className="h-7" /></button>

        <nav className="hidden lg:flex items-center gap-7">
          {links.map((l, i) => (
            <button
              key={l.label + i}
              onClick={() => go(l.id)}
              className={`font-body text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${page === l.id ? "text-[#0D3B3B]" : "text-[#0D3B3B]/55 hover:text-[#0D3B3B]"}`}
            >
              {l.icon ? <l.icon size={14} /> : null}
              {l.label}
            </button>
          ))}
          {userSession?.access_token && (
            <button
              onClick={() => go("my-seek")}
              className={`font-body text-sm font-medium transition-colors ${page === "my-seek" ? "text-[#0D3B3B]" : "text-[#0D3B3B]/55 hover:text-[#0D3B3B]"}`}
            >
              My SEEK
            </button>
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />
          {userSession?.access_token ? <NavInboxButton userSession={userSession} setPage={setPage} /> : null}
          <button
            onClick={() => go(userSession?.access_token ? "my-seek" : "account")}
            className="font-body text-sm font-medium text-[#0D3B3B]/55 hover:text-[#0D3B3B] inline-flex items-center gap-2"
            aria-label="My SEEK"
          >
            {avatar ? <img loading="lazy" decoding="async" src={avatar} alt="" className="h-9 w-9 rounded-full object-cover border border-[#0D3B3B]/10" /> : <span className="h-9 w-9 rounded-full bg-[#0D3B3B]/10 inline-flex items-center justify-center"><User size={16} /></span>}
            <span>{userSession?.access_token ? "My SEEK" : "Sign in"}</span>
          </button>
          <Button variant="secondary" className="!px-5 !py-2.5" onClick={() => go("seek-help")}>I need help</Button>
          <Button variant="primary" className="!px-5 !py-2.5" onClick={() => go("give")}>I want to help</Button>
        </div>

        <div className="lg:hidden flex items-center gap-1">
        <ThemeToggle />
        <NavInboxButton userSession={userSession} setPage={setPage} />
        <button className="p-2 text-[#0D3B3B]" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full z-[120] bg-white border-b border-[#0D3B3B]/10 shadow-xl px-4 py-3">
          {[
            { id: "home", label: "Home", icon: HomeIcon },
            { id: "seek-help", label: "Seek Help", icon: Search },
            { id: "celebrate", label: "Connect & Celebrate", icon: Users },
            { id: "give", label: "Give", icon: HeartHandshake },
            { id: "offers", label: "Giveaways", icon: Package },
            { id: "impact", label: "Impact", icon: BadgeCheck },
            { id: "volunteer", label: "Volunteer", icon: Users },
            { id: "about", label: "About", icon: ShieldCheck },
          ].map((l) => {
            const Icon = l.icon;
            const on = page === l.id;
            return (
              <button key={l.id} onClick={() => go(l.id)} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm tracking-[0.12em] uppercase ${on ? "bg-[#0D3B3B]/5 text-[#0D3B3B]" : "text-[#0D3B3B]/70"}`}>
                <Icon size={16} /> {l.label}
              </button>
            );
          })}
          {userSession?.access_token && (
            <button onClick={() => go("my-seek")} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm tracking-[0.12em] uppercase text-[#0D3B3B]/70">
              <User size={16} /> My SEEK
            </button>
          )}
          <button onClick={() => go(userSession?.access_token ? "my-seek" : "account")} className="mt-2 w-full rounded-xl bg-[#0D3B3B] text-white py-3 text-sm tracking-[0.16em] uppercase">
            {userSession?.access_token ? "My SEEK" : "Sign in"}
          </button>
        </div>
      )}
    </header>
  );
}

function Footer({ setPage }) {
  const go = (id) => { setPage(id); window.scrollTo(0, 0); };
  return (
    <footer style={{ background: C.deepTeal }} className="text-white/75 font-body">
      <div className="mx-auto max-w-3xl px-5 py-8 text-center">
        <Logo className="h-6 mx-auto" />
        <p className="mt-3 text-sm text-white/55">A project of BSN Foundation</p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
          <button type="button" onClick={() => go("about")} className="hover:text-white">About</button>
          <button type="button" onClick={() => go("guidelines")} className="hover:text-white">Guidelines</button>
          <button type="button" onClick={() => go("language")} className="hover:text-white">{tSeek("language")}</button>
          <button type="button" onClick={() => go("privacy")} className="hover:text-white">Privacy</button>
          <button type="button" onClick={() => go("terms")} className="hover:text-white">Terms</button>
          <button type="button" onClick={() => go("contact")} className="hover:text-white">Contact</button>
        </div>
        <div className="mt-4 flex justify-center"><SocialLinks light /></div>
        <p className="mt-5 text-[11px] text-white/35">© {new Date().getFullYear()} SEEK</p>
      </div>
    </footer>
  );
}

/* ---------------- Signature connector (infinity motif) ---------------- */

function Connector() {
  return (
    <div className="hidden md:flex items-center justify-center relative">
      <svg width="120" height="64" viewBox="0 0 120 64" className="seek-connector" fill="none">
        <defs>
          <linearGradient id="connGrad" x1="0" y1="0" x2="120" y2="0">
            <stop offset="0%" stopColor={C.teal} />
            <stop offset="100%" stopColor={C.green} />
          </linearGradient>
        </defs>
        <path d="M4 32 C 30 4, 90 4, 116 32 C 90 60, 30 60, 4 32 Z" stroke="url(#connGrad)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ---------------- Homepage ---------------- */

function HomePage({ setPage, userSession }) {
  const [outreach, setOutreach] = useState(null);
  const [mine, setMine] = useState([]);
  useEffect(() => {
    if (!userSession?.access_token) { setMine([]); return; }
    listMyRequests().then((rows) => setMine((rows || []).map(mapRequestRow).slice(0, 3))).catch(() => setMine([]));
  }, [userSession]);
  const go = (id) => { setPage(id); window.scrollTo(0, 0); };
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [impactPreview, setImpactPreview] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [ticker, setTicker] = useState([]);
  const [stories, setStories] = useState([]);
  const [liveVideos, setLiveVideos] = useState([]);
  useEffect(() => {
    const tick = () => getSeekLiveStats().then(setLiveStats).catch(() => {});
    tick();
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, []);

    useEffect(() => {
    let cancelled = false;
    let donorTick;
    (async () => {
      try {
        const [rows, matchedIds] = await Promise.all([
          listPublishedRequests(4),
          listMatchedOfferRequestIds().catch(() => []),
        ]);
        const [impactRows, sponsorRows, offerRows, storyRows] = await Promise.all([
          listPublishedImpact().catch(() => []),
          listPublicSponsors().catch(() => []),
          listPublicOffers().catch(() => []),
          listAppreciationStories().catch(() => []),
        ]);
        const crisisRows = [];
        const stats = null;
        const liveRows = [];
        const matchedSet = new Set(matchedIds);
        if (!cancelled) {
          const mapped = rows.map(mapRequestRow).map((r) => ({ ...r, helped: matchedSet.has(r.id) })).slice(0, 4);
          setRequests(mapped);
          setImpactPreview((impactRows || []).slice(0, 3));
          setStories((storyRows || []).slice(0, 3));
          setLiveVideos((Array.isArray(liveRows) ? liveRows : []).filter((item) => Array.isArray(item.media) && item.media.length).slice(0, 4));
          setSponsors(sponsorRows || []);
          if (stats) setLiveStats(stats);
          const crisis = (Array.isArray(crisisRows) ? crisisRows : []).map((item) => {
            const name = item?.fields?.name || item?.fields?.title || "";
            return name ? "WORLD · " + name : "";
          }).filter(Boolean);
          const bits = [
            ...mapped.map((r) => "SEEK REQUEST · " + (r.title || "Open request")),
            ...(Array.isArray(offerRows) ? offerRows : []).slice(0, 6).map((o) => "SEEK OFFER · " + String(o.description || "").slice(0, 72)),
            ...crisis,
          ].filter(Boolean);
          setTicker(bits);
        }
      } catch (err) {
        if (!cancelled) setRequestsError(err.message);
      } finally {
        if (!cancelled) setRequestsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>

      {/* HERO */}
      <section className="px-5 pt-10 pb-8 text-center">
        <img src={LOGO_SRC} alt="SEEK" className="mx-auto h-14 w-auto object-contain" />
        <h1 className="mt-6 font-display font-extrabold text-[#0D3B3B] text-4xl leading-[1.08] max-w-md mx-auto tracking-tight">
          ASK. SEEK. FIND.
        </h1>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1BAA9C]">What SEEK is all about</p>
        <p className="mt-3 font-body text-sm leading-relaxed text-[#0D3B3B]/70 max-w-md mx-auto">
          SEEK is a community assistance platform built to connect people who need help with people who can offer it. Ask for what you need. Offer what you can — whether it is financial support, goods, opportunities, mentorship, counselling, or simply showing up for someone.
        </p>
        <div className="mt-6">
          <Button variant="primary" onClick={() => go("for-you")}>Explore SEEK</Button>
        </div>
      </section>

      {userSession?.access_token && mine.length > 0 && (
        <section className="mx-auto max-w-lg px-5 pb-6">
          <p className="text-[11px] uppercase tracking-widest text-[#1BAA9C] mb-2">Your requests</p>
          {mine.slice(0, 2).map((req) => (
            <button key={req.id} type="button" onClick={() => go("my-requests")} className="mb-2 w-full rounded-2xl bg-white border border-[#0D3B3B]/8 p-3 text-left">
              <p className="text-xs text-[#1BAA9C]">{formatSeekStatus(req.status)}</p>
              <p className="font-display font-bold text-[#0D3B3B]">{req.title}</p>
            </button>
          ))}
        </section>
      )}

      <section className="px-5 pb-10">
        <div className="mx-auto max-w-[440px] grid grid-cols-2 gap-2">
          {[
            ["seek-help", "Seek Help"],
            ["give", "Give"],
            ["offers", "Giveaways"],
            ["celebrate", "Connect"],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => go(id)} className="rounded-full border border-[#0D3B3B]/12 bg-white py-3 text-sm font-semibold text-[#0D3B3B]">
              {label}
            </button>
          ))}
        </div>
        <div className="mx-auto max-w-[440px]">
          <ShopSupportStrip setPage={setPage} />
        </div>
      </section>

      {stories.length > 0 && (
        <section className="px-5 pb-12">
          <div className="mx-auto max-w-[440px]">
            <SectionLabel>Outcomes</SectionLabel>
            <div className="mt-3 space-y-3">
              {stories.slice(0, 3).map((story) => (
                <button key={story.id} type="button" onClick={() => { window.history.pushState({}, "", `/impact/${story.id}`); setPage(`impact:${story.id}`); window.scrollTo(0, 0); }} className="w-full text-left rounded-2xl bg-white border border-[#0D3B3B]/8 overflow-hidden">
                  {story.public_url && story.media_kind === "video" ? <video src={story.public_url} muted playsInline preload="none" className="h-36 w-full object-cover bg-black" /> : story.public_url ? <img src={story.public_url} alt="" className="h-36 w-full object-cover" /> : null}
                  <p className="p-3 font-display font-bold text-[#0D3B3B] line-clamp-2">{story.title || "A SEEK story"}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

    </>
  );
}


/* ---------------- Help Someone Feed ---------------- */

function HelpSomeoneFeed({ setPage, limit = 6, compact = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    listPublishedRequests(Math.max(limit, 8)).then((rows) => {
      if (cancelled) return;
      setRequests((rows || []).map(mapRequestRow).filter((r) => !CONNECT_CATS.includes(r.category)).slice(0, limit));
    }).catch(() => { if (!cancelled) setRequests([]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  if (loading) return <p className="font-body text-sm text-[#0D3B3B]/50">Loading people who need help…</p>;
  if (!requests.length) return <p className="font-body text-sm text-[#0D3B3B]/50">No public requests are available right now. Check back soon.</p>;

  return (
    <>
    <div className="mb-4 rounded-2xl border border-[#0D3B3B]/10 bg-white p-4 text-sm text-[#0D3B3B]/60">
      <span className="font-semibold text-[#0D3B3B]">A quick trust note:</span> SEEK reviews public requests before they appear. If something looks wrong, use the report option on the request page.
    </div>
    <div className={compact ? "grid sm:grid-cols-2 gap-3" : "grid sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
      {requests.map((req) => (
        <article key={req.id} className="rounded-2xl bg-white border border-[#0D3B3B]/10 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1BAA9C]">{req.category || "Support needed"}</p>
          <h3 className="mt-1 font-display font-bold text-lg text-[#0D3B3B] line-clamp-2">{req.title}</h3>
          <p className="mt-1 text-sm text-[#0D3B3B]/55 line-clamp-2">{req.description || req.need || "Someone in the SEEK community is asking for support."}</p>
          {req.location && <p className="mt-2 text-xs text-[#0D3B3B]/45">{req.location}</p>}
          {req.amountNeeded ? <div className="mt-3"><ProgressBar raised={req.amountRaised} needed={req.amountNeeded} /></div> : null}
          <div className="mt-4 flex gap-3 items-center">
            <button type="button" className="text-sm font-semibold text-[#0D3B3B]" onClick={() => { setPage(`request:${req.id}`); window.history.pushState({}, "", `/request/${req.id}`); window.scrollTo(0,0); }}>View need</button>
            <button type="button" className="text-sm font-semibold text-[#1BAA9C]" onClick={() => setPage("give")}>Help</button>
          </div>
        </article>
      ))}
    </div>
    </>
  );
}

function SeekStoriesSection({ setPage, limit = 3 }) {
  const [stories, setStories] = useState([]);
  const [liveVideos, setLiveVideos] = useState([]);
  useEffect(() => { listAppreciationStories().then((rows) => setStories((rows || []).slice(0, limit))).catch(() => setStories([])); }, [limit]);
  if (!stories.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <SectionLabel>SEEK Stories</SectionLabel>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0D3B3B]">See what happened after people asked.</h2>
          <p className="mt-2 text-sm text-[#0D3B3B]/55">Real updates from requesters, shared after review.</p>
        </div>
        <button type="button" className="text-sm font-semibold text-[#1BAA9C]" onClick={() => setPage("impact")}>See all stories →</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {stories.map((story) => (
          <button key={story.id} type="button" className="text-left rounded-2xl overflow-hidden bg-white border border-[#0D3B3B]/10 shadow-sm" onClick={() => { setPage("impact"); window.scrollTo(0,0); }}>
            {story.public_url && story.media_kind === "video" ? <video src={story.public_url} muted playsInline preload="none" className="h-44 w-full object-cover bg-black" /> : story.public_url ? <img loading="lazy" decoding="async" src={story.public_url} alt="" className="h-44 w-full object-cover" /> : <div className="h-28 bg-[#0D3B3B]/5" />}
            <div className="p-4"><p className="font-display font-bold text-[#0D3B3B] line-clamp-2">{story.title || "A SEEK story"}</p><p className="mt-2 text-sm text-[#0D3B3B]/55 line-clamp-3">{story.story}</p></div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Give Page ---------------- */

const GIVE_OPTIONS = [
  { icon: Wallet, title: "Give money", desc: "Contribute directly toward a specific need." },
  { icon: Utensils, title: "Give food", desc: "Donate food packages or ongoing support." },
  { icon: Shirt, title: "Give clothing", desc: "Pass on clothing that still has life in it." },
  { icon: Package, title: "Give household items", desc: "Furniture, appliances, and everyday essentials." },
  { icon: GraduationCap, title: "Pay school fees", desc: "Sponsor a term, a year, or a specific bill." },
  { icon: Stethoscope, title: "Support medical care", desc: "Help cover treatment or medical costs." },
  { icon: Briefcase, title: "Offer a service", desc: "Legal, medical, tutoring, or professional skills." },
  { icon: HeartHandshake, title: "Volunteer", desc: "Give time instead of, or alongside, items." },
];


function OfferCard({ offer, setPage }) {
  const [open, setOpen] = useState(false);
  const [ownerRows, setOwnerRows] = useState([]);
  const [interestCount, setInterestCount] = useState(Number(offer.interest_count || 0));
  const [viewCount, setViewCount] = useState(Number(offer.view_count || 0));
  const [closed, setClosed] = useState(String(offer.status || "").toLowerCase() === "closed");
  const session = getUserSession();
  const isOwner = Boolean(session?.user?.id && offer.created_by && session.user.id === offer.created_by);
  useEffect(() => {
    getOfferInterestCount(offer.id).then(setInterestCount).catch(() => {});
    if (!isOwner) return;
    listMyOfferInterests(offer.id).then(setOwnerRows).catch(() => setOwnerRows([]));
  }, [isOwner, offer.id]);
  useEffect(() => {
    let cancelled = false;
    recordSeekView("offer", offer.id).then((count) => { if (!cancelled) setViewCount(Number(count || 0)); });
    return () => { cancelled = true; };
  }, [offer.id]);
  const [media, setMedia] = useState(offer.media || []);
  const [apply, setApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(() => {
    try { return Boolean(localStorage.getItem("seek_interest_" + offer.id)); } catch (_e) { return false; }
  });
  const [applyError, setApplyError] = useState("");
  const [applyForm, setApplyForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [applyAvatar, setApplyAvatar] = useState("");
  useEffect(() => {
    const session = getUserSession();
    if (!session?.access_token) return;
    const cached = getCachedAvatarUrl();
    if (cached) setApplyAvatar(cached);
    getMyProfile().then((p) => {
      if (p?.avatar_url) setApplyAvatar(p.avatar_url);
      setApplyForm((prev) => ({
        ...prev,
        email: prev.email || session.user?.email || "",
      }));
    }).catch(() => {});
  }, []);
  const shareText = "Seek offer: " + (offer.description || "") + " https://seekbsn.org/offers";
  return (
    <article className="rounded-2xl bg-white border border-[#0D3B3B]/8 p-5">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {postAvatar(offer.avatar_url, offer) ? (
            <img loading="lazy" decoding="async" src={postAvatar(offer.avatar_url, offer)} alt="" className="h-12 w-12 rounded-full object-cover bg-white" fetchpriority="high" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-[#0D3B3B]/10" />
          )}
          <span className="absolute -right-1 -bottom-1"><SeekVerifiedCheck /></span>
        </div>
        <div className="min-w-0">
          {(offer.category || offer.city) && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1BAA9C]">
              {[offer.category, offer.city].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-1 font-body text-[#0D3B3B] leading-relaxed">{offer.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[#0D3B3B]/45">
            <span>{daysPosted(offer.created_at)}</span>
            <span className="inline-flex items-center gap-1"><Eye size={13} /> {viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}</span>
          </div>
          {isBsnPost(offer) && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#0D3B3B]">Posted by Admin</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
        <button type="button" className="text-[#1BAA9C]" onClick={async () => {
          if (!open && media.length === 0) {
            try {
              const files = await getOfferMedia(offer.id);
              setMedia(files || []);
            } catch (_e) {}
          }
          setOpen(!open);
        }}>
          {open ? "Hide photos" : (media.length ? "Photos (" + media.length + ")" : "Photos")}
        </button>
        <button type="button" className="text-[#0D3B3B]" onClick={() => {
          const session = getUserSession();
          if (closed || applied) return;
          if (!session?.access_token) {
            try { sessionStorage.setItem("seek_return", "offers"); } catch (_e) {}
            if (setPage) setPage("account");
            else window.alert("Sign in first to join a giveaway.");
            return;
          }
          setApply(!apply);
        }}>
          {closed ? "Giveaway ended" : applied ? "You already indicated interest" : interestCount === 1 ? "1 person indicated interest" : interestCount > 1 ? interestCount + " people indicated interest" : "I am interested"}
        </button>
        {isOwner && !closed && (
          <label className="rounded-full border border-[#0D3B3B]/20 px-3 py-1.5 text-xs font-semibold text-[#0D3B3B] cursor-pointer">
            End with proof
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (!window.confirm("Upload this proof and end the giveaway? New interest and emails will stop.")) return;
              try {
                await uploadOfferMedia(offer.id, file);
                await closeMyOffer(offer.id);
                setClosed(true);
                setApply(false);
                const files = await getOfferMedia(offer.id).catch(() => []);
                if (files?.length) setMedia(files);
              } catch (err) {
                window.alert(err.message || "Could not end this giveaway.");
              }
            }} />
          </label>
        )}
        {isOwner && <span className="text-xs text-[#0D3B3B]/45">{ownerRows.filter((r) => r.status === "completed").length} completed</span>}
        <button
          type="button"
          className="text-[#0D3B3B]/50"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: "Seek offer", text: shareText });
              else if (navigator.clipboard) { await navigator.clipboard.writeText(shareText); window.alert("Copied"); }
            } catch (_e) {}
          }}
        >
          Share
        </button>
      </div>
      {!isOwner && (
        <ReportContentForm targetType="offer" targetId={offer.id} label="Report this giveaway" />
      )}
      <CommunityInteractions targetType="offer" targetId={offer.id} compact />

      {isOwner && ownerRows.length > 0 && (
        <div className="mt-4 rounded-xl bg-[#F4F1EA] p-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-[#0D3B3B]/50">People interested</p>
          {ownerRows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{row.name || row.email} · {row.status || "interested"}</span>
              <span className="flex gap-2">
                {row.status !== "completed" && (
                  <button type="button" className="text-[#1BAA9C] font-semibold" onClick={async () => {
                    await markOfferInterestStatus(row.id, row.status === "contacted" ? "completed" : "contacted");
                    setOwnerRows(await listMyOfferInterests(offer.id));
                  }}>{row.status === "contacted" ? "Mark given" : "Reached out"}</button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {apply && !applied && !closed && (
        <form
          className="mt-3 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setApplyError("");
            setApplying(true);
            try {
              await submitOfferInterest({
                offerId: offer.id,
                name: applyForm.name,
                email: applyForm.email,
                phone: applyForm.phone,
                message: applyForm.message,
              });
              setApplied(true); setInterestCount((n) => n + 1); try { localStorage.setItem("seek_interest_" + offer.id, "1"); } catch (_e) {};
            } catch (err) {
              setApplyError(err.message || "Could not send interest.");
            } finally {
              setApplying(false);
            }
          }}
        >
          {applyAvatar && <img loading="lazy" decoding="async" src={applyAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />}
          <input required value={applyForm.name} onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })} placeholder="Your name" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <input required type="email" value={applyForm.email} onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })} placeholder="Your email" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <input value={applyForm.phone} onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })} placeholder="Phone (optional)" className="w-full rounded-xl border px-3 py-2 text-sm" />
          <textarea required value={applyForm.message} onChange={(e) => setApplyForm({ ...applyForm, message: e.target.value })} placeholder="Why you are interested / short application" rows={3} className="w-full rounded-xl border px-3 py-2 text-sm" />
          <button type="submit" disabled={applying} className="rounded-full bg-[#0D3B3B] text-white px-4 py-2 text-sm font-semibold">
            {applying ? "Sending…" : "Send interest"}
          </button>
          {applyError && <p className="text-sm text-red-600">{applyError}</p>}
        </form>
      )}
      {applied && <p className="mt-3 text-sm text-[#1BAA9C]">Your interest was sent. Seek will follow up.</p>}
      {open && media.length > 0 && (
        <div className="mt-3 space-y-3">
          {media.map((m) => (
            m.media_kind === "video" ? (
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video key={m.public_url} src={m.public_url} controls playsInline className="w-full max-h-80 bg-black" controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} />
                <SeekVideoWatermark />
              </div>
            ) : (
              <img loading="lazy" decoding="async" key={m.public_url} src={m.public_url} alt="" className="w-full max-h-80 rounded-xl object-contain bg-[#0D3B3B]/5" />
            )
          ))}
        </div>
      )}
    </article>
  );
}


function GiveOfferForm({ setPage }) {
  const [offer, setOffer] = useState("");
  const [offerFiles, setOfferFiles] = useState([]);
  const [offerTarget, setOfferTarget] = useState("general");
  const [offerRequestId, setOfferRequestId] = useState("");
  const [offerContactEmail, setOfferContactEmail] = useState("");
  const [offerCategory, setOfferCategory] = useState("");
  const [offerCity, setOfferCity] = useState("");
  const [offerContactPhone, setOfferContactPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  useEffect(() => {
    listPublishedRequests().then((rows) => setRequests((rows || []).map((row) => row.title ? row : mapRequestRow(row)).filter((r) => !CONNECT_CATS.includes(r.category)))).catch(() => {});
    try {
      const raw = sessionStorage.getItem("seek_offer_draft");
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.offer) setOffer(draft.offer);
        if (draft.offerCategory) setOfferCategory(draft.offerCategory);
        if (draft.offerTarget) setOfferTarget(draft.offerTarget);
        if (draft.offerRequestId) setOfferRequestId(draft.offerRequestId);
        if (draft.offerCity) setOfferCity(draft.offerCity);
        if (draft.offerContactEmail) setOfferContactEmail(draft.offerContactEmail);
        if (draft.offerContactPhone) setOfferContactPhone(draft.offerContactPhone);
      }
    } catch (_e) {}
    const session = getUserSession();
    if (session?.user?.email) setOfferContactEmail((prev) => prev || session.user.email);
  }, []);

  const targetOptions = [
    { id: "general", title: "General offer", desc: "Anyone who needs this", icon: HandHeart },
    { id: "request", title: "Support a SEEK request", desc: "Choose an existing public request", icon: Search },
    { id: "outreach", title: "BSN Foundation outreach", desc: "Support a Foundation outreach", icon: BadgeCheck },
  ];
  const offerTypes = [
    ["money", "Financial support", Wallet],
    ["food", "Food", Utensils],
    ["items", "Goods & supplies", Package],
    ["job", "Job opportunity", Briefcase],
    ["mentorship", "Mentorship", Users],
    ["counselling", "Counselling", HeartHandshake],
    ["education", "Education / training", GraduationCap],
    ["skills", "Professional skills / services", Handshake],
    ["transport", "Transportation", Bus],
    ["shelter", "Accommodation", HomeIcon],
    ["other", "Other support", MoreHorizontal],
  ];

  if (submitted) {
    return (
      <div className="rounded-3xl border border-[#0D3B3B]/8 p-10 text-center bg-white">
        <CheckCircle2 size={36} className="mx-auto text-[#1BAA9C] mb-4" />
        <h2 className="font-display font-bold text-2xl text-[#0D3B3B] mb-2">We have your giveaway.</h2>
        <p className="font-body text-[#0D3B3B]/65">SEEK will review it. If approved, it can appear on Giveaways so people can indicate interest. You will see interest by email and in your inbox.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#0D3B3B]/8 p-5 sm:p-8 bg-white pb-28">
      <h2 className="font-display font-bold text-2xl text-[#0D3B3B] mb-2">What can you give away?</h2>
      <p className="font-body text-sm text-[#0D3B3B]/60 mb-6">Start by choosing who or what your offer is for.</p>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45 mb-3">Who would you like to support?</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {targetOptions.map((item) => {
          const Icon = item.icon;
          const active = offerTarget === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setOfferTarget(item.id); if (item.id !== "request") setOfferRequestId(""); }}
              className={`text-left rounded-2xl border p-4 transition ${active ? "border-[#1BAA9C] bg-[#1BAA9C]/8 ring-2 ring-[#1BAA9C]/15" : "border-[#0D3B3B]/10 hover:border-[#0D3B3B]/25"}`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D3B3B]/7 text-[#0D3B3B] mb-3"><Icon size={18} /></span>
              <span className="block font-display font-bold text-sm text-[#0D3B3B]">{item.title}</span>
              <span className="block mt-1 text-xs leading-relaxed text-[#0D3B3B]/55">{item.desc}</span>
            </button>
          );
        })}
      </div>

      {offerTarget === "request" && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45 mb-3">Choose the request</p>
          {requests.length === 0 ? (
            <p className="rounded-2xl bg-[#F2F5F3] p-4 text-sm text-[#0D3B3B]/60">There are no eligible published requests to choose from right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {requests.map((r) => {
                const active = offerRequestId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setOfferRequestId(r.id)}
                    className={`rounded-xl border p-3 text-left transition ${active ? "border-[#1BAA9C] bg-[#1BAA9C]/8" : "border-[#0D3B3B]/10 hover:border-[#0D3B3B]/25"}`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide text-[#1BAA9C]">{r.category}</span>
                    <span className="block mt-1 text-sm font-semibold text-[#0D3B3B] line-clamp-2">{r.title}</span>
                    {r.location && <span className="block mt-1 text-xs text-[#0D3B3B]/45">{r.location}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45 mb-3">What would you like to offer?</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        {offerTypes.map(([id, label, Icon]) => {
          const active = offerCategory === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOfferCategory(id)}
              className={`rounded-xl border p-3 text-left flex items-center gap-2.5 min-h-[3.25rem] transition ${active ? "border-[#1BAA9C] bg-[#1BAA9C]/8 text-[#0D3B3B]" : "border-[#0D3B3B]/10 text-[#0D3B3B]/70 hover:border-[#0D3B3B]/25"}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="text-xs sm:text-sm font-semibold leading-tight">{label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45 mb-2">City</p>
      <input value={offerCity} onChange={(e) => setOfferCity(e.target.value)} placeholder="City (optional)" className="w-full rounded-xl border border-[#0D3B3B]/15 bg-white p-4 mb-4 font-body text-[#0D3B3B]" />
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45 mb-2">Describe the giveaway</p>
      <textarea value={offer} onChange={(e) => setOffer(e.target.value)} rows={4} placeholder="Tell people what you can provide…" className="w-full rounded-xl border border-[#0D3B3B]/15 bg-white p-4 font-body text-[#0D3B3B] mb-2" />
      <button type="button" className="mb-3 text-sm font-semibold text-[#1BAA9C]" onClick={async () => {
        if (!String(offer || "").trim()) {
          setOfferError("Write a short offer first, then tap Help me explain this.");
          return;
        }
        try {
          const draft = await seekAiAssist({ purpose: "classify", title: offerCategory || "giveaway", description: offer });
          const local = explainSeekNeed(offer);
          setOffer((draft.description || local?.description || offer).replace(/^I am asking the SEEK community for help\. /i, "I can offer this to a neighbour. "));
          setOfferError("Draft updated. Edit it before you submit.");
        } catch (err) {
          setOfferError(err.message || "Could not draft the offer.");
        }
      }}>Help me explain this</button>
      <input type="email" required value={offerContactEmail} onChange={(e) => setOfferContactEmail(e.target.value)} placeholder="Your email" className="w-full rounded-xl border border-[#0D3B3B]/15 bg-white p-4 mb-3 font-body text-[#0D3B3B]" />
      <input type="tel" value={offerContactPhone} onChange={(e) => setOfferContactPhone(e.target.value)} placeholder="Phone number (optional)" className="w-full rounded-xl border border-[#0D3B3B]/15 bg-white p-4 mb-3 font-body text-[#0D3B3B]" />
      <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" className="w-full text-sm mb-4" onChange={(e) => setOfferFiles(Array.from(e.target.files || []).slice(0, 6))} />
      <p className="text-xs text-[#0D3B3B]/45 mb-4">Add a photo or short video if it helps people understand your offer.</p>
      <Button variant="primary" disabled={!offer.trim() || !offerCategory || (offerTarget === "request" && !offerRequestId) || offerLoading} onClick={async () => {
        setOfferError(""); setOfferLoading(true);
        try {
          if (!getUserSession()?.access_token) {
            try {
              sessionStorage.setItem("seek_return", "offers");
              sessionStorage.setItem("seek_offer_draft", JSON.stringify({
                offer, offerCategory, offerTarget, offerRequestId, offerCity, offerContactEmail, offerContactPhone,
              }));
            } catch (_e) {}
            if (setPage) setPage("account");
            else window.location.href = "/account";
            return;
          }
          await submitOffer({ description: offer, category: offerCategory || null, requestId: offerTarget === "request" ? offerRequestId : null, contactEmail: offerContactEmail || getUserSession()?.user?.email || null, contactPhone: offerContactPhone || null, city: offerCity || null, files: offerFiles });
          setSubmitted(true);
          try { sessionStorage.removeItem("seek_offer_draft"); } catch (_e) {}
        } catch (err) { setOfferError(err.message); }
        finally { setOfferLoading(false); }
      }}>{offerLoading ? "Submitting…" : "Submit giveaway"}</Button>
      {offerError && <p className="mt-3 text-sm text-red-600">{offerError}</p>}
    </div>
  );
}



function SeekAutoVideo({ src, title }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.muted = true;
    setEnded(false);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          node.play().catch(() => {});
        } else {
          node.pause();
          node.muted = true;
          setMuted(true);
        }
      });
    }, { threshold: [0, 0.55, 1] });
    io.observe(node);
    return () => io.disconnect();
  }, [src]);
  const toggleSound = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    v.volume = 1;
    setMuted(next);
    const play = v.play();
    if (play && play.catch) play.catch(() => {});
  };
  return (
    <>
      <video ref={ref} src={src} muted playsInline preload="none" controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} className="absolute inset-0 h-full w-full object-cover" aria-label={title} onClick={toggleSound} onEnded={() => setEnded(true)} />
      <SeekVideoWatermark />
      {ended && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setEnded(false); const v = ref.current; if (v) { v.currentTime = 0; v.play().catch(() => {}); } }} className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0D3B3B]">Replay</button>
      )}
    </>
  );
}

function LiveSupportCard({ request, setPage }) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const media = Array.isArray(request.media) ? request.media : [];
  const current = media[mediaIndex] || null;
  const amountNeeded = Number(request.amountNeeded) || 0;
  const amountRaised = Number(request.amountRaised) || 0;
  const progress = amountNeeded > 0 ? Math.min(100, Math.round((amountRaised / amountNeeded) * 100)) : 0;
  const member = request.member || {};
  const rawName = member.name || request.full_name || request.name || member.username || request.username || "";
  const displayName = /^seek member$|^seeker$|^a neighbour/i.test(String(rawName).trim()) ? (member.username || request.username || "Neighbour") : (rawName || member.username || request.username || "Neighbour");
  const username = (member.username || request.username) ? `@${member.username || request.username}` : "";

  const goToCase = () => {
    if (request.feedKind === "impact") {
      window.history.pushState({}, "", `/impact/${request.id}`);
      setPage(`impact:${request.id}`);
    } else if (request.feedKind === "appreciation") {
      window.history.pushState({}, "", `/impact/${request.id}`);
      setPage(`impact:${request.id}`);
    } else {
      setPage(`request:${request.id}`);
      window.history.pushState({}, "", `/request/${request.id}`);
    }
    window.scrollTo(0, 0);
  };

  const supportCase = () => setDonateOpen(true);

  return (
    <article className="mx-auto flex h-[calc(100dvh-12.5rem)] w-full max-w-[440px] snap-start snap-always flex-col overflow-hidden rounded-[1.5rem] bg-black shadow-[0_16px_40px_rgba(13,59,59,0.16)]">
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#101415]">
        {current?.media_kind === "video" ? (
          <SeekAutoVideo src={current.public_url} title={request.title || "SEEK support video"} />
        ) : current?.public_url ? (
          <img key={current.public_url} src={current.public_url} alt={request.title || "SEEK support case"} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D3B3B] px-8 text-center text-white">
            <div><HandHeart size={42} className="mx-auto mb-3 text-[#8DE3C5]" /><p className="font-display text-xl font-bold">Support is needed</p><p className="mt-2 text-sm text-white/65">Open this case to see the full request.</p></div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 p-4 bg-gradient-to-b from-black/70 via-black/25 to-transparent text-white">
          <div className="flex items-center gap-3">
            {postAvatar(member.avatar_url || request.avatarUrl || request.avatar_url, request) ? <img src={postAvatar(member.avatar_url || request.avatarUrl || request.avatar_url, request)} alt="" className="h-11 w-11 rounded-full object-cover border-2 border-white/80" /> : <div className="h-11 w-11 rounded-full bg-white/20 border-2 border-white/60" />}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold leading-tight truncate">{displayName} <span className="text-[#8DE3C5]">✓</span></p>
              <p className="text-xs text-white/70 truncate">{daysPosted(request.created_at || request.createdAt || request.published_at)}</p>
            </div>
            <span className="max-w-[42%] shrink-0 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] backdrop-blur text-center leading-tight">{videoKindLabel(request)}</span>
          </div>
        </div>

        <div className="absolute right-3 bottom-24 flex flex-col gap-2">
          {media.length > 1 && <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{mediaIndex + 1}/{media.length}</span>}
        </div>

        {media.length > 1 && (
          <>
            <button type="button" aria-label="Previous media" onClick={() => setMediaIndex((i) => (i - 1 + media.length) % media.length)} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white backdrop-blur text-xl">‹</button>
            <button type="button" aria-label="Next media" onClick={() => setMediaIndex((i) => (i + 1) % media.length)} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white backdrop-blur text-xl">›</button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-black/90 via-black/55 to-transparent text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8DE3C5]">{request.category || "Support needed"}{request.location ? ` · ${request.location}` : ""}</p>
          <h2 className="mt-1 font-display text-xl font-extrabold leading-tight line-clamp-2">{request.title || "Support needed"}</h2>
        </div>
      </div>

      <div className="shrink-0 bg-white px-4 pt-3 pb-4">
        {isFinancialNeed(request) && amountNeeded > 0 && <div><div className="flex items-end justify-between gap-3 text-sm"><div><p className="font-semibold text-[#0D3B3B]">₦{amountRaised.toLocaleString()} raised</p><p className="mt-0.5 text-xs text-[#0D3B3B]/50">of ₦{amountNeeded.toLocaleString()}</p></div><span className="font-bold text-[#1BAA9C]">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0D3B3B]/10"><div className="h-full rounded-full bg-[#1BAA9C]" style={{ width: `${progress}%` }} /></div></div>}
        <div className="mt-2 flex items-center gap-2">
          {isFinancialNeed(request) ? (
            <button type="button" onClick={supportCase} className="flex-1 rounded-full bg-[#1BAA9C] px-3 py-2.5 text-sm font-bold text-white">Give</button>
          ) : (
            <button type="button" onClick={goToCase} className="flex-1 rounded-full bg-[#0D3B3B] px-3 py-2.5 text-sm font-bold text-white">View</button>
          )}
          <button type="button" onClick={goToCase} className="flex-1 rounded-full border border-[#0D3B3B]/15 px-3 py-2.5 text-sm font-semibold text-[#0D3B3B]">More</button>
          <button
            type="button"
            className="flex-1 rounded-full border border-[#0D3B3B]/15 px-3 py-2.5 text-sm font-semibold text-[#0D3B3B]"
            onClick={async () => {
              const path = request.feedKind === "impact" || request.feedKind === "appreciation"
                ? `/impact/${request.id}`
                : `/request/${request.id}`;
              await shareSeekStory({
                title: request.title || "A neighbour on SEEK",
                path,
                mediaUrl: current?.public_url || "",
              });
            }}
          >
            Share
          </button>
        </div>
      </div>
      {donateOpen && <CaseDonateSheet request={request} onClose={() => setDonateOpen(false)} />}
    </article>
  );
}


function DiscoverPage({ setPage }) {
  const [tab, setTab] = useState("latest");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const go = (page, path) => {
    if (path) window.history.pushState({}, "", path);
    setPage(page);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listPublishedRequests(24).catch(() => []),
      listPublicOffers().catch(() => []),
      listPublishedImpact().catch(() => []),
      listAppreciationStories().catch(() => []),
    ]).then(([requests, offers, impact, thanks]) => {
      if (cancelled) return;
      const stamp = (row) => new Date(row.created_at || row.createdAt || row.published_at || row.happened_on || 0).getTime() || 0;
      const feed = [
        ...(Array.isArray(requests) ? requests : []).map((row) => {
          const r = row.title ? row : mapRequestRow(row);
          const connect = CONNECT_CATS.includes(r.category);
          return {
            key: "req-" + r.id,
            kind: connect ? "Celebrate" : /job|mentor|counsel/i.test(String(r.category || "")) ? r.category : "Request",
            title: r.title || "Open request",
            body: r.location || r.category || "",
            at: stamp(r),
            page: "request:" + r.id,
            path: "/request/" + r.id,
          };
        }),
        ...(Array.isArray(offers) ? offers : []).map((o) => ({
          key: "off-" + o.id,
          kind: /job/i.test(String(o.category || "")) ? "Job" : /mentor/i.test(String(o.category || "")) ? "Mentorship" : /counsel/i.test(String(o.category || "")) ? "Counselling" : "Giveaway",
          title: String(o.description || "Open giveaway").slice(0, 90),
          body: [o.category, o.city].filter(Boolean).join(" · "),
          at: stamp(o),
          page: "offers",
          path: "/offers",
        })),
        ...(Array.isArray(impact) ? impact : []).map((row) => ({
          key: "imp-" + row.id,
          kind: "Impact",
          title: row.title || "Community impact",
          body: row.location || "",
          at: stamp(row),
          page: "impact:" + row.id,
          path: "/impact/" + row.id,
        })),
        ...(Array.isArray(thanks) ? thanks : []).map((row) => ({
          key: "thx-" + (row.id || row.request_id),
          kind: "Appreciation",
          title: row.title || "Thank you",
          body: row.location || "",
          at: stamp(row),
          page: row.request_id ? "request:" + row.request_id : "impact",
          path: row.request_id ? "/request/" + row.request_id : "/impact",
        })),
      ].sort((a, b) => b.at - a.at);
      setItems(feed);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const latest = items.slice(0, 40);
  const trending = items.filter((item) => ["Impact", "Appreciation", "Giveaway", "Job"].includes(item.kind)).slice(0, 20);
  const shown = tab === "trending" ? trending : latest;
  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-2xl px-5 pt-10 pb-4">
        <SectionLabel>Discover</SectionLabel>
        <h1 className="font-display font-extrabold text-3xl text-[#0D3B3B]">What is happening on SEEK</h1>
        <p className="mt-2 text-sm text-[#0D3B3B]/55">Latest public requests, giveaways, impact and thank-yous.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setTab("latest")} className={"rounded-full px-4 py-2 text-sm font-semibold " + (tab === "latest" ? "bg-[#0D3B3B] text-white" : "border border-[#0D3B3B]/15")}>Latest</button>
          <button type="button" onClick={() => setTab("trending")} className={"rounded-full px-4 py-2 text-sm font-semibold " + (tab === "trending" ? "bg-[#0D3B3B] text-white" : "border border-[#0D3B3B]/15")}>Trending</button>
        </div>
      </section>
      <section className="mx-auto max-w-2xl px-5 pb-28 space-y-3">
        {loading && <p className="text-sm text-[#0D3B3B]/50">Loading SEEK activity…</p>}
        {!loading && !shown.length && <p className="text-sm text-[#0D3B3B]/55">Nothing public to show yet.</p>}
        {shown.map((item) => (
          <button key={item.key} type="button" onClick={() => go(item.page, item.path)} className="w-full text-left rounded-2xl bg-white border border-[#0D3B3B]/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1BAA9C]">{item.kind}{item.at ? " · " + daysPosted(new Date(item.at).toISOString()) : ""}</p>
            <p className="mt-1 font-display font-bold text-[#0D3B3B]">{item.title}</p>
            {item.body ? <p className="mt-1 text-sm text-[#0D3B3B]/55">{item.body}</p> : null}
          </button>
        ))}
      </section>
    </div>
  );
}

function ForYouPage({ setPage }) {
  const [liveCases, setLiveCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listLiveSupportCases(16)
      .then((rows) => {
        if (cancelled) return;
        setLiveCases((Array.isArray(rows) ? rows : []).filter((item) => item && Array.isArray(item.media) && item.media.length));
      })
      .catch((err) => { if (!cancelled) setError(err?.message || "Could not load neighbour stories."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: C.bg }}>
      <section className="px-5 pt-10 pb-16">
        <div className="mx-auto max-w-[440px] text-center mb-6">
          <SectionLabel>SEEK Videos</SectionLabel>
          <h1 className="font-display font-extrabold text-3xl text-[#0D3B3B]">For You</h1>
          <p className="mt-2 text-sm text-[#0D3B3B]/55">Hear the story. Then decide how to help.</p>
        </div>
        {loading && <p className="mx-auto max-w-[440px] text-center text-sm text-[#0D3B3B]/50">Loading videos…</p>}
        {error && <p className="mx-auto max-w-[440px] text-center text-sm text-red-700">{error}</p>}
        {!loading && !error && liveCases.length === 0 && (
          <p className="mx-auto max-w-[440px] text-center text-sm text-[#0D3B3B]/55">No public videos yet. Approved request evidence will appear here.</p>
        )}
        <div className="mx-auto max-w-[440px] h-[calc(100dvh-12.5rem)] overflow-y-auto snap-y snap-mandatory scroll-smooth pb-4">
          {liveCases.map((request) => (
            <div key={request.id} className="mb-3 snap-start">
              <LiveSupportCard request={request} setPage={setPage} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OffersPage({ setPage }) {
  const [offers, setOffers] = useState([]);
  const [offerFilter, setOfferFilter] = useState(() => {
    try { return sessionStorage.getItem("seek_offer_filter") || "all"; } catch (_e) { return "all"; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listPublicOffers();
        if (!cancelled) setOffers(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load giveaways.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const typeOf = (offer) => {
    const value = String(offer?.category || "").trim().toLowerCase();
    if (value.includes("job")) return "job";
    if (value.includes("mentor")) return "mentorship";
    if (value.includes("counsel")) return "counselling";
    return "goods";
  };

  const filteredOffers = offers.filter((offer) => {
    const type = typeOf(offer);
    const matchesType = offerFilter === "all" || type === offerFilter;
    const haystack = [offer.description, offer.category, offer.city].filter(Boolean).join(" ").toLowerCase();
    return matchesType && (!q.trim() || haystack.includes(q.trim().toLowerCase()));
  });

  const tabs = [
    ["all", "All"],
    ["goods", "Goods"],
    ["job", "Jobs"],
    ["mentorship", "Mentorship"],
    ["counselling", "Counselling"],
  ];

  const selectFilter = (value) => {
    setOfferFilter(value);
    try { sessionStorage.setItem("seek_offer_filter", value === "all" ? "" : value); } catch (_e) {}
  };

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-5xl px-5 sm:px-8 pt-14 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="max-w-2xl">
            <SectionLabel>Giveaways</SectionLabel>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0D3B3B]">Have something useful to offer?</h1>
            <p className="mt-4 font-body text-lg leading-relaxed text-[#0D3B3B]/65">
              Share goods, opportunities, skills or your time. Someone in the SEEK community may need exactly what you can give.
            </p>
          </div>
          <Button variant="primary" onClick={() => document.getElementById("make-offer")?.scrollIntoView({ behavior: "smooth" })}>Post a giveaway</Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-20">
        <div className="rounded-3xl bg-white border border-[#0D3B3B]/8 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Giveaway categories">
              {tabs.map(([value, label]) => {
                const active = offerFilter === value;
                return (
                  <button key={value} type="button" onClick={() => selectFilter(value)} className={"shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition " + (active ? "bg-[#1BAA9C] text-white" : "bg-[#F2F5F3] text-[#0D3B3B]/70 hover:bg-[#E7EFEC]")}>
                    {label}
                  </button>
                );
              })}
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search giveaways" aria-label="Search giveaways" className="w-full sm:w-56 rounded-full border border-[#0D3B3B]/10 bg-[#F8FAF9] px-4 py-2.5 text-sm outline-none focus:border-[#1BAA9C]" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-2xl text-[#0D3B3B]">{offerFilter === "all" ? "What's being offered" : tabs.find(([v]) => v === offerFilter)?.[1]}</h2>
            <p className="mt-1 text-sm text-[#0D3B3B]/50">Published giveaways from the SEEK community.</p>
          </div>
          {!loading && <span className="text-sm font-semibold text-[#0D3B3B]/45">{filteredOffers.length} {filteredOffers.length === 1 ? "post" : "posts"}</span>}
        </div>

        <div className="mt-4 space-y-4">
          {loading && <div className="rounded-2xl bg-white border border-[#0D3B3B]/8 p-6 text-sm text-[#0D3B3B]/50">Loading giveaways…</div>}
          {error && <div className="rounded-2xl bg-white border border-red-200 p-6 text-sm text-red-600">{error}</div>}
          {!loading && !error && filteredOffers.length === 0 && (
            <div className="rounded-2xl bg-white border border-[#0D3B3B]/8 p-8 text-center">
              <h3 className="font-display font-bold text-xl text-[#0D3B3B]">Nothing here yet</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#0D3B3B]/55">There are no published giveaways matching this filter right now. You can be the first to offer something useful.</p>
              <button type="button" onClick={() => document.getElementById("make-offer")?.scrollIntoView({ behavior: "smooth" })} className="mt-5 rounded-full bg-[#1BAA9C] px-5 py-2.5 text-sm font-bold text-white">Post a giveaway</button>
            </div>
          )}
          {!loading && !error && filteredOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} setPage={setPage} />
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-[#0D3B3B] p-6 sm:p-8 text-white">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8DE0D5]">Give in your own way</p>
            <h2 className="mt-2 font-display font-extrabold text-2xl">Goods, jobs, mentorship or counselling</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">These are all part of Giveaways. Choose the type that best describes what you can offer, and SEEK will review it before it goes public.</p>
          </div>
          <button type="button" onClick={() => document.getElementById("make-offer")?.scrollIntoView({ behavior: "smooth" })} className="mt-5 rounded-full bg-[#1BAA9C] px-5 py-2.5 text-sm font-bold text-white">Offer something</button>
        </div>

        <div id="make-offer" className="pt-12 text-left">
          <GiveOfferForm setPage={setPage} />
        </div>
      </section>
    </div>
  );
}

function GivePage({ setPage }) {
  const [sponsors, setSponsors] = useState([]);
  useEffect(() => { listPublicSponsors().then(setSponsors).catch(() => {}); }, []);
  const [outreach, setOutreach] = useState(null);
  const [storyCampaign, setStoryCampaign] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("outreach");
    return OUTREACH_CAMPAIGNS.find((c) => c.id === id) || null;
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [offer, setOffer] = useState("");
  const [offerFiles, setOfferFiles] = useState([]);
  const [offerRequestId, setOfferRequestId] = useState("");
  const [offerContactEmail, setOfferContactEmail] = useState("");
  const [offerCategory, setOfferCategory] = useState("");
  const [offerCity, setOfferCity] = useState("");
const [offerContactPhone, setOfferContactPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [donating, setDonating] = useState(false);
  const [payment, setPayment] = useState({ amount: "2000", email: (getUserSession()?.user?.email || ""), name: "", anonymous: false, coverFee: true });
  const [paymentError, setPaymentError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [generalDonation, setGeneralDonation] = useState(false);
  const [myGifts, setMyGifts] = useState([]);
  const [giftsLoading, setGiftsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const session = getUserSession();
    if (!session?.access_token) { setMyGifts([]); return () => { cancelled = true; }; }
    setGiftsLoading(true);
    listMyGifts().then((rows) => {
      if (!cancelled) setMyGifts(Array.isArray(rows) ? rows : []);
    }).catch(() => {
      if (!cancelled) setMyGifts([]);
    }).finally(() => {
      if (!cancelled) setGiftsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let donorTick;
    (async () => {
      try {
        const [rows, matchedIds] = await Promise.all([
  listPublishedRequests(12),
  listMatchedOfferRequestIds(),
]);
const matchedSet = new Set(matchedIds);
if (!cancelled) {
  setRequests((rows || []).map((row) => row.title ? row : mapRequestRow(row)).map((r) => ({ ...r, helped: matchedSet.has(r.id) })));
}
      } catch (err) {
        if (!cancelled) setRequestsError(err.message);
      } finally {
        if (!cancelled) setRequestsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [campaign, setCampaign] = useState(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("seek_campaign");
      if (!raw) return;
      const c = JSON.parse(raw);
      sessionStorage.removeItem("seek_campaign");
      setCampaign(c);
      setPayment((prev) => ({ ...prev, amount: String(c.amount || prev.amount || "") }));
      setDonating(true);
    } catch (_e) {}
  }, []);

  function selectRequest(req) {
    if (CONNECT_CATS.includes(req?.category)) {
      setPage(`request:${req.id}`);
      window.history.pushState({}, "", `/request/${req.id}`);
      return;
    }
    setSelectedRequest(req);
    setDonating(true);
    setOfferRequestId(req?.id || "");
    document.getElementById("donate-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const wanted = sessionStorage.getItem("seek_help_request_id");
    if (!wanted || !requests.length) return;
    const match = requests.find((r) => r.id === wanted);
    if (match) {
      sessionStorage.removeItem("seek_help_request_id");
      selectRequest(match);
    }
  }, [requests]);

  async function startDonation(e) {
    e.preventDefault(); setPaymentError(""); setPaymentLoading(true);
    try {
      const result = await initializeDonation({
        amount: Number(payment.amount),
        email: getUserSession()?.user?.email || payment.email,
        requestId: selectedRequest?.id || null,
        anonymous: payment.anonymous,
        donorName: campaign ? ((payment.name || "Supporter") + " · " + campaign.title) : (payment.name || ""),
        coverFee: payment.coverFee !== false,
        callbackUrl: window.location.origin,
      });
      window.location.href = result.authorization_url;
    }
    catch (err) { setPaymentError(err.message); } finally { setPaymentLoading(false); }
  }
  async function sendOffer() {
    setOfferError(""); setOfferLoading(true);
    try { await submitOffer({ description: offer, category: offerCategory || null, requestId: (offerRequestId && offerRequestId !== 'outreach') ? offerRequestId : null, contactEmail: offerContactEmail || null, contactPhone: offerContactPhone || null, city: offerCity || null, files: offerFiles }); setSubmitted(true); }
    catch (err) { setOfferError(err.message); }
    finally { setOfferLoading(false); }
  }

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-12 sm:pt-16 pb-10">
        <div className="max-w-3xl">
          <SectionLabel>Give</SectionLabel>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0D3B3B]">Someone is waiting on a neighbour.</h1>
          <p className="mt-4 font-body text-lg leading-relaxed text-[#0D3B3B]/65">Pick a published request and give through Paystack. You do not need an account. Or fund a BSN outreach if you want your gift to reach more than one person.</p>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <button type="button" onClick={() => document.getElementById("help-someone")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="group rounded-3xl bg-white border border-[#0D3B3B]/10 p-6 sm:p-7 text-left hover:-translate-y-0.5 hover:shadow-md transition">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1BAA9C]/10 text-[#1BAA9C]"><HeartHandshake size={21}/></span>
            <h2 className="mt-5 font-display font-bold text-2xl text-[#0D3B3B]">Help someone directly</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0D3B3B]/55">Choose a published request and make a financial contribution through the existing secure Paystack flow.</p>
            <span className="mt-4 inline-flex text-sm font-bold text-[#1BAA9C]">See open requests →</span>
          </button>
          <button type="button" onClick={() => document.getElementById("bsn-work")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="group rounded-3xl bg-[#0D3B3B] p-6 sm:p-7 text-left text-white hover:-translate-y-0.5 hover:shadow-md transition">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#8DE3C5]"><HeartHandshake size={21}/></span>
            <h2 className="mt-5 font-display font-bold text-2xl">Support BSN Foundation work</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">Support an existing BSN outreach and help fund work beyond an individual SEEK request.</p>
            <span className="mt-4 inline-flex text-sm font-bold text-[#8DE3C5]">See BSN work →</span>
          </button>
        </div>
        <ShopSupportStrip setPage={setPage} />

        {getUserSession()?.access_token && (
          <div className="mt-5 rounded-3xl bg-[#F2F5F3] border border-[#0D3B3B]/8 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Your giving</p><h2 className="mt-1 font-display font-bold text-xl text-[#0D3B3B]">What you gave neighbours stay here.</h2><p className="mt-1 text-sm text-[#0D3B3B]/55">Your giving history is private to your account.</p></div>
              <div className="sm:text-right"><p className="text-xs text-[#0D3B3B]/45">Successful gifts</p><p className="font-display font-extrabold text-2xl text-[#0D3B3B]">{giftsLoading ? "—" : myGifts.length}</p></div>
            </div>
            {myGifts.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{myGifts.slice(0,3).map((g) => <span key={g.id} className="rounded-full bg-white border border-[#0D3B3B]/8 px-3 py-1.5 text-xs font-semibold text-[#0D3B3B]/70">₦{Number(g.amount || 0).toLocaleString()}</span>)}</div>}
          </div>
        )}
      </section>
      {selectedRequest && (
        <div className="sticky top-0 z-30 border-b border-[#0D3B3B]/10 bg-[#F2F5F3]/95 px-5 py-3 text-center backdrop-blur">
          <p className="font-display font-semibold text-[#0D3B3B]">Helping: {selectedRequest.title}</p>
          <button type="button" className="text-xs text-[#1BAA9C]" onClick={() => setSelectedRequest(null)}>Choose a different request</button>
        </div>
      )}

      {selectedRequest && <SeekDonateModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
      {generalDonation && !selectedRequest && <SeekDonateModal campaign={{ title: "SEEK community" }} onClose={() => setGeneralDonation(false)} />}
      {false && (selectedRequest || generalDonation) && <section className="mx-auto max-w-md px-5 pb-28" id="donate-form">
        <form onSubmit={startDonation} className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">{selectedRequest ? "Give to this neighbour" : "Give to SEEK"}</p>
          <h2 className="mt-1 font-display font-extrabold text-xl text-[#0D3B3B]">{selectedRequest ? selectedRequest.title : "A general gift"}</h2>
          {selectedRequest?.location && <p className="mt-1 text-sm text-[#0D3B3B]/50">{selectedRequest.location}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {[1000, 2000, 5000, 10000].map((n) => (
              <button key={n} type="button" className={"rounded-full px-3 py-2 text-sm font-semibold " + (Number(payment.amount) === n ? "bg-[#0D3B3B] text-white" : "border border-[#0D3B3B]/15 text-[#0D3B3B]")} onClick={() => setPayment({ ...payment, amount: String(n) })}>
                ₦{n.toLocaleString()}
              </button>
            ))}
          </div>
          <input required min="100" type="number" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} placeholder="Or type an amount" className="mt-3 w-full rounded-xl border border-[#0D3B3B]/15 px-4 py-3 text-[#0D3B3B]" />
          {!payment.anonymous && (
            <input type="text" value={payment.name || ""} onChange={e=>setPayment({...payment,name:e.target.value})} placeholder="Name to show (optional)" className="mt-3 w-full rounded-xl border border-[#0D3B3B]/15 px-4 py-3 text-[#0D3B3B]" />
          )}
          {getUserSession()?.user?.email ? (
            <p className="mt-3 text-sm text-[#0D3B3B]/55">Receipt goes to {getUserSession().user.email}</p>
          ) : (
            <input required type="email" value={payment.email} onChange={e=>setPayment({...payment,email:e.target.value})} placeholder="Email for receipt" className="mt-3 w-full rounded-xl border border-[#0D3B3B]/15 px-4 py-3 text-[#0D3B3B]" />
          )}
          <label className="mt-3 flex items-center gap-2 text-sm text-[#0D3B3B]/65"><input type="checkbox" checked={payment.anonymous} onChange={e=>setPayment({...payment,anonymous:e.target.checked})}/> Give anonymously</label>
          <label className="mt-2 flex items-center gap-2 text-sm text-[#0D3B3B]/65"><input type="checkbox" checked={payment.coverFee !== false} onChange={e=>setPayment({...payment,coverFee:e.target.checked})}/> Add 5% so SEEK can keep the lights on</label>
          {payment.amount && <p className="mt-2 text-sm text-[#0D3B3B]/55">You pay ₦{Math.round(Number(payment.amount) * (payment.coverFee !== false ? 1.05 : 1)).toLocaleString()}</p>}
          {paymentError && <p className="mt-2 text-sm text-red-600">{paymentError}</p>}
          <button disabled={paymentLoading} type="submit" className="mt-4 w-full rounded-full bg-[#0D3B3B] text-white py-3.5 text-sm font-bold">{paymentLoading ? "Opening Paystack…" : "Continue to Paystack"}</button>
          {selectedRequest && <button type="button" onClick={() => { setSelectedRequest(null); setGeneralDonation(true); }} className="mt-3 w-full text-center text-sm text-[#1BAA9C]">Give a general gift instead</button>}
        </form>
      </section>}

      <section id="help-someone" className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Help someone directly</p>
          <h2 className="mt-1 font-display font-bold text-2xl text-[#0D3B3B]">Open requests</h2>
          <p className="mt-1 text-sm text-[#0D3B3B]/55">Choose a published request to support. You can donate without creating an account.</p>
        </div>
        {!selectedRequest && !generalDonation && (
          <button
            type="button"
            className="mb-4 text-sm font-semibold text-[#1BAA9C]"
            onClick={() => { setGeneralDonation(true); setSelectedRequest(null); }}
          >
            Or give a general donation
          </button>
        )}
        <input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search requests"
          className="mb-4 w-full rounded-xl border border-[#0D3B3B]/15 px-4 py-3 text-sm"
        />
        <div className="mb-3 flex flex-wrap gap-2">
          {["all", ...Array.from(new Set(requests.map((r) => r.category).filter(Boolean)))].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1.5 text-sm ${categoryFilter === cat ? "bg-[#0D3B3B] text-white" : "border border-[#0D3B3B]/15 text-[#0D3B3B]"}`}
            >
              {cat === "all" ? "All categories" : cat}
            </button>
          ))}
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {["all", ...Array.from(new Set(requests.map((r) => r.location).filter(Boolean)))].map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocationFilter(loc)}
              className={`rounded-full px-3 py-1.5 text-sm ${locationFilter === loc ? "bg-[#1BAA9C] text-white" : "border border-[#0D3B3B]/15 text-[#0D3B3B]"}`}
            >
              {loc === "all" ? "All locations" : loc}
            </button>
          ))}
        </div>
        {requestsLoading ? (
          <p className="font-body text-sm text-[#0D3B3B]/50">Loading open requests…</p>
        ) : requestsError ? (
          <p className="font-body text-sm text-red-600">{requestsError}</p>
        ) : requests.length === 0 ? (
          <p className="font-body text-sm text-[#0D3B3B]/50">There are no published requests yet — check back soon, or give a general donation above.</p>
        ) : (
          (() => {
            const visible = requests.filter((r) => {
              const q = searchFilter.trim().toLowerCase();
              const matchesCat = (categoryFilter === "all" || r.category === categoryFilter) && !CONNECT_CATS.includes(r.category);
              const matchesLoc = locationFilter === "all" || r.location === locationFilter;
              const matchesQ = !q || [r.title, r.description, r.location, r.category].filter(Boolean).join(" ").toLowerCase().includes(q);
              return matchesCat && matchesLoc && matchesQ;
            });
            return (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-body text-sm text-[#0D3B3B]/55">
                    Showing {visible.length} of {requests.length}
                  </p>
                  {(categoryFilter !== "all" || locationFilter !== "all" || searchFilter.trim()) && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#1BAA9C]"
                      onClick={() => {
                        setCategoryFilter("all");
                        setLocationFilter("all");
                        setSearchFilter("");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                {visible.length === 0 ? (
                  <p className="font-body text-sm text-[#0D3B3B]/50">No requests match those filters.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {visible.map((r) => <RequestCard key={r.id} req={r} onHelp={selectRequest} onView={(req) => { setPage(`request:${req.id}`); window.history.pushState({}, "", `/request/${req.id}`); window.scrollTo(0, 0); }} />)}
                  </div>
                )}
              </>
            );
          })()
        )}
      </section>

      <section id="bsn-work" className="mx-auto max-w-3xl px-5 sm:px-8 pb-20">
        <p className="font-body text-[11px] tracking-[0.22em] uppercase text-[#0D3B3B]/40 mb-2">BSN Foundation</p>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0D3B3B] mb-3">Support a BSN outreach this year.</h2>
        <p className="font-body text-sm text-[#0D3B3B]/55 mb-6">Pick someone Seek has published, or a BSN outreach. If you have goods or time, use Giveaways.</p>
        {storyCampaign ? (
          <OutreachStory campaign={storyCampaign} onBack={() => setStoryCampaign(null)} onDonate={() => setOutreach(storyCampaign)} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {OUTREACH_CAMPAIGNS.map((c) => (
              <button key={c.id} type="button" onClick={() => setStoryCampaign(c)} className="text-left rounded-3xl overflow-hidden bg-white border border-[#0D3B3B]/8 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
                {c.photos?.[0] && <img src={c.photos[0]} alt="" className="h-36 w-full object-cover" />}
                <div className="p-4">
                  <span className="block font-display font-bold text-lg text-[#0D3B3B]">{c.title}</span>
                  <span className="block text-sm text-[#0D3B3B]/60 mt-1">{c.blurb}</span>
                  {c.budget ? <p className="mt-2 text-xs font-semibold text-[#0D3B3B]/55">Annual budget ₦{Number(c.budget).toLocaleString()} </p> : null}
                  <span className="mt-3 inline-flex text-sm font-semibold text-[#1BAA9C]">See this work →</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {outreach && <OutreachCheckout campaign={outreach} onClose={() => setOutreach(null)} />}
      </section>
    </div>
  );
}


/* ---------------- Seek Help Page ---------------- */

function Field({ label, children }) {
  return (
    <label className="block text-left">
      <span className="block mb-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#0D3B3B]/50">{label}</span>
      {children}
    </label>
  );
}



function ChoiceChips({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const id = typeof opt === "string" ? opt : opt.id;
        const label = typeof opt === "string" ? opt : opt.label;
        const on = value === id || value === label;
        return (
          <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-full px-4 py-2 text-sm font-semibold border ${on ? "bg-[#0D3B3B] text-white border-[#0D3B3B]" : "bg-white text-[#0D3B3B] border-[#0D3B3B]/15"}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

const inputCls = "w-full rounded-2xl border border-[#0D3B3B]/12 bg-[#F4F1EA] p-4 font-body text-[#0D3B3B] placeholder:text-[#0D3B3B]/35 focus:outline-none focus:ring-2 focus:ring-[#1BAA9C]";

function SeekHelpPage({ setPage }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listPublishedRequests(60);
        if (cancelled) return;
        setRequests((rows || []).map((row) => row.title ? row : mapRequestRow(row)));
      } catch (err) {
        if (!cancelled) setError(err?.message || "Could not load open requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = [
    "All",
    ...Array.from(new Set(requests.map((r) => r.category).filter((v) => v && !CONNECT_CATS.includes(v))))
  ];
  const visible = requests.filter((req) => {
    if (CONNECT_CATS.includes(req.category)) return false;
    const categoryMatch = category === "All" || req.category === category;
    const q = search.trim().toLowerCase();
    const searchMatch = !q || [req.title, req.category, req.location, req.description, req.need].filter(Boolean).join(" ").toLowerCase().includes(q);
    return categoryMatch && searchMatch;
  });

  const go = (id) => { setPage(id); window.scrollTo(0, 0); };

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-12 sm:pt-16 pb-10">
        <div className="max-w-3xl">
          <SectionLabel>Seek Help</SectionLabel>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0D3B3B] leading-tight">
            Someone in the SEEK community may be able to help.
          </h1>
          <p className="mt-4 font-body text-lg leading-relaxed text-[#0D3B3B]/65 max-w-2xl">
            Browse requests that have been reviewed and published by SEEK. If you can help, open a request and choose how you would like to show up.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => go("seek-help-form")}>I need help</Button>
            <Button variant="secondary" onClick={() => go("give")}>I want to help</Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20">
        <div className="rounded-3xl bg-white border border-[#0D3B3B]/8 p-4 sm:p-5 mb-7">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0D3B3B]/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests" className="w-full rounded-2xl border border-[#0D3B3B]/10 bg-[#F2F5F3] py-3.5 pl-11 pr-4 text-sm text-[#0D3B3B] focus:outline-none focus:ring-2 focus:ring-[#1BAA9C]" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border ${category === item ? "bg-[#0D3B3B] text-white border-[#0D3B3B]" : "bg-white text-[#0D3B3B]/70 border-[#0D3B3B]/12 hover:border-[#1BAA9C]"}`}>{item}</button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <SectionLabel>Open requests</SectionLabel>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0D3B3B]">People asking for help</h2>
          </div>
          <span className="text-sm text-[#0D3B3B]/45">{loading ? "Loading…" : `${visible.length} ${visible.length === 1 ? "request" : "requests"}`}</span>
        </div>

        {loading && <div className="rounded-2xl bg-white border border-[#0D3B3B]/8 p-8 text-sm text-[#0D3B3B]/55">Loading open requests…</div>}
        {error && <div className="rounded-2xl bg-white border border-red-200 p-6 text-sm text-red-700">{error}</div>}
        {!loading && !error && visible.length > 0 && (
          <div className="grid md:grid-cols-2 gap-5">
            {visible.map((req) => (
              <RequestCard key={req.id} req={req} onView={() => go(`request:${req.id}`)} onHelp={() => go(`request:${req.id}`)} />
            ))}
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="rounded-3xl bg-white border border-[#0D3B3B]/8 p-10 text-center">
            <h3 className="font-display font-bold text-xl text-[#0D3B3B]">No open requests match that.</h3>
            <p className="mt-2 text-sm text-[#0D3B3B]/55">Try another category or search, or check back soon.</p>
            <button type="button" onClick={() => { setCategory("All"); setSearch(""); }} className="mt-5 text-sm font-semibold text-[#1BAA9C]">Clear filters</button>
          </div>
        )}

        <div className="mt-10 rounded-3xl bg-[#0D3B3B] p-7 sm:p-9 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="font-display font-bold text-2xl">Need help yourself?</p>
            <p className="mt-2 text-sm text-white/65 max-w-xl">Tell SEEK what you need. Requests are reviewed before they are published.</p>
          </div>
          <button type="button" onClick={() => go("seek-help-form")} className="shrink-0 rounded-full bg-[#1BAA9C] px-5 py-3 text-sm font-bold text-white hover:bg-[#159789]">Ask for help</button>
        </div>
      </section>
    </div>
  );
}

function SeekHelpRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [form, setForm] = useState({
  name: "",
  email: "",
  phone: "",
  location: "",
  category: "",
  need: "",
  amount: "",
  description: "",
  type: "",
  urgency: "",
  evidenceFiles: [],
  bankName: "",
  accountName: "",
  accountNumber: "",
});
const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  if (submitted) {
    return (
      <div style={{ background: C.bg }} className="min-h-[60vh] flex items-center">
        <div className="mx-auto max-w-lg px-5 text-center py-24">
          <CheckCircle2 size={40} className="mx-auto text-[#1BAA9C] mb-5" />
          <h1 className="font-display font-bold text-3xl text-[#0D3B3B] mb-3">Your request has been received.</h1>
          <p className="font-body text-[#0D3B3B]/65 mb-6">
            What happens next:
          </p>
          <ol className="text-left font-body text-sm text-[#0D3B3B]/70 space-y-2 max-w-sm mx-auto">
            <li>1. Seek reviews your request.</li>
            <li>2. If it is approved, it appears publicly.</li>
            <li>3. People can give or offer help.</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-2xl px-5 sm:px-8 pt-16 pb-6 text-center">
        <SectionLabel>Seek Help</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B]">Ask a neighbour for what you need.</h1>
        <p className="mt-3 font-body text-[#0D3B3B]/60">Say what you need in plain words. SEEK reviews it before neighbours see it.</p>
      </section>

      <section className="mx-auto max-w-2xl px-5 sm:px-8 pb-20">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            try {
              setUploadProgress("");
              if (!form.category) throw new Error("Choose what you need help with.");
              await submitRequest({
                ...form,
                email: (getUserSession()?.user?.email || form.email || "").trim(),
                onProgress: ({ index, total, name }) => {
                  setUploadProgress(`Uploading file ${index} of ${total}: ${name}`);
                },
              });
              setSubmitted(true);
            } catch (err) {
              setError(err?.message || "Could not submit your request.");
            } finally {
              setLoading(false);
            }
          }}
          className="rounded-3xl bg-white border border-[#0D3B3B]/8 p-6 sm:p-10 space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Full name (admin only)"><input required className={inputCls} value={form.name} onChange={set("name")} placeholder="Your name" /></Field>
            {getUserSession()?.user?.email ? (
              <Field label="Email">
                <input readOnly className={inputCls + " bg-[#F2F5F3]"} value={getUserSession().user.email} />
                <p className="mt-1 text-xs text-[#0D3B3B]/50">Uses the email on your SEEK account.</p>
              </Field>
            ) : (
              <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={set("email")} placeholder="you@example.com" /></Field>
            )}
          </div>
          <Field label="Phone number"><input required className={inputCls} value={form.phone} onChange={set("phone")} placeholder="For verification" /></Field>
          <Field label="Location"><input required className={inputCls} value={form.location} onChange={set("location")} placeholder="City, country" /></Field>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45 mb-3">What do you need help with?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.filter((c) => !CONNECT_CATS.includes(c.label)).map((c) => {
                const Icon = c.icon;
                const active = form.category === c.label;
                return (
                  <button type="button" key={c.id} onClick={() => setForm({ ...form, category: c.label })} className={`rounded-xl border p-3 text-left flex items-center gap-2.5 transition ${active ? "border-[#1BAA9C] bg-[#1BAA9C]/8 text-[#0D3B3B]" : "border-[#0D3B3B]/10 text-[#0D3B3B]/70 hover:border-[#0D3B3B]/25"}`}>
                    {Icon ? <Icon size={16} className="shrink-0" /> : null}
                    <span className="text-xs sm:text-sm font-semibold leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {CONNECT_CATS.includes(form.category) && (
            <p className="text-sm text-[#0D3B3B]/65 rounded-xl bg-[#1BAA9C]/10 p-3">
              This is for company, celebration or learning — not dating. Seek reviews every post before it is public. Do not share your home address here.
            </p>
          )}
          <Field label="What do you need?"><input required className={inputCls} value={form.need} onChange={set("need")} placeholder={CONNECT_CATS.includes(form.category) ? "e.g. Company at my graduation on Saturday" : "e.g. School fees for this term"} /></Field>
          <Field label="Describe it in your own words">
            <textarea className={inputCls} rows={4} value={form.description} onChange={set("description")} placeholder="What happened, who it is for, and what would help." />
          </Field>
          <div className="flex flex-wrap gap-3">
          <button type="button" className="text-sm font-semibold text-[#1BAA9C]" onClick={async () => {
            const hint = await seekAiAssist({ purpose: "classify", title: form.need, description: form.description || form.need });
            const local = suggestNeedStructure({ need: form.need, description: form.description, amount: form.amount });
            setForm((prev) => ({ ...prev, category: hint.category || local.category || prev.category }));
            setError((hint.missing || local.missing || []).length ? ("You can still submit. Consider adding: " + (hint.missing || local.missing).join(", ") + ".") : "Category updated. You can still edit it.");
          }}>Suggest a category from what I wrote</button>
          <button type="button" className="text-sm font-semibold text-[#1BAA9C]" onClick={async () => {
            if (!(form.need || form.description).trim()) {
              setError("Write what you need first, then tap Help me explain this.");
              return;
            }
            const draft = await seekAiAssist({ purpose: "classify", title: form.need, description: form.description || form.need });
            const local = explainSeekNeed([form.need, form.description].filter(Boolean).join(". "));
            setForm((prev) => ({
              ...prev,
              need: draft.title || local?.title || prev.need,
              description: draft.description || local?.description || prev.description,
            }));
            setError("Draft updated. Edit the description before you submit.");
          }}>Help me explain this</button>
          </div>
          <Field label="Amount needed (₦)">
            <input className={inputCls} value={form.amount} onChange={set("amount")} placeholder="e.g. 25000" inputMode="numeric" />
          </Field>
          <Field label="Your video story">
            <p className="font-body text-sm text-[#0D3B3B]/60 mb-2">Look into the camera and tell people why this help matters. A short video reaches hearts faster than a form. Add photos if you have them.</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#0D3B3B]/20 p-5 text-[#0D3B3B]/50 font-body text-sm">
              <Upload size={18} />
              <span>{form.evidenceFiles?.length ? form.evidenceFiles.map((f) => f.name).join(", ") : "Add a video (MP4, MOV, WEBM) or photos"}</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,.pdf" className="hidden" onChange={(e) => setForm((prev) => ({ ...prev, evidenceFiles: Array.from(e.target.files || []).slice(0, 5) }))} />
            </label>
          </Field>
          <p className="text-xs font-body text-[#0D3B3B]/45 leading-relaxed">
            Your privacy matters. Please only share sensitive information — like full addresses or medical details — where it's genuinely necessary. Seek and BSN Foundation never display this publicly.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {uploadProgress && <p className="text-sm text-[#1BAA9C]">{uploadProgress}</p>}
          <Button disabled={loading} type="submit" variant="primary" className="w-full">{loading ? (uploadProgress || "Submitting…") : "Submit request"}</Button>
        </form>
      </section>
    </div>
  );
}

/* ---------------- Volunteer Page ---------------- */


function CelebratePage({ setPage }) {
  const [list, setList] = useState([]);
  useEffect(() => {
    let cancelled = false;
    listPublishedRequests(48)
      .then((rows) => {
        const items = (rows || []).map(mapRequestRow).filter((r) => CONNECT_CATS.includes(r.category));
        if (!cancelled) setList(items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const go = (id) => { setPage && setPage(id); window.scrollTo(0, 0); };

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-4xl px-5 sm:px-8 pt-14 sm:pt-20 pb-10 text-center">
        <SectionLabel>Connect & Celebrate</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0D3B3B]">Celebrate with a neighbour.</h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg leading-relaxed text-[#0D3B3B]/65">
          Birthdays, graduations, a new city. Ask a neighbour to be there. SEEK reads every post. This is not dating, and it is not a fundraiser.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-12">
        <div className="grid gap-4 sm:grid-cols-3">
          <button type="button" onClick={() => go("celebrate-request")} className="rounded-3xl bg-[#0D3B3B] p-6 text-left text-white hover:shadow-lg transition">
            <HeartHandshake size={22} className="text-[#63C167]" />
            <h2 className="mt-4 font-display font-bold text-xl">I want to connect</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Share a genuine invitation for company around a meaningful moment.</p>
          </button>
          <button type="button" onClick={() => document.getElementById("celebrate-invitations")?.scrollIntoView({ behavior: "smooth" })} className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-6 text-left hover:shadow-lg transition">
            <Users size={22} className="text-[#1BAA9C]" />
            <h2 className="mt-4 font-display font-bold text-xl text-[#0D3B3B]">I want to join</h2>
            <p className="mt-2 text-sm leading-6 text-[#0D3B3B]/60">See published invitations and find a safe community moment to join.</p>
          </button>
          <button type="button" onClick={() => go("impact")} className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-6 text-left hover:shadow-lg transition">
            <Sparkles size={22} className="text-[#1BAA9C]" />
            <h2 className="mt-4 font-display font-bold text-xl text-[#0D3B3B]">Celebrate what happened</h2>
            <p className="mt-2 text-sm leading-6 text-[#0D3B3B]/60">Explore real community stories and outcomes shared through SEEK.</p>
          </button>
        </div>
      </section>

      <section id="celebrate-invitations" className="py-14 pb-32">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <SectionLabel>Community moments</SectionLabel>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0D3B3B]">Open invitations</h2>
            </div>
            <button type="button" onClick={() => go("celebrate-request")} className="text-sm font-bold text-[#1BAA9C]">Create an invitation →</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {list.slice(0, 6).map((req) => (
              <RequestCard key={req.id} req={req} onView={() => go("request:" + req.id)} onHelp={() => go("request:" + req.id)} />
            ))}
          </div>
          {!list.length && <div className="rounded-3xl border border-white/10 bg-[#152220] p-8 text-center"><p className="font-display font-bold text-white">No published invitations yet.</p><p className="mt-2 text-sm text-white/65">Be the first to share a genuine community moment.</p></div>}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 sm:px-8 py-14 text-center">
        <div className="rounded-3xl bg-[#0D3B3B] p-8 sm:p-10 text-white">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#63C167]">A simple boundary</p>
          <h2 className="mt-3 font-display font-bold text-2xl">Connect with care.</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">SEEK is not a dating app. Do not share your home address. Meet in public places and use your judgment when connecting with someone new.</p>
        </div>
      </section>
    </div>
  );
}

function CelebrateRequestPage({ setPage }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", location: "", category: "Celebrate & Connect", need: "", evidenceFiles: [] });
  useEffect(() => {
    listPublishedRequests(48).then((rows) => setList((rows || []).map(mapRequestRow).filter((r) => CONNECT_CATS.includes(r.category)))).catch(() => []);
  }, []);
  if (submitted) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h1 className="font-display font-bold text-3xl text-[#0D3B3B]">Seek will review this.</h1>
          <p className="mt-3 font-body text-[#0D3B3B]/65">If it is a genuine ask for company, it will appear here. This is not a fundraiser.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-8 text-center">
        <SectionLabel>Celebrate & Connect</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B]">Ask a neighbour to be there.</h1>
        <p className="mt-3 font-body text-[#0D3B3B]/65">Tell neighbours what you are marking and who you hope will come. SEEK reads it before it is public.</p>
      </section>
      <section className="mx-auto max-w-2xl px-5 pb-10">
        <form className="rounded-3xl bg-white border border-[#0D3B3B]/8 p-6 space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setError(""); setLoading(true);
          try {
            await submitRequest({ ...form, email: (getUserSession()?.user?.email || form.email || "").trim(), amount: "", description: form.need, evidenceFiles: form.evidenceFiles });
            setSubmitted(true);
          } catch (err) { setError(err.message); } finally { setLoading(false); }
        }}>
          <Field label="Your name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          {getUserSession()?.user?.email ? (
            <Field label="Email">
              <input readOnly className={inputCls + " bg-[#F2F5F3]"} value={getUserSession().user.email} />
              <p className="mt-1 text-xs text-[#0D3B3B]/50">Uses the email on your SEEK account.</p>
            </Field>
          ) : (
            <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          )}
          <Field label="Phone"><input required className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="City"><input required className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="What kind of company">
            <select required className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CONNECT_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="What are you inviting people to">
            <textarea required rows={3} className={inputCls} value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} placeholder="e.g. Graduation on Saturday in Enugu. I would like two people there." />
          </Field>
          <Field label="Photo or video of the invitation">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#0D3B3B]/20 p-4 text-sm text-[#0D3B3B]/50">
              <Upload size={16} />
              <span>{form.evidenceFiles?.length ? form.evidenceFiles.map((f) => f.name).join(", ") : "Add a photo or short video"}</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => setForm((prev) => ({ ...prev, evidenceFiles: Array.from(e.target.files || []).slice(0, 5) }))} />
            </label>
          </Field>
          <p className="text-xs text-[#0D3B3B]/50">Do not post your home address. Meet in a public place. Seek is not a dating app.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={loading} type="submit" variant="primary" className="w-full">{loading ? "Submitting…" : "Share this invitation"}</Button>
        </form>
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="font-display font-bold text-xl text-[#0D3B3B] mb-4">Open invitations</h2>
        <div className="grid gap-4">
          {list.map((req) => (
            <RequestCard key={req.id} req={req} onView={() => setPage && setPage("request:" + req.id)} onHelp={() => setPage && setPage("request:" + req.id)} />
          ))}
          {!list.length && <p className="text-sm text-[#0D3B3B]/50">No published invitations yet.</p>}
        </div>
      </section>
    </div>
  );
}

function VolunteerPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({name:"",email:"",phone:"",location:"",interests:"",role:""});
  const roles = [
    { id: "verify", title: "Verify requests", desc: "Help confirm that a published need is real and safely described." },
    { id: "followup", title: "Follow up after a match", desc: "Check that help reached the person and that Seek can mark it fulfilled." },
    { id: "outreach", title: "Community outreach", desc: "Point people in your city to Seek when they need help or can give it." },
  ];

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-10 text-center">
        <SectionLabel>Volunteer</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0D3B3B]">Give your time. Make a difference.</h1>
        <p className="mt-4 font-body text-lg text-[#0D3B3B]/65">Tell us how you would like to help, and we will keep you in mind for opportunities.</p>
      </section>

      <section className="mx-auto max-w-4xl px-5 sm:px-8 pb-14">
        <div className="grid sm:grid-cols-3 gap-4">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, role: r.title, interests: prev.interests || r.desc }))}
              className={`rounded-2xl bg-white border p-5 text-left ${form.role === r.title ? "border-[#1BAA9C]" : "border-[#0D3B3B]/6"}`}
            >
              <Users size={16} className="text-[#1BAA9C] mb-3" />
              <p className="font-display font-bold text-[#0D3B3B]">{r.title}</p>
              <p className="mt-2 font-body text-sm text-[#0D3B3B]/65">{r.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-xl px-5 sm:px-8">
          {!submitted ? (
            <form
              onSubmit={async (e) => { e.preventDefault(); setError(""); setLoading(true); try { await submitVolunteer({
                  ...form,
                  interests: [form.role, form.interests].filter(Boolean).join(" — "),
                }); setSubmitted(true); } catch (err) { setError(err.message); } finally { setLoading(false); } }}
              className="rounded-3xl p-8 sm:p-10 space-y-5 bg-white"
              style={{ background: C.white }}
            >
              <h2 className="font-display font-bold text-2xl text-[#0D3B3B] mb-1">Volunteer application</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full name"><input required className={inputCls} placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
                <Field label="Email"><input required type="email" className={inputCls} placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
              </div>
              <Field label="Phone number"><input required type="tel" className={inputCls} placeholder="For verification" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
              <Field label="Location"><input required className={inputCls} placeholder="City, country" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} /></Field>
              <Field label="Chosen role">
                <input className={inputCls} value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="Tap a role above" />
              </Field>
              <Field label="Anything else we should know?">
                <textarea required rows={3} className={inputCls} placeholder="Availability, language, city..." value={form.interests} onChange={e=>setForm({...form,interests:e.target.value})} />
              </Field>
              <p className="text-xs text-[#0D3B3B]/45">Your email and phone stay with Seek admins. They are not published.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button disabled={loading} type="submit" variant="primary" className="w-full">{loading ? "Submitting…" : "Become a volunteer"}</Button>
            </form>
          ) : (
            <div className="rounded-3xl p-10 text-center" style={{ background: C.bg }}>
              <CheckCircle2 size={36} className="mx-auto text-[#1BAA9C] mb-4" />
              <h2 className="font-display font-bold text-2xl text-[#0D3B3B] mb-2">Thanks for stepping up.</h2>
              <p className="font-body text-sm text-[#0D3B3B]/60">The BSN Foundation team will be in touch about next steps.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- About Page ---------------- */


function OrganisationsPage({ setPage }) {
  const go = (id) => { setPage(id); window.scrollTo(0, 0); };
  const items = [
    { t: "Sponsor a published request", d: "Choose a live Seek request and give toward it.", id: "give" },
    { t: "Fund a BSN outreach", d: "Pad a Girl Child, school, hospital or food drive.", id: "give" },
    { t: "Offer jobs or internships", d: "Post a role on Giveaways so people can apply.", id: "offers" },
    { t: "Provide goods or services", d: "Stock, transport, training or professional time.", id: "offers" },
    { t: "Volunteer as a team", d: "Put your staff on the volunteer list.", id: "volunteer" },
  ];
  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-16">
        <SectionLabel>For organisations</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B]">Your organisation can be the help too.</h1>
        <p className="mt-4 font-body text-[#0D3B3B]/65">Support a published request, fund a BSN outreach, or post a job, internship or gift. Same SEEK pages as everyone else. SEEK reads every public post before it goes live.</p>
        <div className="mt-8 grid sm:grid-cols-2 gap-3 pb-16">
          {items.map((item) => (
            <button key={item.t} type="button" onClick={() => go(item.id)} className="seek-reveal rounded-3xl bg-white border border-[#0D3B3B]/8 p-5 text-left hover:-translate-y-0.5 hover:shadow-md transition">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">{item.id === "volunteer" ? "Time" : item.id === "offers" ? "Giveaways" : "Give"}</p>
              <p className="mt-2 font-display font-bold text-lg text-[#0D3B3B]">{item.t}</p>
              <p className="mt-1 text-sm text-[#0D3B3B]/60">{item.d}</p>
              <p className="mt-3 text-sm font-semibold text-[#1BAA9C]">Continue →</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}


function MemberPage({ memberId, setPage }) {
  const [member, setMember] = useState(null);
  useEffect(() => {
    getPublicMember(memberId).then(setMember).catch(() => setMember({ name: "Seeker" }));
  }, [memberId]);
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      {member?.avatar_url ? <img src={member.avatar_url} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" /> : <div className="mx-auto h-20 w-20 rounded-full bg-[#0D3B3B]/10" />}
      <h1 className="mt-4 font-display font-extrabold text-2xl text-[#0D3B3B]">{member?.name || "A neighbour"} <VerifiedBadge /></h1>
      {member?.username ? <p className="mt-1 font-semibold text-[#1BAA9C]">@{member.username}</p> : null}
      {member?.bio ? <p className="mt-3 text-sm text-[#0D3B3B]/70">{member.bio}</p> : null}
      <p className="mt-2 text-sm text-[#0D3B3B]/60">Public profile shows a name, photo and username. Email and gifts stay private.</p>
      <button type="button" className="mt-6 rounded-full border px-4 py-2 text-sm" onClick={() => setPage("home")}>Back</button>
    </div>
  );
}

function AboutPage({ setPage }) {
  const go = (id) => { setPage(id); window.scrollTo(0, 0); };
  return (
    <div>
      <section className="py-20 text-center" style={{ background: C.bg }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionLabel>About Seek</SectionLabel>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[#0D3B3B]">Help should be easier to find.</h1>
          <p className="mt-5 font-body text-lg text-[#0D3B3B]/65">
            Seek is a community assistance platform created to connect people who need help with people willing to provide it.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-[#1BAA9C] mb-3">Our mission</p>
          <p className="font-display font-semibold text-2xl sm:text-3xl text-[#0D3B3B] leading-snug">
            To make it easier for people to find help, and easier for people to give it.
          </p>
          <p className="mt-6 font-body text-[#0D3B3B]/60 max-w-xl mx-auto">
            We all need help sometimes — and we can all help someone. Seek is built on that simple, shared idea, not on pity or charity theatre.
          </p>
        </div>
      </section>

      <section className="py-16" style={{ background: C.bg }}>
        <div className="mx-auto max-w-5xl px-5 sm:px-8 rounded-3xl bg-white border border-[#0D3B3B]/8 p-10 sm:p-14 grid md:grid-cols-[auto_1fr_auto] items-center gap-8">
          <Building2 size={44} className="text-[#1BAA9C]" />
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-widest text-[#1BAA9C] mb-2">Powered by BSN Foundation</p>
            <p className="font-display font-semibold text-xl text-[#0D3B3B]">
              BSN Foundation is the community and volunteering arm behind Seek — reviewing requests, coordinating volunteers, and building trust across the platform.
            </p>
          </div>
          <Button variant="secondary" onClick={() => go("volunteer")}>Get involved <ArrowUpRight size={16} /></Button>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Public Request Page ---------------- */


function CelebrateRsvp({ request, setPage, helpLabel }) {
  const actionLabel = helpLabel || (CONNECT_CATS.includes(request.category) ? "I can be there" : "I can help");

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(() => {
    try { return Boolean(localStorage.getItem("seek_rsvp_" + request.id)); } catch (_e) { return false; }
  });
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const session = getUserSession();
  const [form, setForm] = useState({ name: "", email: session?.user?.email || "", phone: "", age: "", message: "", photo: null });
  useEffect(() => {
    getCelebrateRsvpCount(request.id).then(setCount).catch(() => {});
  }, [request.id]);
  if (done) return <p className="font-semibold text-[#1BAA9C]">You have indicated. {count ? count + " people have indicated." : ""}</p>;
  return (
    <div className="w-full">
      <Button variant="primary" className="w-full sm:w-auto" onClick={() => {
        if (!session?.access_token) {
          try { sessionStorage.setItem("seek_return", "request:" + request.id); } catch (_e) {}
          if (setPage) setPage("account");
          return;
        }
        setOpen(!open);
      }}>
        {count ? count + " people · " + actionLabel : actionLabel}
      </Button>
      {open && (
        <form className="mt-4 space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setLoading(true); setError("");
          try {
            if (!form.photo) throw new Error("Add a recent photo of yourself.");
            const uploaded = await uploadProfilePhoto(form.photo);
            await submitCelebrateRsvp({ requestId: request.id, ...form, email: session?.user?.email || form.email, photo: uploaded.storage_path || uploaded.path || uploaded.public_url || "" });
            try { localStorage.setItem("seek_rsvp_" + request.id, "1"); } catch (_e) {}
            setDone(true); setCount((n) => n + 1);
          } catch (err) { setError(err.message || "Could not send this."); }
          finally { setLoading(false); }
        }}>
          <p className="text-sm text-[#0D3B3B]/60">{CONNECT_CATS.includes(request.category) ? "Tell the host you can be there." : "Tell this Seeker how you can help — a role, an introduction, or your time."}</p>
          <input required className={inputCls} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {session?.user?.email ? (
            <input readOnly className={inputCls + " bg-[#F2F5F3]"} value={session.user.email} />
          ) : (
            <input required type="email" className={inputCls} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          )}
          <input required className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {CONNECT_CATS.includes(request.category) && (
            <input required inputMode="numeric" className={inputCls} placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          )}
          <textarea required rows={2} className={inputCls} placeholder={CONNECT_CATS.includes(request.category) ? "When you can be there" : "How you can help"} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <label className="block text-sm text-[#0D3B3B]/60">Recent photo of you
            <input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] || null })} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={loading} type="submit" variant="primary">{loading ? "Sending…" : CONNECT_CATS.includes(request.category) ? "Send to host" : "Send to the Seeker"}</Button>
        </form>
      )}
    </div>
  );
}

function RequestPage({ requestId, setPage }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
    const [evidence, setEvidence] = useState([]);
    const [helped, setHelped] = useState(false);
    const [donors, setDonors] = useState([]);
    const [showAllDonors, setShowAllDonors] = useState(false);
    const [caseDonateOpen, setCaseDonateOpen] = useState(false);
    const [hostRsvps, setHostRsvps] = useState([]);
  const [viewCount, setViewCount] = useState(0);
  useEffect(() => {
    if (request?.title) document.title = request.title + " · Seek";
    return () => { document.title = "Seek"; };
  }, [request?.title]);

  useEffect(() => {
    let cancelled = false;
    let donorTick;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let matched = await getPublicRequestById(requestId);
        if (!matched) {
          const stories = await listAppreciationStories().catch(() => []);
          const story = (stories || []).find((item) => item.request_id === requestId || item.id === "thanks-" + requestId);
          if (story) {
            matched = {
              id: requestId,
              title: story.title,
              location: story.location,
              publicUpdate: story.story,
              appreciationUrl: story.public_url,
              appreciationKind: story.media_kind,
              status: "fulfilled",
            };
          }
        }
        if (!cancelled) {
  if (!matched) {
    setError("This request could not be found or is no longer published.");
    setRequest(null);
  } else {
    setRequest(matched);
    recordSeekView("request", matched.id).then((count) => { if (!cancelled) setViewCount(Number(count || 0)); });

    listMatchedOfferRequestIds()
      .then((ids) => { if (!cancelled) setHelped((ids || []).includes(matched.id)); })
      .catch(() => {});
    getRequestAppreciation(matched.id)
      .then((media) => {
        const items = Array.isArray(media) ? media : (media ? [media] : []);
        if (!cancelled && items.length) {
          setRequest((prev) => prev ? {
            ...prev,
            appreciationItems: items,
            appreciationUrl: items[items.length - 1].public_url,
            appreciationKind: items[items.length - 1].media_kind,
          } : prev);
        }
      })
      .catch(() => {});
    const loadDonors = () => listRequestDonors(matched.id)
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setDonors(list);
        const raised = list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        setRequest((prev) => prev ? { ...prev, amountRaised: raised || prev.amountRaised } : prev);
      })
      .catch(() => {});
    loadDonors();
    donorTick = setInterval(loadDonors, 8000);
    listCelebrateRsvps(matched.id).then((rows) => { if (!cancelled) setHostRsvps(rows || []); }).catch(() => {});
    getRequestEvidence(matched.id)
      .then((files) => {
        if (!cancelled) {
          setEvidence(files);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvidence([]);
        }
      });
  }
}
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load this request.");
          setRequest(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (donorTick) clearInterval(donorTick);
    };
  }, [requestId]);

  if (loading) {
    return (
      <div style={{ background: C.bg }} className="min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-sm text-[#0D3B3B]/50">Loading request…</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{ background: C.bg }} className="min-h-[60vh] flex items-center">
        <div className="mx-auto max-w-lg px-5 text-center py-24">
          <AlertTriangle size={40} className="mx-auto text-[#1BAA9C] mb-5" />
          <h1 className="font-display font-bold text-2xl text-[#0D3B3B] mb-3">
            Request not found
          </h1>
          <p className="font-body text-[#0D3B3B]/65 mb-8">
            {error || "This request may have been fulfilled or is no longer public."}
          </p>
          <Button variant="primary" onClick={() => setPage("give")}>
            Browse open requests <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-10">
        <SectionLabel>Public request</SectionLabel>
        <p className="font-body text-sm text-[#0D3B3B]/55 mb-4">
          Seek reviewed this request. The check mark identifies a Seeker account; request review is shown separately below. Names, phones and emails stay private.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold font-body uppercase tracking-wide text-[#1BAA9C]">
            {request.category}
          </span>
          <UrgencyBadge level={request.urgency} />
          <VerificationBadge status={request.status} />
          <span className="text-xs font-semibold text-[#0D3B3B]/50">{formatSeekStatus(request.status)}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0D3B3B]">
            {request.title}
          </h1>
          <button
            type="button"
            className="rounded-full border border-[#0D3B3B]/15 px-3 py-1.5 text-sm font-semibold text-[#0D3B3B]"
            onClick={async () => {
              const url = `${window.location.origin}/request/${request.id}`;
              const amount = request.amountNeeded ? " Target: NGN " + Number(request.amountNeeded).toLocaleString() + "." : "";
              const headline = request.publicUpdate
                ? String(request.publicUpdate).slice(0, 80)
                : request.title;
              const text = headline + " — " + (request.location || "") + amount;
              try {
                if (navigator.share) {
                  await navigator.share({ title: headline, text, url });
                } else if (navigator.clipboard) {
                  await navigator.clipboard.writeText(text + " " + url);
                  window.alert("Share text copied");
                }
              } catch (_e) {}
            }}
          >
            Share
          </button>
          <a
            className="rounded-full border border-[#0D3B3B]/15 px-3 py-1.5 text-sm font-semibold text-[#0D3B3B]"
            href={`https://wa.me/?text=${encodeURIComponent(
              (request.publicUpdate ? String(request.publicUpdate).slice(0, 80) : request.title) +
              " — " + (request.location || "") +
              (request.amountNeeded ? " Target: NGN " + Number(request.amountNeeded).toLocaleString() + "." : "") +
              " " + window.location.origin + "/request/" + request.id
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 align-[-2px]"><path d="M20 3.5A10 10 0 0 0 3.2 17.6L2 22l4.5-1.2A10 10 0 1 0 20 3.5zm-8 16.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.6.7.7-2.5-.2-.3A8.2 8.2 0 1 1 12 19.7zm4.7-6.1c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.6l.4-.5.1-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.6 11.5 11.5 0 0 1 4.4 3.9 15 15 0 0 0 1.5.5 3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3z"/></svg>
            WhatsApp
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#0D3B3B]/60 font-body mb-6">
          <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {request.location}</span>
          <span className="inline-flex items-center gap-1.5"><Eye size={15} /> {viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}</span>
        </div>

        <div className="rounded-3xl bg-white border border-[#0D3B3B]/8 p-6 sm:p-8 shadow-sm">
          <p className="font-body text-[#0D3B3B]/80 leading-relaxed whitespace-pre-wrap">
            {request.description}
          </p>
          {(request.publicUpdate || request.appreciationUrl) && (
            <div className="mt-6 rounded-2xl bg-[#1BAA9C]/8 p-4 space-y-3">
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#1BAA9C]">Update from the requester</p>
              {request.publicUpdate && (
                <p className="font-body text-[#0D3B3B]/80 whitespace-pre-wrap">{request.publicUpdate}</p>
              )}
              {(request.appreciationItems || [{ public_url: request.appreciationUrl, media_kind: request.appreciationKind }].filter((item) => item.public_url)).map((item) => (
                item.media_kind === "video" || String(item.public_url).match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <div className="relative overflow-hidden rounded-xl bg-black">
                    <video key={item.public_url} src={item.public_url} controls playsInline className="w-full max-h-80 bg-black" controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} />
                    <SeekVideoWatermark />
                  </div>
                ) : (
                  <img loading="lazy" decoding="async" key={item.public_url} src={item.public_url} alt="" className="w-full max-h-80 rounded-xl object-contain" />
                )
              ))}
            </div>
          )}
          {evidence.length > 0 && (
  <div className="mt-6 space-y-4">
    <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/50">Photos and video</p>

    {evidence.map((file) => (
      <div key={file.id} className="space-y-2">
        {file.mime_type?.startsWith("image/") ? (
          <img
            src={file.public_url}
            alt=""
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            className="w-full max-h-96 rounded-xl border border-[#0D3B3B]/8 object-contain select-none"
          />
        ) : file.mime_type?.startsWith("video/") ? (
          <div className="relative overflow-hidden rounded-xl border border-[#0D3B3B]/8 bg-black">
          <video
            src={file.public_url}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            playsInline
            preload="none"
            onContextMenu={(e) => e.preventDefault()}
            className="w-full max-h-96"
          />
          <SeekVideoWatermark />
          </div>
        ) : file.mime_type === "application/pdf" ? (
          <iframe
            src={`${file.public_url}#toolbar=0&navpanes=0`}
            title="Supporting evidence"
            className="h-96 w-full rounded-xl border border-[#0D3B3B]/8"
          />
        ) : (
          <p className="font-body text-sm text-[#0D3B3B]/60">
            A supporting file was provided for on-page review.
          </p>
        )}
      </div>
    ))}
  </div>
)}

          <div className="mt-8">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/50 mb-3 inline-flex items-center gap-2">
              <span style={{width:10,height:10,borderRadius:999,background:"#E11D48",display:"inline-block",animation:"seekLivePulse 1.1s ease-in-out infinite"}} />
              Live support
            </p>
            {donors.length === 0 ? (
              <p className="text-sm text-[#0D3B3B]/50">No public gifts listed yet.</p>
            ) : (
              <>
              <ul className="space-y-2">
                {(showAllDonors ? donors : donors.slice(0, 3)).map((d, i) => (
                  <li key={(d.created_at || "") + "-" + i} className={"flex items-center justify-between text-sm font-body rounded-lg px-2 py-1 " + (i === 0 && !showAllDonors ? "bg-[#1BAA9C]/10" : "")}>
                    <span className="text-[#0D3B3B]/70 inline-flex items-center gap-1.5">{d.anonymous ? "Anonymous" : String(d.name || d.donor_name || "").split("·")[0].trim() || "Neighbour"} {!d.anonymous && <SeekVerifiedCheck className="h-4 w-4" />}</span>
                    <span className="font-semibold text-[#0D3B3B]">₦{Number(d.amount || 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              {donors.length > 3 && (
                <button type="button" className="mt-3 text-sm font-semibold text-[#1BAA9C]" onClick={() => setShowAllDonors(!showAllDonors)}>
                  {showAllDonors ? "Show latest only" : "See more"}
                </button>
              )}
              </>
            )}
          </div>
          {request.amountNeeded ? (
            <div className="mt-8">
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/50 mb-2">
                Progress
              </p>
              <ProgressBar raised={donors.length ? donors.reduce((sum, d) => sum + Number(d.amount || 0), 0) : request.amountRaised} needed={request.amountNeeded} />
            </div>
          ) : (
            <p className="mt-6 text-sm font-semibold font-body text-[#0D3B3B]">
              {request.type === "item"
                ? "In-kind assistance requested"
                : "Ongoing support requested"}
            </p>
          )}

          {hostRsvps.length > 0 && (
            <div className="mt-8 rounded-2xl border border-[#0D3B3B]/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/50 mb-3">People who can be there</p>
              <ul className="space-y-3">
                {hostRsvps.map((row) => (
                  <li key={row.id} className="flex gap-3 items-start">
                    {row.photo_url ? <img src={row.photo_url} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="h-20 w-20 rounded-xl bg-[#0D3B3B]/10" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#0D3B3B]">{row.name || row.email}{row.age ? " · " + row.age : ""}</p>
                      <p className="text-sm text-[#0D3B3B]/60">{row.email} {row.phone ? " · " + row.phone : ""}</p>
                      {row.message && <p className="text-sm text-[#0D3B3B]/70 mt-1">{row.message}</p>}
                      <p className="text-xs uppercase tracking-wide text-[#0D3B3B]/45 mt-1">{row.status || "pending"}</p>
                      {(!row.status || row.status === "pending") && (
                        <div className="mt-2 flex gap-2">
                          <button type="button" className="rounded-full bg-[#0D3B3B] text-white px-3 py-1 text-xs" onClick={async () => {
                            try {
                              await updateCelebrateRsvpStatus(row.id, "approved");
                              setHostRsvps((prev) => prev.map((x) => x.id === row.id ? { ...x, status: "approved" } : x));
                            } catch (err) { window.alert(err.message); }
                          }}>Approve</button>
                          <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={async () => {
                            try {
                              await updateCelebrateRsvpStatus(row.id, "declined");
                              setHostRsvps((prev) => prev.map((x) => x.id === row.id ? { ...x, status: "declined" } : x));
                            } catch (err) { window.alert(err.message); }
                          }}>Decline</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold" onClick={async () => {
                try {
                  await closeCelebrateInvite(request.id);
                  setRequest((prev) => prev ? { ...prev, status: "fulfilled" } : prev);
                } catch (err) { window.alert(err.message); }
              }}>Close invitation</button>
            </div>
          )}
          {request.status === "fulfilled" && getUserSession()?.access_token && (
            <RequesterUpdateForm requestId={request.id} existing={request.publicUpdate} existingMedia={request.appreciationUrl} onSaved={(text) => setRequest((prev) => prev ? { ...prev, publicUpdate: text } : prev)} />
          )}
          <ReportRequestForm requestId={request.id} />
          <CommunityInteractions targetType="request" targetId={request.id} />

          <div className="mt-8 pt-6 border-t border-[#0D3B3B]/08 flex flex-col sm:flex-row sm:items-center gap-4">
            {request.status === "fulfilled" ? (
              <p className="font-body text-sm font-semibold text-[#1BAA9C]">
                This need has been met. Thank you to everyone who helped.
              </p>
            ) : helped ? (
              <>
                <p className="font-body text-sm font-semibold text-[#1BAA9C]">
                  Help is in progress for this request.
                </p>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    sessionStorage.setItem("seek_help_request_id", request.id);
                    window.history.pushState({}, "", "/give");
                    setPage("give");
                  }}
                >
                  Give anyway
                </Button>
              </>
            ) : (
              <>
                {caseDonateOpen && <CaseDonateSheet request={request} onClose={() => setCaseDonateOpen(false)} />}
                {CONNECT_CATS.includes(request.category) || /job|employ|mentor|counsel/i.test(String(request.category || "")) ? (
                  <CelebrateRsvp request={request} setPage={setPage} helpLabel={/job|employ|mentor|counsel/i.test(String(request.category || "")) ? "I can help" : "I can be there"} />
                ) : isFinancialNeed(request) ? (
                  <Button
                    variant="primary"
                    className="w-full sm:w-auto"
                    onClick={() => setCaseDonateOpen(true)}
                  >
                    Support this case <HandHeart size={16} />
                  </Button>
                ) : (
                  <p className="text-sm text-[#0D3B3B]/60">This is not a fundraising request.</p>
                )}
                {isFinancialNeed(request) ? (
                  <p className="text-sm text-[#0D3B3B]/55">
                    Can't donate right now? You can still support the SEEK community.{" "}
                    <button type="button" className="font-bold text-[#1BAA9C]" onClick={() => { setPage("shop"); window.scrollTo(0, 0); }}>Shop SEEK merch</button>
                  </p>
                ) : null}
                <p className="font-body text-xs text-[#0D3B3B]/45">
                  {CONNECT_CATS.includes(request.category)
                    ? "Your contact goes to the host after Seek records it. Meet in public."
                    : isFinancialNeed(request)
                      ? "Opens Paystack for this case."
                      : "Use View more to see how you can help."}
                </p>
              </>
            )}
          </div>
        </div>

        <p className="mt-8 text-center font-body text-xs text-[#0D3B3B]/40">
          This is a verified public request on Seek · A project of BSN Foundation
        </p>
      </section>
    </div>
  );
}



function ReportRequestForm({ requestId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(false);

  if (sent) {
    return (
      <p className="mt-6 font-body text-sm text-[#1BAA9C]">
        Thank you. Seek will review this report.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-[#0D3B3B]/45 hover:text-[#0D3B3B]"
        >
          Report this request
        </button>
      ) : (
        <form
          className="rounded-2xl border border-[#0D3B3B]/10 p-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setLoading(true);
              setError("");
              await submitSafetyReport({
                targetType: "request",
                targetId: requestId,
                reason,
                details,
                email,
              });
              setSent(true);
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <p className="font-display font-semibold text-sm text-[#0D3B3B]">Report this request</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          >
            <option value="inappropriate">Inappropriate or harmful content</option>
            <option value="spam">Spam or scam</option>
            <option value="privacy">Private information exposed</option>
            <option value="other">Something else</option>
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional details"
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (optional)"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#0D3B3B] text-white px-4 py-2 text-sm font-semibold"
          >
            {loading ? "Sending…" : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}


function ReportContentForm({ targetType, targetId, label = "Report this content" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (sent) {
    return <p className="mt-3 text-xs font-semibold text-[#1BAA9C]">Thanks. SEEK will review this report.</p>;
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-[#0D3B3B]/45 hover:text-[#0D3B3B]"
        >
          Report
        </button>
      ) : (
        <form
          className="rounded-2xl border border-[#0D3B3B]/10 bg-[#F7FAF8] p-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError("");
            try {
              await submitSafetyReport({ targetType, targetId, reason, details, email });
              setSent(true);
            } catch (err) {
              setError(err?.message || "Could not submit the report.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <p className="font-display font-semibold text-sm text-[#0D3B3B]">{label}</p>
            <p className="mt-1 text-xs leading-5 text-[#0D3B3B]/55">Report scams, harmful content, exposed private information or other safety concerns. Please do not include passwords, PINs or OTPs.</p>
          </div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-[#0D3B3B]/10 bg-white px-3 py-2 text-sm"
          >
            <option value="inappropriate">Inappropriate or harmful content</option>
            <option value="spam">Spam or scam</option>
            <option value="privacy">Private information exposed</option>
            <option value="harassment">Harassment or unsafe behaviour</option>
            <option value="other">Something else</option>
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What should SEEK know? (optional)"
            rows={3}
            className="w-full rounded-xl border border-[#0D3B3B]/10 bg-white px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (optional)"
            className="w-full rounded-xl border border-[#0D3B3B]/10 bg-white px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={loading} className="rounded-full bg-[#0D3B3B] px-4 py-2 text-sm font-semibold text-white">
              {loading ? "Sending…" : "Submit report"}
            </button>
            <button type="button" disabled={loading} onClick={() => { setOpen(false); setError(""); }} className="rounded-full border border-[#0D3B3B]/15 px-4 py-2 text-sm font-semibold text-[#0D3B3B]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SupportChat() {
  const [conversationId, setConversationId] = useState(() => localStorage.getItem("seek_support_chat_id") || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    listSupportMessages(conversationId)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    const timer = setInterval(() => {
      listSupportMessages(conversationId)
        .then((rows) => { if (!cancelled) setMessages(rows); })
        .catch(() => {});
    }, 4000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [conversationId]);

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const created = await startSupportConversation(email);
    const id = created?.id;
    if (!id) throw new Error("Could not start chat.");
    localStorage.setItem("seek_support_chat_id", id);
    setConversationId(id);
    return id;
  }

  async function send(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const id = await ensureConversation();
      await sendSupportMessage(id, "visitor", text);
      setText("");
      setMessages(await listSupportMessages(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-3xl bg-white border border-[#0D3B3B]/8 p-5 space-y-4">
      <h2 className="font-display font-bold text-xl text-[#0D3B3B]">Live support chat</h2>
      <p className="font-body text-sm text-[#0D3B3B]/60">
        Use this to report a concern. Do not send bank PINs, OTPs, or other people’s private files.
      </p>
      {!conversationId && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full rounded-xl border px-3 py-2 text-sm"
        />
      )}
      <div className="max-h-72 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-2xl px-3 py-2 text-sm ${m.sender === "admin" ? "bg-[#1BAA9C]/10 text-[#0D3B3B]" : "bg-slate-100 text-[#0D3B3B]"}`}>
            <p className="text-[10px] uppercase tracking-wide text-[#0D3B3B]/45">{m.sender}</p>
            <p>{m.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
        />
        <button disabled={loading} className="rounded-xl bg-[#0D3B3B] text-white px-4 py-2 text-sm font-semibold">
          {loading ? "…" : "Send"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ContactPage() {
  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-20">
        <SectionLabel>Contact</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B] mb-4">Talk to Seek</h1>
        <p className="font-body text-[#0D3B3B]/70 leading-relaxed">
          Seek is a project of BSN Foundation. Email us at{" "}
          <a className="font-semibold text-[#1BAA9C]" href="mailto:Support@barristerstreet.org">Support@barristerstreet.org</a>
          {" "}or start a chat below. You can also use Report this request on a public request page.
        </p>
        <p className="mt-3 font-body text-sm text-[#0D3B3B]/55">
          Seek is open to requests and help from anywhere. BSN Foundation’s earlier work includes Enugu, Abuja and Lagos.
        </p>
        <SupportChat />
      </section>
    </div>
  );
}

function LanguagePage({ setPage }) {
  const [lang, setLang] = useState(readSeekLang());
  const choose = (id) => {
    try { localStorage.setItem("seek_lang", id); } catch (_e) {}
    setLang(id);
    window.location.reload();
  };
  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-md px-5 pt-12 pb-28">
        <SectionLabel>{tSeek("language")}</SectionLabel>
        <h1 className="font-display font-extrabold text-3xl text-[#0D3B3B]">Choose a language</h1>
        <p className="mt-2 text-sm text-[#0D3B3B]/55">SEEK stays in English under the hood. These words cover Home and the main doors first.</p>
        <div className="mt-6 divide-y divide-[#0D3B3B]/8 rounded-3xl bg-white border border-[#0D3B3B]/10 overflow-hidden">
          {SEEK_LANGS.map((item) => (
            <button key={item.id} type="button" onClick={() => choose(item.id)} className={"w-full text-left px-5 py-4 text-base " + (lang === item.id ? "bg-[#1BAA9C]/10 font-semibold text-[#0D3B3B]" : "text-[#0D3B3B]")}>
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function LegalPage({ title }) {
  const copy = {
    Privacy: [
      "Seek collects only what is needed to operate the platform: request details, contact information for matching, donation references, and account emails.",
      "Supporting evidence is stored so Seek and BSN Foundation can review a request. Published pages show only what admins have approved as public.",
      "We do not sell personal information. Access to private contact fields is limited to authorised admins.",
      "You may ask for your account or request data to be reviewed by contacting BSN Foundation through Seek.",
    ],
    Terms: [
      "SEEK keeping the lights on. When you give through Paystack, SEEK asks to add 5% on top of the amount that goes to the request or BSN outreach. That 5% helps run SEEK (hosting, review, messages). You can untick it before you pay. SEEK does not take 5% out of the gift if you do not add it.",
      "Seek is a community assistance project of BSN Foundation.",
      "Submitting a request, offer, donation or volunteer form does not guarantee funding or a match.",
      "Users must provide truthful information and must not use Seek to harass, defraud or exploit others.",
      "Seek may decline, unpublish or remove content that breaks these terms or our community guidelines.",
    ],
    Guidelines: [
      "Share only what is needed. Do not post full home addresses, hospital card numbers, or other people's private details.",
      "Be honest about the need. Evidence should support the request without exposing sensitive bystanders.",
      "Treat requesters and helpers with dignity. Hate, threats and scams are not allowed.",
      "If you see something unsafe, use Report this request. Seek will review it.",
    ],
  };

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-20">
        <SectionLabel>Trust & Safety</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B] mb-6">{title}</h1>
        <div className="space-y-4">
          {(copy[title] || []).map((para) => (
            <p key={para} className="font-body text-[#0D3B3B]/75 leading-relaxed">{para}</p>
          ))}
        </div>
      </section>
    </div>
  );
}


function ImpactStoryPage({ impactId, setPage }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let donorTick;
    (async () => {
      try {
        let row = null;
        if (String(impactId).startsWith("thanks-")) {
          const thanks = await listAppreciationStories().catch(() => []);
          row = (thanks || []).find((item) => item.id === impactId) || null;
        } else {
          row = await getPublishedImpactById(impactId);
        }
        if (!cancelled) {
          if (!row) setError("This story is not published.");
          setPost(row);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load this story.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [impactId]);

  if (loading) {
    return <div style={{ background: C.bg }} className="min-h-[40vh] flex items-center justify-center"><p className="font-body text-sm text-[#0D3B3B]/50">Loading story…</p></div>;
  }
  if (error || !post) {
    return (
      <div style={{ background: C.bg }} className="min-h-[40vh] flex items-center">
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <h1 className="font-display font-bold text-2xl text-[#0D3B3B] mb-3">Story not found</h1>
          <p className="font-body text-[#0D3B3B]/65 mb-6">{error}</p>
          <Button variant="primary" onClick={() => { window.history.pushState({}, "", "/impact"); setPage("impact"); }}>Back to Impact</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-20 space-y-5">
        <SectionLabel>Community Impact</SectionLabel>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B]">{post.title}</h1>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-sm font-semibold"
              onClick={async () => {
                const path = post.request_id ? `/request/${post.request_id}` : `/impact/${post.id}`;
                await shareSeekStory({ title: post.title, path });
              }}
            >
              Share
            </button>
            <a
              className="rounded-full border px-3 py-1.5 text-sm font-semibold"
              href={`https://wa.me/?text=${encodeURIComponent((post.title || "SEEK story") + " " + (typeof window !== "undefined" ? window.location.origin : "https://seekbsn.org") + (post.request_id ? "/request/" + post.request_id : "/impact/" + post.id))}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <p className="font-body text-sm text-[#0D3B3B]/55">{[post.location, post.happened_on].filter(Boolean).join(" · ")}</p>
        {post.story && <p className="font-body text-[#0D3B3B]/80 leading-relaxed whitespace-pre-wrap">{post.story}</p>}
        {(post.mediaItems || [{ public_url: post.public_url, media_kind: post.media_kind }].filter((m) => m.public_url)).map((m) => (
          m.media_kind === "video" ? (
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video key={m.public_url} src={m.public_url} controls playsInline preload="none" className="w-full max-h-96 bg-black" controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} />
              <SeekVideoWatermark />
            </div>
          ) : (
            <img loading="lazy" decoding="async" key={m.public_url} src={m.public_url} alt="" className="w-full max-h-96 rounded-2xl object-contain border" />
          )
        ))}
        <CommunityInteractions targetType="impact" targetId={post.id} />
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => { if (String(impactId).startsWith("thanks-")) { setPage("give"); window.scrollTo(0, 0); } else { setDonateOpen(true); } }}>{String(impactId).startsWith("thanks-") ? "Support the SEEK community" : "Support this work"}</Button>
          <Button variant="secondary" onClick={() => { window.history.pushState({}, "", "/impact"); setPage("impact"); }}>All stories</Button>
        </div>
        {donateOpen && (
          <OutreachCheckout
            campaign={{ title: post.title, amount: 10000 }}
            onClose={() => setDonateOpen(false)}
          />
        )}
      </section>
    </div>
  );
}

function ImpactPage({ setPage }) {
  const [posts, setPosts] = useState([]);
  const [thanks, setThanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let donorTick;
    (async () => {
      try {
        const [rows, thanks, live] = await Promise.all([
          listPublishedImpact(),
          listAppreciationStories().catch(() => []),
          getSeekLiveStats().catch(() => null),
        ]);
        if (!cancelled) {
          setPosts(rows || []);
          setThanks(thanks || []);
          setLiveStats(live || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load impact stories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-8 text-center">
        <SectionLabel>Community Impact</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B]">See what your help made possible.</h1>
        <p className="mt-4 font-body text-lg text-[#0D3B3B]/65">
          Stories of people and communities reached through Seek and BSN Foundation.
        </p>
      </section>
      <style>{`@keyframes seekFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }`}</style>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Help raised", liveStats?.raised ? "₦" + Number(liveStats.raised).toLocaleString() : "—"], ["Gifts received", liveStats?.donationCount ?? "—"], ["Published stories", thanks.length], ["Impact posts", posts.length]].map(([label,value]) => <div key={label} className="rounded-2xl bg-white border border-[#0D3B3B]/10 p-5"><p className="text-xs uppercase tracking-widest text-[#0D3B3B]/45">{label}</p><p className="mt-2 font-display font-extrabold text-2xl text-[#0D3B3B]">{value}</p></div>)}
      </section>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-8">
        <p className="text-xs uppercase tracking-widest text-[#0D3B3B]/45 mb-2">Related UN goals</p>
        <p className="text-sm text-[#0D3B3B]/60 mb-3">BSN’s published work sits next to these goals. These labels are not a claim that SEEK has fulfilled an SDG.</p>
        <div className="flex flex-wrap gap-2">
          {["SDG 1 No poverty", "SDG 2 Zero hunger", "SDG 3 Good health", "SDG 4 Quality education", "SDG 5 Gender equality"].map((s) => (
            <span key={s} className="rounded-full border border-[#0D3B3B]/15 px-3 py-1 text-xs font-semibold text-[#0D3B3B]">{s}</span>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-20 space-y-6">
        {loading && <p className="font-body text-sm text-[#0D3B3B]/50">Loading stories…</p>}
        {error && <p className="font-body text-sm text-red-600">{error}</p>}
        {!loading && !error && posts.length === 0 && thanks.length === 0 && (
          <p className="font-body text-sm text-[#0D3B3B]/50">No published stories yet.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            className="rounded-xl bg-white border border-[#0D3B3B]/8 overflow-hidden text-left shadow-sm"
            onClick={() => {
              window.history.pushState({}, "", `/impact/${post.id}`);
              setPage(`impact:${post.id}`);
              window.scrollTo(0, 0);
            }}
          >
            {post.public_url && post.media_kind === "video" ? (
              <video src={post.public_url} muted playsInline preload="none" className="h-24 w-full object-cover bg-black" />
            ) : post.public_url ? (
              <img loading="lazy" decoding="async" src={post.public_url} alt="" className="h-24 w-full object-cover" />
            ) : (
              <div className="h-16 bg-[#0D3B3B]/5" />
            )}
            <div className="p-2.5">
              <h2 className="font-display font-semibold text-sm text-[#0D3B3B] line-clamp-2">{post.title}</h2>
              <p className="mt-1 font-body text-[11px] text-[#0D3B3B]/50 line-clamp-2">
                {post.story || [post.location, post.happened_on].filter(Boolean).join(" · ")}
              </p>
            </div>
          </button>
        ))}
        </div>
        {thanks.length > 0 && (
          <div className="pt-10">
            <h2 className="font-display font-bold text-xl text-[#0D3B3B] mb-4">Thank-you notes from requesters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {thanks.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="rounded-xl bg-white border border-[#0D3B3B]/8 overflow-hidden text-left shadow-sm"
                  onClick={() => {
                    window.history.pushState({}, "", `/impact/${post.id}`);
                    setPage(`impact:${post.id}`);
                    window.scrollTo(0, 0);
                  }}
                >
                  {post.public_url && post.media_kind === "video" ? (
                    <video src={post.public_url} muted playsInline preload="none" className="h-24 w-full object-cover bg-black" />
                  ) : post.public_url ? (
                    <img loading="lazy" src={post.public_url} alt="" className="h-24 w-full object-cover" />
                  ) : null}
                  <div className="p-2.5">
                    <h3 className="font-display font-semibold text-sm text-[#0D3B3B] line-clamp-2">{post.title}</h3>
                    <p className="mt-1 font-body text-[11px] text-[#0D3B3B]/50 line-clamp-2">{post.story}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="text-center pt-4">
          <Button variant="primary" onClick={() => setPage("give")}>Help someone <ArrowRight size={16} /></Button>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Account / Auth Page ---------------- */

function AccountAvatar() {
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  useEffect(() => {
    const cached = getCachedAvatarUrl();
    if (cached) setPhoto(cached);
    getMyProfile().then((p) => { if (p?.avatar_url) setPhoto(p.avatar_url); }).catch(() => {});
  }, []);
  return (
    <div className="mt-6 text-left">
      {photo ? (
        <img loading="lazy" decoding="async" src={photo} alt="" className="h-24 w-24 rounded-full object-cover border mb-3" />
      ) : (
        <div className="h-24 w-24 rounded-full bg-[#0D3B3B]/10 mb-3" />
      )}
      <p className="font-display font-semibold text-sm mb-2">Profile photo</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true); setError("");
          try {
            const result = await uploadProfilePhoto(file);
            const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
            if (result.storage_path) {
              const url = `${base}/storage/v1/object/public/seek-impact/` + String(result.storage_path).split("/").map(encodeURIComponent).join("/");
              cacheAvatarUrl(url);
              setPhoto(url);
            }
          } catch (err) {
            setError(err.message || "Could not upload photo.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <p className="mt-1 text-xs text-[#0D3B3B]/50">{busy ? "Uploading…" : "A simple face photo helps people recognise you."}</p>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function AccountUsernameForm({ onSaved } = {}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getMyProfile().then((p) => {
      if (!p) return;
      setUsername(p.username || "");
      setName(p.full_name || "");
      setBio(p.bio || "");
    }).catch(() => {});
  }, []);
  return (
    <form className="mt-6 text-left space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true); setHint("");
      try {
        const saved = await updateMyUsername({ username, full_name: name, bio });
        setUsername(saved?.username || username);
        setName(saved?.full_name || name);
        setBio(saved?.bio ?? bio);
        setHint("Profile saved.");
        if (typeof onSaved === "function") onSaved({ ...(saved || {}), username: saved?.username || username, full_name: saved?.full_name || name, bio: saved?.bio ?? bio });
      } catch (err) {
        setHint(err.message || "Could not save.");
      } finally { setSaving(false); }
    }}>
      <p className="font-display font-semibold text-sm">Public profile</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full rounded-xl border px-3 py-2 text-sm" />
      <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="username" className="w-full rounded-xl border px-3 py-2 text-sm" />
      <p className="text-xs text-[#0D3B3B]/50">3–24 characters. Letters, numbers, underscore. This becomes /member/username</p>
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280} placeholder="A short public line (optional)" className="w-full rounded-xl border px-3 py-2 text-sm" />
      <button type="submit" className="rounded-full bg-[#0D3B3B] text-white px-4 py-2 text-sm" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      {hint && <p className="text-sm text-[#0D3B3B]/70">{hint}</p>}
    </form>
  );
}

function AccountPage({ setPage, userSession, setUserSession }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!userSession?.access_token) {
      setProfile(null);
      return;
    }
    getMyProfile().then((p) => setProfile(p || null)).catch(() => {});
    const back = sessionStorage.getItem("seek_return");
    if (!back) return;
    sessionStorage.removeItem("seek_return");
    if (String(back).startsWith("request:")) {
      window.history.pushState({}, "", "/request/" + back.split(":")[1]);
    } else if (back === "offers") {
      window.history.pushState({}, "", "/offers");
    }
    setPage(back);
  }, [userSession]);

  if (userSession?.access_token) {
    const displayName = profile?.full_name || userSession.user?.user_metadata?.full_name || userSession.user?.email?.split("@")[0] || "A neighbour";
    const username = profile?.username ? `@${profile.username}` : "Username not set";
    return (
      <div style={{ background: C.bg }} className="min-h-[70vh]">
        <section className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
          <div className="rounded-[2rem] bg-[#0D3B3B] text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="shrink-0"><AccountAvatar /></div>
              <div className="min-w-0">
                <SectionLabel>Profile</SectionLabel>
                <h1 className="mt-1 font-display font-extrabold text-2xl sm:text-3xl truncate">{displayName} <SeekVerifiedCheck /></h1>
                <p className="mt-1 text-sm text-[#8DE3C5] font-semibold truncate">{username}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-white/75">
              <strong className="text-white">Your public profile</strong><br />
              Your name, photo, username and bio can be public. Your email, phone, gifts, requests and notifications stay private to your account.
            </div>
            <div className="mt-5 rounded-2xl bg-white p-5 text-[#0D3B3B]">
              <AccountUsernameForm onSaved={(saved) => setProfile((prev) => ({ ...(prev || {}), ...(saved || {}) }))} />
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => setPage("my-seek")} className="rounded-2xl bg-white border border-[#0D3B3B]/10 p-5 text-left hover:shadow-md transition">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Your space</p>
              <h2 className="mt-1 font-display font-bold text-lg text-[#0D3B3B]">My SEEK</h2>
              <p className="mt-1 text-sm text-[#0D3B3B]/55">See your requests, giving, giveaways, interests and activity.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1BAA9C]">Open My SEEK <ArrowRight size={15} /></span>
            </button>
            <button type="button" onClick={() => setPage("my-requests")} className="rounded-2xl bg-white border border-[#0D3B3B]/10 p-5 text-left hover:shadow-md transition">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Requests</p>
              <h2 className="mt-1 font-display font-bold text-lg text-[#0D3B3B]">My requests</h2>
              <p className="mt-1 text-sm text-[#0D3B3B]/55">View and manage requests connected to your account.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1BAA9C]">View requests <ArrowRight size={15} /></span>
            </button>
            <button type="button" onClick={() => setPage("notifications")} className="rounded-2xl bg-white border border-[#0D3B3B]/10 p-5 text-left hover:shadow-md transition">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Updates</p>
              <h2 className="mt-1 font-display font-bold text-lg text-[#0D3B3B]">Notifications</h2>
              <p className="mt-1 text-sm text-[#0D3B3B]/55">Keep up with responses, interests and other SEEK updates.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1BAA9C]">Open notifications <ArrowRight size={15} /></span>
            </button>
            <div className="rounded-2xl bg-white border border-[#0D3B3B]/10 p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Account</p>
              <h2 className="mt-1 font-display font-bold text-lg text-[#0D3B3B]">Keep your account secure</h2>
              <p className="mt-1 text-sm text-[#0D3B3B]/55">Your email is used for account activity and private updates.</p>
              <button type="button" onClick={() => { userLogout(); setUserSession(null); }} className="mt-4 rounded-full border border-[#0D3B3B]/15 px-4 py-2 text-sm font-semibold text-[#0D3B3B] hover:bg-[#F2F5F3]">Sign out</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "recover") {
        await requestPasswordReset(email);
        setMessage("Check your email for a password reset link.");
        setMode("signin");
      } else if (mode === "signup") {
        const result = await userSignUp(email, password);
        if (result?.needsConfirmation) {
          setMessage("Check your email to confirm your account, then sign in.");
          setMode("signin");
        } else {
          setUserSession(result);
          const back = sessionStorage.getItem("seek_return") || "home";
          sessionStorage.removeItem("seek_return");
          if (String(back).startsWith("request:")) window.history.pushState({}, "", "/request/" + back.split(":")[1]);
          setPage(back);
        }
      } else {
        const session = await userSignIn(email, password);
        setUserSession(session);
        const back = sessionStorage.getItem("seek_return") || "home";
        sessionStorage.removeItem("seek_return");
        if (String(back).startsWith("request:")) window.history.pushState({}, "", "/request/" + back.split(":")[1]);
        setPage(back);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: C.bg }} className="min-h-[60vh]">
      <section className="mx-auto max-w-md px-5 py-16">
        <div className="text-center mb-8">
          <SectionLabel>Account</SectionLabel>
          <h1 className="font-display font-extrabold text-3xl text-[#0D3B3B]">
            {mode === "recover" ? "Reset password" : mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 font-body text-sm text-[#0D3B3B]/60">
            {mode === "recover" ? "We will email a reset link." : "Stay signed in on this device."}
          </p>
        </div>

        <button type="button" className="w-full rounded-full bg-[#0D3B3B] text-white py-3.5 text-sm font-bold mb-3" onClick={() => startGoogleSignIn()}>
          Continue with Google
        </button>
        <p className="text-center text-xs text-[#0D3B3B]/45 mb-6">Stays signed in on this phone.</p>
        <p className="text-center text-xs text-[#0D3B3B]/40 mb-3">Or use email</p>
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white border border-[#0D3B3B]/08 p-6 sm:p-8 space-y-4"
        >
          <Field label="Email">
            <input
              required
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          {mode !== "recover" && (
          <Field label="Password">
            <input
              required={mode !== "recover"}
              type="password"
              minLength={6}
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </Field>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-[#1BAA9C]">{message}</p>}

          <Button disabled={loading} type="submit" variant="primary" className="w-full">
            {loading ? "Please wait…" : mode === "recover" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          {mode !== "recover" && (
            <>
              <button type="button" className="w-full text-sm font-semibold text-[#1BAA9C]" onClick={async () => {
                try {
                  setError("");
                  await sendMagicLink(email);
                  setMessage("Check your email for a sign-in link.");
                } catch (err) {
                  setError(err.message || "Could not send a sign-in link.");
                }
              }}>
                Email me a sign-in link
              </button>
            </>
          )}
          {mode === "signin" && (
            <button type="button" className="block w-full text-center text-sm font-semibold text-[#1BAA9C]" onClick={() => { setMode("recover"); setError(""); setMessage(""); }}>
              Forgot password?
            </button>
          )}

          <p className="text-center text-sm text-[#0D3B3B]/55">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  className="font-semibold text-[#1BAA9C]"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setMessage("");
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-[#1BAA9C]"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setMessage("");
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </section>
    </div>
  );
}


/* ---------------- My SEEK Dashboard ---------------- */

function MySeekDashboard({ setPage, userSession }) {
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [interests, setInterests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [gifts, setGifts] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.access_token) return;
    let cancelled = false;

    (async () => {
      try {
        const [requestRows, offerRows, profileRow, liveStats, notificationRows, giftRows, receivedRows] = await Promise.all([
          listMyRequests().catch(() => []),
          listMyOffers().catch(() => []),
          getMyProfile().catch(() => null),
          getSeekLiveStats().catch(() => null),
          listMyNotifications(50).catch(() => []),
          listMyGifts().catch(() => []),
          listReceivedForMe().catch(() => []),
        ]);

        if (cancelled) return;

        const mappedRequests = (Array.isArray(requestRows) ? requestRows : []).map((row) => row && row.id ? mapRequestRow(row) : null).filter(Boolean);
        const mappedOffers = Array.isArray(offerRows) ? offerRows : [];
        setRequests(mappedRequests);
        setOffers(mappedOffers);
        setProfile(profileRow || null);
        setStats(liveStats || null);
        setNotifications(Array.isArray(notificationRows) ? notificationRows : []);
        setGifts(Array.isArray(giftRows) ? giftRows : []);
        setReceived(Array.isArray(receivedRows) ? receivedRows : []);

        const offerIds = mappedOffers.map((offer) => offer.id).filter(Boolean);
        if (offerIds.length) {
          const interestRows = await listMyOfferInterestsSummary(offerIds).catch(() => []);
          if (!cancelled) setInterests(Array.isArray(interestRows) ? interestRows : []);
        } else {
          setInterests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const tick = setInterval(() => {
      listMyNotifications(50).then((rows) => { if (!cancelled) setNotifications(Array.isArray(rows) ? rows : []); }).catch(() => {});
      listReceivedForMe().then((rows) => { if (!cancelled) setReceived(Array.isArray(rows) ? rows : []); }).catch(() => {});
    }, 12000);
    return () => { cancelled = true; clearInterval(tick); };
  }, [userSession]);

  if (!userSession?.access_token) {
    return <AccountPage setPage={setPage} userSession={userSession} setUserSession={() => {}} />;
  }

  const openRequests = requests.filter((r) => !["fulfilled", "closed", "rejected"].includes(r.status));
  const fulfilledRequests = requests.filter((r) => r.status === "fulfilled");
  const openOffers = offers.filter((o) => !["closed", "fulfilled"].includes(String(o.status || "").toLowerCase()));
  const unreadNotifications = notifications.filter((n) => !n.read_at).length;
  const completedOffers = offers.filter((o) => ["matched", "fulfilled", "completed"].includes(String(o.status || "").toLowerCase())).length;
  const avatar = profile?.avatar_url || "";
  const displayName = profile?.full_name || profile?.name || userSession.user?.user_metadata?.full_name || userSession.user?.email?.split("@")[0] || "A neighbour";
  const username = profile?.username ? `@${profile.username}` : "Username not set";
  const firstName = String(displayName).trim().split(/\s+/)[0] || "there";

  const go = (page, path = null) => {
    if (path) window.history.pushState({}, "", path);
    setPage(page);
    window.scrollTo(0, 0);
  };

  const statCards = [
    { label: "Requests", value: requests.length, icon: HeartHandshake, action: () => go("my-requests", "/my-requests") },
    { label: "Active needs", value: openRequests.length, icon: Search, action: () => go("my-requests", "/my-requests") },
    { label: "Giveaways", value: offers.length, icon: Package, action: () => go("offers", "/offers") },
    { label: "Interests", value: interests.length, icon: Users, action: () => go("offers", "/offers") },
  ];

  return (
    <div style={{ background: C.bg }} className="min-h-screen">
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 sm:pt-14 pb-7">
        <div className="rounded-[2rem] bg-[#0D3B3B] text-white overflow-hidden relative">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#1BAA9C]/20" aria-hidden="true" />
          <div className="absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-white/5" aria-hidden="true" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  {avatar ? (
                    <img loading="lazy" decoding="async" src={avatar} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-white/20" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold">
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -right-1 -bottom-1"><SeekVerifiedCheck /></span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#8DE3C5]">My SEEK</p>
                  <p className="mt-1 text-xs text-white/70">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}</p>
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl truncate">{firstName}</h1>
                  <p className="mt-1 text-sm text-[#8DE3C5] font-semibold truncate">{username}</p>
                </div>
              </div>
              <button type="button" onClick={() => go("account", "/account")} className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Edit profile</button>
            </div>
            <p className="mt-5 text-sm text-white/70">Your SEEK journey</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
              <span><strong className="text-white">{requests.length}</strong> requests</span>
              <span><strong className="text-white">{offers.length}</strong> giveaways</span>
              <span><strong className="text-white">{gifts.length}</strong> gifts</span>
              <span><strong className="text-white">{unreadNotifications}</strong> new messages</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#8DE3C5] font-bold">Received</p>
                <p className="mt-1 font-display font-extrabold text-xl">₦{(received.length ? received : requests).reduce((sum, r) => sum + Number(r.amount || r.amountRaised || r.amount_raised || 0), 0).toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-white/60">Gifts neighbours sent you</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#8DE3C5] font-bold">Given</p>
                <p className="mt-1 font-display font-extrabold text-xl">₦{gifts.reduce((sum, g) => sum + Number(g.amount || 0), 0).toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-white/60">What you gave neighbours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 sm:px-8 pb-8">
        <div className="rounded-3xl bg-white border border-[#0D3B3B]/10 divide-y divide-[#0D3B3B]/8">
          {[
            ["My requests", () => go("my-requests", "/my-requests"), requests.length],
            ["My giveaways", () => go("offers", "/offers"), offers.length],
            ["My support", () => go("my-seek"), gifts.length],
            ["Messages", () => go("notifications", "/notifications"), unreadNotifications],
            ["Account & privacy", () => go("account", "/account"), ""],
          ].map(([label, action, count]) => (
            <button key={label} type="button" onClick={action} className="w-full flex items-center justify-between px-5 py-4 text-left">
              <span className="font-semibold text-[#0D3B3B]">{label}</span>
              <span className="text-sm text-[#0D3B3B]/45">{count === "" ? "→" : count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-10 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Your activity</p><h2 className="mt-1 font-display font-bold text-xl text-[#0D3B3B]">Requests you've made</h2></div>
              <button type="button" className="text-sm font-semibold text-[#1BAA9C]" onClick={() => go("my-requests", "/my-requests")}>See all →</button>
            </div>
            {loading ? <p className="text-sm text-[#0D3B3B]/50">Loading your activity…</p> : requests.length === 0 ? (
              <div className="rounded-2xl bg-[#F2F5F3] p-5"><p className="font-semibold text-[#0D3B3B]">Nothing here yet.</p><p className="mt-1 text-sm text-[#0D3B3B]/55">When you ask SEEK for help, your requests will appear here.</p><button type="button" onClick={() => go("seek-help", "/seek-help")} className="mt-4 rounded-full bg-[#1BAA9C] px-4 py-2 text-sm font-bold text-white">Ask for help</button></div>
            ) : (
              <div className="space-y-2">
                {requests.slice(0, 4).map((r) => (
                  <button key={r.id} type="button" className="w-full text-left rounded-2xl border border-[#0D3B3B]/8 p-4 hover:bg-[#F2F5F3] transition" onClick={() => go(`request:${r.id}`, `/request/${r.id}`)}>
                    <div className="flex items-center justify-between gap-3"><span className="font-display font-bold text-[#0D3B3B] line-clamp-1">{r.title}</span><span className="shrink-0 text-xs font-semibold text-[#1BAA9C]">{formatSeekStatus(r.status)}</span></div>
                    <p className="mt-1 text-xs text-[#0D3B3B]/45">{r.category}{r.location ? ` · ${r.location}` : ""}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4"><div><p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Give & receive</p><h2 className="mt-1 font-display font-bold text-xl text-[#0D3B3B]">Your giveaways</h2></div><button type="button" className="text-sm font-semibold text-[#1BAA9C]" onClick={() => go("offers", "/offers")}>Explore →</button></div>
            {offers.length === 0 ? <div className="rounded-2xl bg-[#F2F5F3] p-5"><p className="font-semibold text-[#0D3B3B]">You haven't created a giveaway yet.</p><p className="mt-1 text-sm text-[#0D3B3B]/55">Offer goods, services, opportunities or other support to someone in the SEEK community.</p><button type="button" onClick={() => go("offers", "/offers")} className="mt-4 rounded-full bg-[#1BAA9C] px-4 py-2 text-sm font-bold text-white">Give support</button></div> : (
              <div className="space-y-2">
                {offers.slice(0, 3).map((offer) => <div key={offer.id} className="rounded-2xl border border-[#0D3B3B]/8 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#0D3B3B] line-clamp-1">{offer.description || offer.category || "SEEK giveaway"}</p><span className="text-xs font-semibold text-[#1BAA9C]">{offer.status || "Open"}</span></div><p className="mt-1 text-xs text-[#0D3B3B]/45">{offer.category || "Support"}{offer.city ? ` · ${offer.city}` : ""}</p></div>)}
              </div>
            )}
          </div>
          <div className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Your gifts</p>
            <h2 className="mt-1 font-display font-bold text-xl text-[#0D3B3B]">Help you have given</h2>
            <p className="mt-1 text-xs text-[#0D3B3B]/45">Amounts stay on your account only.</p>
            {gifts.length === 0 ? <p className="mt-3 text-sm text-[#0D3B3B]/55">No confirmed gifts on this email yet.</p> : (
              <div className="mt-3 space-y-2">
                {gifts.slice(0, 8).map((g) => (
                  <div key={g.id} className="rounded-2xl border border-[#0D3B3B]/8 p-3 flex justify-between gap-3 text-sm">
                    <span>{g.donor_name || "Gift"}</span>
                    <span className="font-semibold">₦{Number(g.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-[#0D3B3B] text-white p-6">
            <p className="text-[10px] uppercase tracking-widest text-[#8DE3C5]">Quick actions</p>
            <h2 className="mt-2 font-display font-bold text-2xl">Keep help moving.</h2>
            <div className="mt-5 grid gap-2">
              {[['seek-help','Ask for Help','Tell SEEK what you need',HeartHandshake],['give','Give Support','Help someone today',HandHeart],['offers','Create Giveaway','Offer what you can',Package],['celebrate','Connect & Celebrate','Connect with people and moments',Users]].map(([id,label,note,Icon]) => <button key={id} type="button" onClick={() => go(id)} className="rounded-2xl bg-white/10 px-4 py-3 text-left hover:bg-white/15 transition"><span className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><Icon size={18}/></span><span><span className="block text-sm font-bold">{label}</span><span className="block text-[11px] text-white/55">{note}</span></span></span></button>)}
            </div>
          </div>

          <button type="button" onClick={() => go("notifications", "/notifications")} className="w-full rounded-3xl bg-white border border-[#0D3B3B]/10 p-5 text-left hover:shadow-md transition">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1BAA9C]/10 text-[#1BAA9C]"><Bell size={19}/></span><ArrowRight size={17} className="text-[#0D3B3B]/35"/></div>
            <h2 className="mt-4 font-display font-bold text-lg text-[#0D3B3B]">Notifications</h2>
            <p className="mt-1 text-sm text-[#0D3B3B]/55">{unreadNotifications > 0 ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}` : "You're all caught up."}</p>
          </button>

          <div className="rounded-3xl bg-white border border-[#0D3B3B]/10 p-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#1BAA9C]">Your progress</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-[#0D3B3B]/65">Requests fulfilled</span><strong className="text-[#0D3B3B]">{fulfilledRequests.length}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-[#0D3B3B]/65">Open giveaways</span><strong className="text-[#0D3B3B]">{openOffers.length}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-[#0D3B3B]/65">Completed giveaways</span><strong className="text-[#0D3B3B]">{completedOffers}</strong></div>
            </div>
            <p className="mt-4 pt-4 border-t border-[#0D3B3B]/8 text-xs leading-relaxed text-[#0D3B3B]/50">These figures reflect activity available to your SEEK account. No estimated or invented impact numbers are shown.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- My Requests Page ---------------- */


function RequestEvidencePostForm({ requestId, onSaved }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    if (!files.length) { setError("Choose at least one photo or video."); return; }
    try {
      setSaving(true);
      if (caption.trim()) await postRequestPublicUpdate(requestId, caption.trim());
      for (const file of files.slice(0, 5)) await uploadRequestEvidence(requestId, file);
      setFiles([]); setCaption(""); setMessage("Your evidence was submitted for SEEK review. Once approved, it can appear in Live Support.");
      onSaved?.();
    } catch (err) {
      setError(err?.message || "Could not upload your evidence.");
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-[#1BAA9C]/15 bg-[#1BAA9C]/5 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1BAA9C]">Share your evidence</p>
        <p className="mt-1 text-sm text-[#0D3B3B]/65">Post a photo or short video showing your story or what support looks like. SEEK reviews media before it becomes public.</p>
      </div>
      <textarea value={caption} maxLength={280} rows={3} onChange={(e) => setCaption(e.target.value)} placeholder="Add a short caption or update (optional)" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
      <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} className="block w-full text-sm" />
      {files.length > 0 && <p className="text-xs text-[#0D3B3B]/50">{files.length} file{files.length === 1 ? "" : "s"} selected.</p>}
      {message && <p className="text-sm text-[#168F84]">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-full bg-[#0D3B3B] px-4 py-2.5 text-sm font-bold text-white">{saving ? "Uploading…" : "Submit evidence"}</button>
    </form>
  );
}

function RequesterUpdateForm({ requestId, existing, existingMedia, onSaved }) {
  const [text, setText] = useState(existing || "");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [saved, setSaved] = useState(Boolean(existing || existingMedia));

  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          setSaving(true);
          setError("");
          if (text.trim().length < 3) throw new Error("Write a short note about how it went.");
          if ((files?.length || 0) + (existingMedia ? 1 : 0) < 3) throw new Error("Add at least 3 photos or short videos.");
          await postRequestPublicUpdate(requestId, text);
          for (const f of files || []) await uploadAppreciationMedia(requestId, f);
          setSaved(true);
          onSaved?.(text.trim());
        } catch (err) {
          setError(err.message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/45">
        How did Seek go?
      </p>
      <textarea
        required
        value={text}
        maxLength={280}
        rows={3}
        onChange={(e) => setText(e.target.value)}
        placeholder="What happened, and how did people show up?"
        className="w-full rounded-xl border px-3 py-2 text-sm"
      />
      <p className="text-xs text-[#0D3B3B]/50">Add at least 3 photos or short videos of how it went. These help Seek tell the outcome.</p>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
        onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 8))}
        className="block w-full text-sm"
      />
      <p className="text-xs text-[#0D3B3B]/45">Optional photo or short video of thanks. Do not include other people’s private documents.</p>
      {saved && (existing || existingMedia) && (
        <div className="rounded-2xl bg-[#1BAA9C]/10 border border-[#1BAA9C]/15 p-4">
          <p className="font-semibold text-sm text-[#0D3B3B]">Your update has been received.</p>
          <p className="mt-1 text-xs text-[#0D3B3B]/60 leading-relaxed">SEEK may review the update before publishing it. Once approved, it can appear on the relevant request/story so people can see the outcome.</p>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[#0D3B3B] text-white px-3 py-2 text-sm font-semibold"
      >
        {saving ? "Saving…" : saved ? "Update message" : "Publish update"}
      </button>
    </form>
  );
}

function MyRequestsPage({ setPage, userSession }) {
  const [myAvatar, setMyAvatar] = useState("");
  useEffect(() => {
    const cached = getCachedAvatarUrl();
    if (cached) setMyAvatar(cached);
    getMyProfile().then((p) => { if (p?.avatar_url) setMyAvatar(p.avatar_url); }).catch(() => {});
  }, []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!userSession?.access_token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const rows = await listMyRequests();
        if (!cancelled) setItems(Array.isArray(rows) ? rows.map(mapRequestRow) : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userSession]);

  if (!userSession?.access_token) {
    return (
      <div style={{ background: C.bg }} className="min-h-[60vh] flex items-center">
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="font-display font-bold text-2xl text-[#0D3B3B] mb-3">
            Sign in to track your requests
          </h1>
          <p className="font-body text-sm text-[#0D3B3B]/60 mb-6">
            Use the same email you used when you submitted a request.
          </p>
          <Button variant="primary" onClick={() => setPage("account")}>
            Sign in <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-16 pb-10">
        <SectionLabel>Your account</SectionLabel>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0D3B3B] mb-2">
          My requests
        </h1>
        {/* avatar loaded below */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative shrink-0">
            {myAvatar ? <img loading="lazy" decoding="async" src={myAvatar} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-[#0D3B3B]/10" />}
            <span className="absolute -right-1 -bottom-1"><SeekVerifiedCheck /></span>
          </div>
          <p className="font-body text-sm text-[#0D3B3B]/60 flex items-center gap-1.5">Signed in as {userSession.user?.email} <SeekVerifiedCheck /></p>
        </div>

        {loading && (
          <p className="font-body text-sm text-[#0D3B3B]/50">Loading your requests…</p>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-5 mb-6">
            <p className="text-sm text-red-700">{error}</p>
            <p className="mt-2 text-xs text-red-600/80">
              If this is your first time using tracking, the database function may still need to be created (see setup notes).
            </p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-3xl bg-white border border-[#0D3B3B]/08 p-8 text-center">
            <p className="font-body text-[#0D3B3B]/60 mb-4">
              You have no requests yet.
            </p>
            <p className="font-body text-xs text-[#0D3B3B]/45 mb-6">
              When you need help, you can ask here.
            </p>
            <Button variant="primary" onClick={() => setPage("seek-help")}>
              Submit a request <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <input className="mb-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Search your requests" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "pending_review", label: "Under review" },
                { id: "published", label: "Live" },
                { id: "fulfilled", label: "Need met" },
                { id: "rejected", label: "Not published" },
              ].map((f) => (
                <button key={f.id} type="button" onClick={() => setStatusFilter(f.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusFilter === f.id ? "bg-[#0D3B3B] text-white" : "bg-white border"}`}>{f.label}</button>
              ))}
            </div>
          </>
        )}
        <div className="space-y-3">
          {items.filter((req) => {
            if (statusFilter !== "all" && req.status !== statusFilter && !(statusFilter === "published" && req.status === "partially_funded")) return false;
            const hay = `${req.title || ""} ${req.location || ""} ${req.category || ""} ${req.id || ""}`.toLowerCase();
            return hay.includes(q.trim().toLowerCase());
          }).map((req) => (
            <details
              key={req.id}
              className="rounded-2xl bg-white border border-[#0D3B3B]/08"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
                <span className="font-display font-bold text-[#0D3B3B]">{req.title}</span>
                <span className="text-xs font-semibold text-[#0D3B3B]/50">{formatSeekStatus(req.status)}</span>
              </summary>
              <div className="px-5 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#1BAA9C]">
                  {req.category}
                </span>
                <span className="text-xs font-semibold text-[#0D3B3B]/50">
                  {formatSeekStatus(req.status)}
                </span>
              </div>
              <h2 className="font-display font-bold text-lg text-[#0D3B3B] mb-1">
                {req.title}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-[#0D3B3B]/55 mb-3">
                <MapPin size={14} /> {req.location}
              </p>
              {req.amountNeeded ? (
                <div className="mb-4">
                  <ProgressBar raised={req.amountRaised} needed={req.amountNeeded} />
                </div>
              ) : null}
              <div className="mb-5 rounded-2xl bg-[#F2F5F3] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#0D3B3B]/45 mb-3">Request journey</p>
                <div className="grid grid-cols-5 gap-1">
                  {[['pending_review','Submitted'],['published','Published'],['partially_funded','Help started'],['fulfilled','Need met'],['closed','Closed']].map(([id,label], index) => {
                    const order = {pending_review:0,verification_required:0,published:1,partially_funded:2,matched:2,fulfilled:3,closed:4,rejected:-1};
                    const current = order[req.status] ?? 0;
                    const active = current >= index && req.status !== 'rejected';
                    return <div key={id} className="text-center"><div className={`mx-auto h-2 rounded-full ${active ? 'bg-[#1BAA9C]' : 'bg-[#0D3B3B]/10'}`}></div><span className={`mt-1 block text-[9px] leading-tight ${active ? 'text-[#0D3B3B] font-semibold' : 'text-[#0D3B3B]/40'}`}>{label}</span></div>;
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPage(`request:${req.id}`);
                    window.history.pushState({}, "", `/request/${req.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="text-sm font-semibold text-[#1BAA9C] hover:underline"
                >
                  View public page
                </button>
                {req.status === "rejected" && (
                  <button
                    type="button"
                    disabled={deletingId === req.id}
                    onClick={async () => {
                      if (!window.confirm("Delete this request? This will permanently remove the request from your account. Thank-you notes are not removed.")) return;
                      setDeletingId(req.id);
                      try {
                        await deleteRejectedRequest(req.id);
                        setItems((prev) => prev.filter((item) => item.id !== req.id));
                      } catch (err) {
                        setError(err.message || "Could not delete this request.");
                      } finally {
                        setDeletingId("");
                      }
                    }}
                    className="text-sm font-semibold text-red-700 hover:underline"
                  >
                    {deletingId === req.id ? "Deleting…" : "Delete request"}
                  </button>
                )}
              </div>
              {["published", "partially_funded"].includes(req.status) && (
                <RequestEvidencePostForm requestId={req.id} />
              )}
              {req.status === "fulfilled" && (
                <RequesterUpdateForm
                  requestId={req.id}
                  existing={req.publicUpdate}
                  existingMedia={req.appreciationUrl}
                  onSaved={(text) => {
                    setItems((prev) => prev.map((item) => item.id === req.id ? { ...item, publicUpdate: text } : item));
                  }}
                />
              )}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- App ---------------- */

const SEEK_SHOP = [
  { id: "merch-cap", title: "SEEK Cap", price: 15000, note: "Deep teal. Official mark.", sizes: ["One size"], image: "/shop/seek-cap.png", fallback: "/shop/Cap.png" },
  { id: "merch-tee", title: "SEEK T-Shirt", price: 18000, note: "Black cotton. ASK. SEEK. FIND.", sizes: ["S", "M", "L", "XL"], image: "/shop/seek-tee.png", fallback: "/shop/Tee.png" },
  { id: "merch-hoodie", title: "SEEK Hoodie", price: 35000, note: "Black. Mark on chest, line on back.", sizes: ["S", "M", "L", "XL"], image: "/shop/seek-hoodie.png", fallback: "/shop/Hoodie.png" },
  { id: "merch-tote", title: "SEEK Tote Bag", price: 12000, note: "Everyday bag. Official mark.", sizes: ["One size"], image: "/shop/seek-tote-bag.png" },
  { id: "merch-bottle", title: "SEEK Water Bottle", price: 18000, note: "Reusable bottle.", sizes: ["One size"], image: "/shop/seek-water-bottle.png" },
  { id: "merch-backpack", title: "SEEK Backpack", price: 40000, note: "Daily pack. Official mark.", sizes: ["One size"], image: "/shop/seek-backpack.png" },
  { id: "merch-notebook", title: "SEEK Notebook", price: 10000, note: "For notes on the field.", sizes: ["One size"], image: "/shop/seek-notebook.png" },
  { id: "merch-vest", title: "SEEK Volunteer Vest", price: 25000, note: "For outreach days.", sizes: ["S", "M", "L", "XL"], image: "/shop/seek-volunteer-vest.png" },
  { id: "merch-umbrella", title: "SEEK Umbrella", price: 20000, note: "Official mark.", sizes: ["One size"], image: "/shop/seek-umbrella.png" },
  { id: "merch-mug", title: "SEEK Mug", price: 8000, note: "Official mark.", sizes: ["One size"], image: "/shop/seek-mug.png" },
];

function ShopPage({ setPage }) {
  const session = getUserSession();
  const [item, setItem] = useState(null);
  const [size, setSize] = useState("");
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ background: C.bg }}>
      <section className="mx-auto max-w-3xl px-5 pt-12 pb-28">
        <SectionLabel>Shop</SectionLabel>
        <h1 className="font-display font-extrabold text-4xl text-[#0D3B3B]">Wear SEEK. Support outreach.</h1>
        <p className="mt-3 font-body text-[#0D3B3B]/70 max-w-xl">
          Official SEEK items. You pay through Paystack. We post to the address you give. Part of each sale supports BSN outreach — Food Drive, Pad a Girl Child, Hospital Visitation, and Back to School.
        </p>
        <p className="mt-2 text-sm text-[#0D3B3B]/50">This is not a gift exchange between neighbours. SEEK fulfils the order. Collection from ₦10,000.</p>

        <div className="mt-8 grid gap-3">
          {SEEK_SHOP.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => { setItem(row); setSize(row.sizes[0]); setError(""); }}
              className="rounded-3xl border border-[#0D3B3B]/10 bg-white overflow-hidden text-left"
            >
              <div className="bg-[#101415] px-3 pt-3">
                <img
                  src={row.image}
                  alt={row.title}
                  className="w-full h-auto max-h-[22rem] object-contain object-center rounded-2xl"
                  onError={(e) => {
                    if (row.fallback && e.currentTarget.src.indexOf(row.fallback) === -1) {
                      e.currentTarget.src = row.fallback;
                    } else {
                      e.currentTarget.src = SEEK_FACE;
                    }
                  }}
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-bold text-xl text-[#0D3B3B]">{row.title}</p>
                  <p className="shrink-0 font-display font-extrabold text-xl text-[#1BAA9C]">₦{row.price.toLocaleString()}</p>
                </div>
                <p className="mt-1 text-sm text-[#0D3B3B]/55">{row.note}</p>
                <p className="mt-3 text-sm font-bold text-[#0D3B3B]">Order</p>
              </div>
            </button>
          ))}
        </div>
        <button type="button" className="mt-8 text-sm font-semibold text-[#1BAA9C]" onClick={() => setPage("give")}>Give to a request instead</button>
      </section>

      {item && (
        <div className="fixed inset-0 z-[180] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => !loading && setItem(null)}>
          <form
            className="w-full max-w-sm rounded-2xl bg-[#101415] text-white p-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              try {
                if (!name.trim() || !email.trim() || !phone.trim() || !address.trim() || !city.trim()) {
                  throw new Error("Name, email, phone, city and address are needed to post the item.");
                }
                const result = await initializeDonation({
                  amount: item.price,
                  email: email.trim(),
                  campaignId: null,
                  donorName: `${name.trim()} · ${item.title} [${item.id}] · ${size} · ${city.trim()} · ${address.trim()} · ${phone.trim()}`,
                  coverFee: true,
                  callbackUrl: `${window.location.origin}/shop`,
                });
                if (!result?.authorization_url) throw new Error("Paystack did not open.");
                window.location.href = result.authorization_url;
              } catch (err) {
                setError(err.message || "Could not start payment.");
                setLoading(false);
              }
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8DE3C5]">Order</p>
            <h2 className="font-display font-bold text-lg mt-1">{item.title} · ₦{item.price.toLocaleString()}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.sizes.map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${size === s ? "bg-[#1BAA9C] text-white" : "bg-white/10"}`}>{s}</button>
              ))}
            </div>
            <input className="mt-3 w-full rounded-xl bg-white text-[#101415] p-3 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="mt-2 w-full rounded-xl bg-white text-[#101415] p-3 text-sm" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="mt-2 w-full rounded-xl bg-white text-[#101415] p-3 text-sm" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="mt-2 w-full rounded-xl bg-white text-[#101415] p-3 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <textarea className="mt-2 w-full rounded-xl bg-white text-[#101415] p-3 text-sm" rows={2} placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="mt-3 w-full rounded-full bg-[#1BAA9C] py-3 text-sm font-bold">{loading ? "Opening Paystack…" : "Pay ₦" + item.price.toLocaleString()}</button>
            <button type="button" className="mt-2 w-full text-sm text-white/60" onClick={() => !loading && setItem(null)}>Close</button>
          </form>
        </div>
      )}
    </div>
  );
}

function LiveTicker() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [reqRows, offerRows, stats, gifts] = await Promise.all([
          listPublishedRequests(6).catch(() => []),
          listPublicOffers().catch(() => []),
          getSeekLiveStats().catch(() => null),
          listRecentGifts(8).catch(() => []),
        ]);
        const disasters = [];
        const nigeria = [];
        const giftBits = (Array.isArray(gifts) ? gifts : []).map((g) => {
          const raw = String(g.donor_name || "");
          const parts = raw.split("·").map((s) => s.replace(/\[.*?\]/g, "").trim()).filter(Boolean);
          const who = g.anonymous || !parts[0] || /^anon/i.test(parts[0]) ? "A neighbour" : parts[0];
          const purpose = parts.slice(1).join(" · ") || "a SEEK request";
          return who + " sent ₦" + Math.round(Number(g.amount) || 0).toLocaleString() + " for " + purpose + " · " + daysPosted(g.created_at);
        });
        const bits = [
          stats?.raised ? ("SEEK GIFTS · ₦" + Math.round(stats.raised).toLocaleString() + " from " + stats.donationCount + " gifts") : null,
          ...giftBits,
          ...(Array.isArray(reqRows) ? reqRows : []).map((r) => (CONNECT_CATS.includes(r.category) ? "CELEBRATE · " : "SEEK REQUEST · ") + (r.title || r.need || r.category || "Open request") + " · " + daysPosted(r.created_at || r.createdAt)),
          ...(Array.isArray(offerRows) ? offerRows : []).slice(0, 5).map((o) => "GIVEAWAY · " + String(o.description || o.category || "Open giveaway").slice(0, 70) + " · " + daysPosted(o.created_at || o.createdAt)),
          ...(Array.isArray(disasters) ? disasters : []).map((name) => "GLOBAL CRISIS · " + name),
          ...(Array.isArray(nigeria) ? nigeria : []).map((name) => "NIGERIA · " + name),
        ].filter(Boolean);
        if (!cancelled) setItems(bits.filter(Boolean));
      } catch (_e) {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  if (!items.length) return <div className="h-0" />;
  return (
    <>
    <div className="fixed top-16 inset-x-0 z-[120] border-b border-[#0D3B3B]/8 bg-[#0D3B3B] text-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1">
        <span className="seek-live-blink shrink-0 text-[9px] font-semibold uppercase tracking-widest bg-[#63C167] text-[#0D3B3B] px-1.5 py-0.5 rounded">Live</span>
        <div className="overflow-hidden flex-1">
          <div className="seek-ticker-track">
            {[...items, ...items].map((item, i) => (
              <span key={i} className="text-xs font-body text-white/80">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
    <div className="h-8" aria-hidden="true" />
    </>
  );
}


function pageFromPath(pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/admin") return "admin";
  if (path === "/volunteer") return "volunteer";
  if (path === "/give") return "give";
  if (path === "/for-you") return "for-you";
  if (path === "/discover") return "discover";
  if (path === "/offers") return "offers";
  if (path === "/seek-help") return "seek-help";
  if (path === "/seek-help/request") return "seek-help-form";
  if (path === "/celebrate") return "celebrate";
  if (path === "/celebrate/request") return "celebrate-request";
  if (path === "/language") return "language";
  if (path === "/about") return "about";
  if (path === "/shop") return "shop";
  if (path === "/organisations") return "organisations";
  if (path === "/impact") return "impact";
  if (path.startsWith("/impact/")) return "impact:" + path.split("/")[2];
  if (path === "/privacy") return "privacy";
  if (path === "/terms") return "terms";
  if (path === "/guidelines") return "guidelines";
  if (path === "/contact") return "contact";
  if (path === "/my-requests") return "my-requests";
  if (path === "/notifications") return "notifications";
  if (path === "/dashboard" || path === "/my-seek") return "my-seek";
  if (path === "/account") return "account";
  if (path.startsWith("/member/")) return "member:" + path.split("/")[2];
  if (path.startsWith("/request/")) return "request:" + path.split("/")[2];
  return "home";
}

function pathFromPage(page) {
  const id = String(page || "home");
  if (id.startsWith("request:")) return "/request/" + id.split(":")[1];
  if (id.startsWith("impact:") && id !== "impact") return "/impact/" + id.split(":")[1];
  if (id.startsWith("member:")) return "/member/" + id.split(":")[1];
  const map = {
    home: "/",
    "for-you": "/for-you",
    discover: "/discover",
    give: "/give",
    offers: "/offers",
    admin: "/admin",
    "seek-help": "/seek-help",
    "seek-help-form": "/seek-help/request",
    celebrate: "/celebrate",
    "celebrate-request": "/celebrate/request",
    volunteer: "/volunteer",
    about: "/about",
    shop: "/shop",
    organisations: "/organisations",
    impact: "/impact",
    privacy: "/privacy",
    language: "/language",
    terms: "/terms",
    guidelines: "/guidelines",
    contact: "/contact",
    "my-requests": "/my-requests",
    notifications: "/notifications",
    "my-seek": "/dashboard",
    account: "/account",
  };
  return map[id] || "/";
}

try { applySeekTheme(getSeekTheme()); } catch (_e) {}


function SeekMobileBottomNav({ page, setPage, userSession }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const go = (id) => {
    setComposerOpen(false);
    setPage(id);
    window.scrollTo(0, 0);
  };

  const items = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "discover", label: "Discover", icon: Search },
    { id: "notifications", label: "Inbox", icon: Bell, action: () => go(userSession?.access_token ? "notifications" : "account") },
    { id: "my-seek", label: "My SEEK", icon: User, action: () => go(userSession?.access_token ? "my-seek" : "account") },
  ];

  const actions = [
    { id: "seek-help", label: "Ask for Help", note: "Tell SEEK what you need", icon: HeartHandshake },
    { id: "give", label: "Give Support", note: "Help a person or cause", icon: HandHeart },
    { id: "offers", label: "Create Giveaway", note: "Offer goods or support", icon: Package },
    { id: "offers-job", label: "Offer a Job", note: "Create a job opportunity", icon: Briefcase, filter: "Job opportunity" },
    { id: "offers-mentorship", label: "Offer Mentorship", note: "Share your experience", icon: Users, filter: "Mentorship" },
    { id: "celebrate", label: "Connect & Celebrate", note: "Connect with people and moments", icon: Users },
  ];

  const openAction = (item) => {
    if (item.filter) {
      try { sessionStorage.setItem("seek_offer_filter", item.filter); } catch (_e) {}
    }
    go(item.id === "offers-job" || item.id === "offers-mentorship" ? "offers" : item.id);
  };

  return (
    <>
      {composerOpen && (
        <div className="fixed inset-0 z-[140] lg:hidden" role="dialog" aria-modal="true" aria-label="SEEK quick actions">
          <button type="button" aria-label="Close quick actions" className="absolute inset-0 bg-[#0D3B3B]/35 backdrop-blur-[2px]" onClick={() => setComposerOpen(false)} />
          <div className="absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] rounded-3xl bg-[#101415] p-4 shadow-2xl border border-white/10 text-white">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#8DE3C5]">SEEK</p>
                <h2 className="font-display font-extrabold text-xl text-white">What would you like to do?</h2>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} className="h-9 w-9 rounded-full bg-white/15 text-white text-xl leading-none" aria-label="Close">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {actions.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => openAction(item)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 active:scale-[0.98] transition">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white"><Icon size={18} /></span>
                    <span className="mt-2 block text-sm font-bold text-white">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-white/60">{item.note}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[100] lg:hidden border-t border-white/10 bg-[#101415]/[0.97] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="SEEK mobile navigation">
        <div className="relative mx-auto flex h-[4.35rem] max-w-xl items-center justify-around px-3">
          {items.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} type="button" onClick={() => item.action ? item.action() : go(item.id)} className={`flex min-w-[4rem] flex-col items-center justify-center gap-1 py-2 ${active ? "text-white" : "text-white/55"}`} aria-label={item.label}>
                <Icon size={25} strokeWidth={active ? 2.6 : 2} />
                <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
              </button>
            );
          })}

          <div className="w-16 shrink-0" aria-hidden="true" />

          {items.slice(2).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => item.action()} className="flex min-w-[4rem] flex-col items-center justify-center gap-1 py-2 text-white/55" aria-label={item.label}>
                <Icon size={25} strokeWidth={2} />
                <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
              </button>
            );
          })}

          <button type="button" onClick={() => setComposerOpen((v) => !v)} aria-label={composerOpen ? "Close SEEK actions" : "Create or ask on SEEK"} aria-expanded={composerOpen} className={`absolute left-1/2 top-[-1.9rem] -translate-x-1/2 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[5px] border-[#101415] bg-[#1BAA9C] text-white shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-transform ${composerOpen ? "rotate-45 scale-95" : "hover:scale-105"}`}>
            <Plus size={35} strokeWidth={2.2} />
          </button>
        </div>
      </nav>
    </>
  );
}


function CookieBanner() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem("seek_cookie_consent");
    } catch {
      return true;
    }
  });

  if (!open) return null;

  const saveConsent = (value) => {
    try {
      localStorage.setItem("seek_cookie_consent", value);
    } catch (_e) {}
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[84px] sm:px-4 sm:pb-4">
      <div className="relative mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0D3B3B] p-4 pr-12 text-white shadow-2xl sm:p-5 sm:pr-14">
        <button
          type="button"
          aria-label="Close privacy notice"
          onClick={() => saveConsent("necessary")}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <span aria-hidden="true">×</span>
        </button>

        <p className="m-0 pr-1 font-body text-sm leading-6 text-white/95 sm:text-[15px]">
          We value your privacy. SEEK uses cookies and similar technologies to keep the platform secure, remember your preferences, understand how the platform is used, and support relevant services.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0D3B3B]"
            onClick={() => saveConsent("1")}
          >
            Accept all
          </button>
          <button
            type="button"
            className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={() => saveConsent("necessary")}
          >
            Necessary only
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallSeekPrompt() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("seek_install_seen") === "1"; } catch { return false; }
  });
  const [msg, setMsg] = useState("");
  const [installEvent, setInstallEvent] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (hidden) return null;
  return (
    <div className="mx-auto max-w-3xl px-5 pb-4">
      <div className="rounded-2xl border border-[#0D3B3B]/10 bg-white p-4">
        <p className="font-body text-sm text-[#0D3B3B]">Install Seek on your home screen and allow alerts when help or a giveaway needs you.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-full bg-[#0D3B3B] text-white px-4 py-2 text-sm font-semibold" onClick={async () => {
            try { await enableSeekPush(); setMsg("Alerts allowed."); } catch (err) { setMsg(err.message || "Allow notifications when the browser asks."); }
          }}>Enable alerts</button>
          <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={async () => {
            if (installEvent) {
              installEvent.prompt();
              await installEvent.userChoice.catch(() => null);
              setInstallEvent(null);
              setMsg("Follow the install sheet.");
            } else {
              setMsg("Chrome menu → Add to Home screen. iPhone: Share → Add to Home Screen.");
            }
          }}>Install Seek</button>
          <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => { try { localStorage.setItem("seek_install_seen", "1"); } catch (_e) {} setHidden(true); }}>Not now</button>
        </div>
        {msg && <p className="mt-2 text-xs text-[#1BAA9C]">{msg}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPageState] = useState(() => pageFromPath(window.location.pathname));
  const setPage = (id) => {
    setPageState(id);
    const url = pathFromPage(id);
    const current = window.location.pathname.replace(/\/+$/, "") || "/";
    const next = url.replace(/\/+$/, "") || "/";
    if (current !== next) {
      window.history.pushState({ seekPage: id }, "", url);
    }
  };

  const [userSession, setUserSession] = useState(() => getUserSession());
  useEffect(() => {
    (async () => {
      const fromGoogle = await captureAuthRedirect().catch(() => null);
      if (fromGoogle?.access_token) {
        setUserSession(fromGoogle);
        return;
      }
      const refreshed = await refreshUserSession().catch(() => null);
      if (refreshed?.access_token) setUserSession(refreshed);
    })();
  }, []);
  const [paymentReturn, setPaymentReturn] = useState({ status: "idle", message: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference || !reference.startsWith("SEEK-")) return;

    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) setPaymentReturn({ status: "checking", message: "Confirming your donation…" });
        const result = await verifyDonation(reference);
        if (!cancelled) {
          const forRequest = result?.request_id || result?.requestId || result?.donation?.request_id;
          const outreachId = params.get("outreach");
          const amount = result?.amount ?? result?.donation?.amount;
          const verified = result?.verified || result?.ok || result?.donation?.status === "successful";
          const successMsg = forRequest
            ? `Your donation${amount ? " of ₦" + Number(amount).toLocaleString() : ""} has been confirmed for that request. Thank you.`
            : `Your donation${amount ? " of ₦" + Number(amount).toLocaleString() : ""} has been confirmed. Thank you for giving.`;
          setPaymentReturn({
            status: verified ? "success" : "pending",
            message: verified
              ? successMsg
              : (result?.error || "Paystack received this payment, but Seek is still confirming it. You can close this and check back shortly."),
            requestId: forRequest || null,
            outreachId: outreachId || null,
          });
        }
      } catch (error) {
        if (!cancelled) setPaymentReturn({ status: "failed", message: error?.message || "Payment verification failed." });
      } finally {
        if (!cancelled) {
          const keep = new URLSearchParams();
          const o = params.get("outreach");
          if (o) keep.set("outreach", o);
          const q = keep.toString();
          const cleanUrl = `${window.location.pathname}${q ? "?" + q : ""}${window.location.hash}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onPop = () => setPageState(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const nodes = document.querySelectorAll("section, footer > div, .rounded-3xl");
    nodes.forEach((node) => node.classList.add("seek-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [page]);

  const pages = {
    home: <HomePage setPage={setPage} userSession={userSession} />,
    "for-you": <ForYouPage setPage={setPage} />,
    discover: <DiscoverPage setPage={setPage} />,
    give: <GivePage setPage={setPage} />,
    offers: <OffersPage setPage={setPage} />,
    jobs: <OffersPage setPage={setPage} />,
    mentorship: <OffersPage setPage={setPage} />,
    counselling: <OffersPage setPage={setPage} />,
    more: <CelebratePage setPage={setPage} />,
    admin: <AdminPage />,
    "seek-help": <SeekHelpPage setPage={setPage} />,
    "seek-help-form": <SeekHelpRequestPage />,
    celebrate: <CelebratePage setPage={setPage} />,
    "celebrate-request": <CelebrateRequestPage setPage={setPage} />,
    volunteer: <VolunteerPage />,
    about: <AboutPage setPage={setPage} />,
    shop: <ShopPage setPage={setPage} />,
    organisations: <OrganisationsPage setPage={setPage} />,
    impact: <ImpactPage setPage={setPage} />,
    privacy: <LegalPage title="Privacy" setPage={setPage} />,
    language: <LanguagePage setPage={setPage} />,
    terms: <LegalPage title="Terms" setPage={setPage} />,
    guidelines: <LegalPage title="Guidelines" setPage={setPage} />,
    contact: <ContactPage />,
    account: (
      <AccountPage
        setPage={setPage}
        userSession={userSession}
        setUserSession={setUserSession}
      />
    ),
    "my-requests": (
      <MyRequestsPage setPage={setPage} userSession={userSession} />
    ),
    "my-seek": (
      <MySeekDashboard setPage={setPage} userSession={userSession} />
    ),
    notifications: (
      <NotificationsPage setPage={setPage} userSession={userSession} />
    ),
  };

  const isRequestPage = typeof page === "string" && page.startsWith("request:");
  const requestId = isRequestPage ? page.split(":")[1] : null;
  const isImpactStory = typeof page === "string" && page.startsWith("impact:") && page !== "impact";
  const isMemberPage = typeof page === "string" && page.startsWith("member:");
  const memberId = isMemberPage ? page.split(":")[1] : null;
  const impactId = isImpactStory ? page.split(":")[1] : null;

  const gatedPages = ["seek-help-form", "celebrate-request", "my-requests", "my-seek"];
  const needsUserGate = !userSession?.access_token && gatedPages.includes(page);

  return (
    <div className="font-body min-h-screen pb-28 lg:pb-0" style={{ background: C.white, color: C.ink }}>
      {FONTS}
      <Navbar page={page} setPage={setPage} userSession={userSession} />
      <FeatureStrip page={page} setPage={setPage} />
      <CookieBanner />
      <InstallSeekPrompt />
      <LiveTicker />

      <link rel="preconnect" href={import.meta.env.VITE_SUPABASE_URL || ""} />
      <link rel="dns-prefetch" href={import.meta.env.VITE_SUPABASE_URL || ""} />

      <div
        key={page}
        className="animate-[seekFade_0.45s_ease-out]"
        onTouchStart={(e) => {
          if (window.innerWidth >= 1024) return;
          if (!SWIPE_SEQ.includes(page)) return;
          const tch = e.changedTouches[0];
          window.__seekSwipe = { x: tch.clientX, y: tch.clientY, t: Date.now() };
        }}
        onTouchEnd={(e) => {
          const s = window.__seekSwipe;
          window.__seekSwipe = null;
          if (!s || window.innerWidth >= 1024) return;
          if (!SWIPE_SEQ.includes(page)) return;
          const tch = e.changedTouches[0];
          const dx = tch.clientX - s.x;
          const dy = tch.clientY - s.y;
          if (Math.abs(dy) > 36) return;
          if (Math.abs(dx) < 120 || Math.abs(dx) < Math.abs(dy) * 2.2) return;
          if (Date.now() - s.t > 500) return;
          if (page === "for-you" && Math.abs(dy) > 18) return;
          const i = SWIPE_SEQ.indexOf(page);
          const next = dx < 0 ? SWIPE_SEQ[i + 1] : SWIPE_SEQ[i - 1];
          if (next) setPage(next);
        }}
      >
      <ErrorBoundary>
      <Suspense fallback={<div className="min-h-[30vh]" />}>
      {needsUserGate ? (
        <AccountPage setPage={setPage} userSession={userSession} setUserSession={setUserSession} />
      ) : isRequestPage ? (
        <RequestPage requestId={requestId} setPage={setPage} />
      ) : isMemberPage ? (
        <MemberPage memberId={memberId} setPage={setPage} />
      ) : isImpactStory ? (
        <ImpactStoryPage impactId={impactId} setPage={setPage} />
      ) : (
        pages[page] || pages.home
      )}
      </Suspense>
      </ErrorBoundary>
      </div>

      {paymentReturn.status !== "idle" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="font-body text-sm font-semibold text-[#0D3B3B]">
              {paymentReturn.status === "checking"
                ? "Confirming your donation"
                : paymentReturn.status === "success"
                  ? "Donation confirmed"
                  : "Still confirming"}
            </p>
            <p className="mt-2 font-body text-sm text-[#0D3B3B]/70">
              {paymentReturn.message}
            </p>
            {paymentReturn.status === "success" && (
              <ShopSupportStrip setPage={(id) => { setPaymentReturn({ status: "idle", message: "" }); setPage(id); }} tone="modal" />
            )}
            {paymentReturn.status !== "checking" && (
              <div className="mt-4 flex justify-center gap-3">
                {paymentReturn.requestId && (
                  <button
                    type="button"
                    className="rounded-xl bg-[#0D3B3B] text-white px-4 py-2 text-sm"
                    onClick={() => {
                      setPaymentReturn({ status: "idle", message: "" });
                      setPage(`request:${paymentReturn.requestId}`);
                      window.history.pushState({}, "", `/request/${paymentReturn.requestId}`);
                    }}
                  >
                    View request
                  </button>
                )}
                {paymentReturn.outreachId && (
                  <button
                    type="button"
                    className="rounded-xl bg-[#0D3B3B] text-white px-4 py-2 text-sm"
                    onClick={() => {
                      setPaymentReturn({ status: "idle", message: "" });
                      setPage("give");
                      window.history.pushState({}, "", `/give?outreach=${encodeURIComponent(paymentReturn.outreachId)}`);
                    }}
                  >
                    View outreach
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm"
                  onClick={() => setPaymentReturn({ status: "idle", message: "" })}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <SeekMobileBottomNav page={page} setPage={setPage} userSession={userSession} />
      <Footer setPage={setPage} />
    </div>
  );
}
