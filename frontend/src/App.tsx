import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass, MapPin, MessageSquare, Calendar, Wallet, Bell, Compass as ExploreIcon,
  Plus, Users, Settings, LogOut, Sun, Moon, Search, Check, X, Share2, Shield,
  Navigation, Clock, Send, Paperclip, Smile, Trash2, Edit3, Reply, Eye, EyeOff,
  ChevronRight, ChevronUp, ChevronDown, ArrowRight, Filter, Star, Bookmark,
  CheckCircle2, AlertTriangle, RefreshCw, Copy, Key, UserPlus, Crown, Layers,
  PieChart as PieChartIcon, BarChart3, Sliders, Lock, Unlock, Play, Square,
  FileText, Image as ImageIcon, DollarSign, Percent, Hash, Sparkles, Server,
  Database, Code2, Terminal, Activity, Globe, Phone, Mail, Award
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, Legend
} from 'recharts';

// ============================================================================
// TYPES & DOMAIN MODELS (Aligned with 24-Table PostgreSQL + PostGIS Schema)
// ============================================================================

export type UserRole = 'USER' | 'TRIP_ADMIN' | 'PLATFORM_ADMIN';
export type MemberRole = 'TRIP_ADMIN' | 'MEMBER';
export type SplitMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES' | 'UNEQUAL';
export type ExpenseCategory =
  | 'ACCOMMODATION' | 'FOOD' | 'TRANSPORTATION' | 'FUEL'
  | 'FLIGHTS' | 'TRAIN_TICKETS' | 'ACTIVITIES' | 'SHOPPING' | 'MISCELLANEOUS';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  username: string;
  avatar: string;
  phone: string;
  preferredCurrency: 'INR' | 'USD' | 'EUR' | 'JPY';
  country: string;
  role: UserRole;
  travelPreferences: string[];
  createdAt: string;
  online: boolean;
}

export interface TripMember {
  userId: string;
  memberRole: MemberRole;
  status: 'JOINED' | 'INVITED' | 'LEFT';
  canEditItinerary: boolean;
  canInviteMembers: boolean;
  joinedAt: string;
}

export interface TripInvitation {
  id: string;
  tripId: string;
  email: string;
  invitedByUserId: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface TripActivityLog {
  id: string;
  tripId: string;
  actorUserId: string;
  actionType: string;
  summary: string;
  timestamp: string;
}

export interface ChatReaction {
  emoji: string;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  replyToId?: string;
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LOCATION' | 'DESTINATION' | 'ITINERARY' | 'EXPENSE';
  content: string;
  attachmentName?: string;
  sharedMeta?: {
    title: string;
    subtitle: string;
    badge: string;
  };
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ';
  isEdited: boolean;
  isDeleted: boolean;
  reactions: ChatReaction[];
  timestamp: string;
}

export interface LiveLocationSession {
  userId: string;
  tripId: string;
  isActive: boolean;
  audienceScope: 'ENTIRE_GROUP' | 'SELECTED_MEMBERS';
  allowedMemberIds: string[];
  durationMinutes: 15 | 60 | 480;
  remainingSeconds: number;
  lat: number;
  lng: number;
  xPct: number;
  yPct: number;
  accuracyMeters: number;
  batteryPct: number;
  speedKmh: number;
  lastUpdated: string;
}

export interface MapPinItem {
  id: string;
  tripId: string;
  name: string;
  category: 'DESTINATION' | 'HOTEL' | 'RESTAURANT' | 'ATTRACTION' | 'SAVED';
  xPct: number;
  yPct: number;
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  address: string;
  description: string;
  estimatedTimeFromPrev?: string;
  distanceFromPrevKm?: number;
  saved: boolean;
}

export interface ItineraryActivity {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  description: string;
  destinationName: string;
  startTime: string;
  endTime: string;
  category: 'TRANSPORT' | 'HOTEL' | 'FOOD' | 'SIGHTSEEING' | 'ADVENTURE';
  estimatedCost: number;
  assignedMemberIds: string[];
  bookingRef: string;
  notes: string;
  attachmentName?: string;
  completed: boolean;
  xPct: number;
  yPct: number;
}

export interface ExpenseSplitItem {
  userId: string;
  owedAmount: number;
  percentage: number;
  shares: number;
}

export interface ExpenseItem {
  id: string;
  tripId: string;
  title: string;
  description: string;
  amount: number;
  currency: 'INR' | 'USD' | 'EUR' | 'JPY';
  category: ExpenseCategory;
  splitMethod: SplitMethod;
  paidByUserId: string;
  date: string;
  receiptName?: string;
  notes?: string;
  splits: ExpenseSplitItem[];
}

export interface SettlementRecord {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: 'INR' | 'USD' | 'EUR' | 'JPY';
  status: 'COMPLETED' | 'PENDING';
  method: string;
  notes: string;
  settledAt: string;
}

export interface AppNotification {
  id: string;
  tripId?: string;
  category: 'TRIP' | 'ITINERARY' | 'CHAT' | 'EXPENSE' | 'LOCATION';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  targetTab: 'dashboard' | 'trips' | 'chat' | 'map' | 'itinerary' | 'expenses' | 'explore';
}

export interface Trip {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  startingLocation: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType: 'GROUP' | 'SOLO';
  visibility: 'PRIVATE' | 'PUBLIC';
  currency: 'INR' | 'USD' | 'EUR' | 'JPY';
  maxParticipants: number;
  tripCode: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  createdBy: string;
  members: TripMember[];
}

// ============================================================================
// CURRENCY HELPERS & BIGDECIMAL-EQUIVALENT EXACT CENT/PAISE ARITHMETIC ENGINE
// ============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  JPY: '¥',
};

function formatMoney(amount: number, currency: string = 'INR'): string {
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  const rounded = Math.round(amount * 100) / 100;
  return `${sym}${rounded.toLocaleString('en-IN', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Exact cent/paise integer arithmetic (mirrors Java BigDecimal scale=2 HALF_UP
 * with remainder distribution so splits ALWAYS sum to the exact original amount).
 */
export function calculateExactSplits(
  totalAmount: number,
  method: SplitMethod,
  participantIds: string[],
  customInputs: Record<string, number>
): { splits: ExpenseSplitItem[]; error: string | null } {
  if (totalAmount <= 0 || isNaN(totalAmount)) {
    return { splits: [], error: 'Expense amount must be greater than zero.' };
  }
  if (participantIds.length === 0) {
    return { splits: [], error: 'Select at least one participant for this expense.' };
  }

  const totalCents = Math.round(totalAmount * 100);
  const n = participantIds.length;

  if (method === 'EQUAL') {
    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents - baseCents * n;
    const splits = participantIds.map((uid, idx) => {
      const cents = baseCents + (idx < remainderCents ? 1 : 0);
      const owed = cents / 100;
      const pct = Math.round((cents / totalCents) * 10000) / 100;
      return { userId: uid, owedAmount: owed, percentage: pct, shares: 1 };
    });
    return { splits, error: null };
  }

  if (method === 'EXACT' || method === 'UNEQUAL') {
    let sumCents = 0;
    const splits: ExpenseSplitItem[] = [];
    for (const uid of participantIds) {
      const val = Number(customInputs[uid] ?? 0);
      const cents = Math.round(val * 100);
      sumCents += cents;
      splits.push({
        userId: uid,
        owedAmount: cents / 100,
        percentage: Math.round((cents / totalCents) * 10000) / 100,
        shares: 1,
      });
    }
    if (sumCents !== totalCents) {
      const diff = (totalCents - sumCents) / 100;
      return {
        splits,
        error: `Individual amounts sum to ${(sumCents / 100).toFixed(2)}, which is off by ${diff > 0 ? '+' : ''}${diff.toFixed(2)} from ${totalAmount.toFixed(2)}.`,
      };
    }
    return { splits, error: null };
  }

  if (method === 'PERCENTAGE') {
    let pctSum = 0;
    for (const uid of participantIds) {
      pctSum += Number(customInputs[uid] ?? 0);
    }
    if (Math.abs(pctSum - 100) > 0.01) {
      return {
        splits: [],
        error: `Percentages must add up to exactly 100% (currently ${pctSum.toFixed(2)}%).`,
      };
    }
    let allocatedCents = 0;
    const splits = participantIds.map((uid, idx) => {
      const pct = Number(customInputs[uid] ?? 0);
      let cents = Math.round((totalCents * pct) / 100);
      if (idx === n - 1) {
        cents = totalCents - allocatedCents;
      } else {
        allocatedCents += cents;
      }
      return { userId: uid, owedAmount: cents / 100, percentage: pct, shares: 1 };
    });
    return { splits, error: null };
  }

  // SHARES
  let totalShares = 0;
  for (const uid of participantIds) {
    totalShares += Math.max(0, Number(customInputs[uid] ?? 1));
  }
  if (totalShares <= 0) {
    return { splits: [], error: 'Total shares must be greater than zero.' };
  }
  let allocatedCents = 0;
  const splits = participantIds.map((uid, idx) => {
    const sh = Math.max(0, Number(customInputs[uid] ?? 1));
    let cents = Math.round((totalCents * sh) / totalShares);
    if (idx === n - 1) {
      cents = totalCents - allocatedCents;
    } else {
      allocatedCents += cents;
    }
    const pct = Math.round((cents / totalCents) * 10000) / 100;
    return { userId: uid, owedAmount: cents / 100, percentage: pct, shares: sh };
  });
  return { splits, error: null };
}

/**
 * Greedy Minimum-Cash-Flow Debt Simplification Algorithm
 * Reduces transitive chains (e.g. A owes B ₹1,000, B owes C ₹1,000 -> A pays C ₹1,000).
 */
export interface SimplifiedDebtTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export function simplifyGroupDebts(netBalances: Record<string, number>): SimplifiedDebtTransfer[] {
  const creditors: { userId: string; cents: number }[] = [];
  const debtors: { userId: string; cents: number }[] = [];

  Object.entries(netBalances).forEach(([userId, amount]) => {
    const cents = Math.round(amount * 100);
    if (cents > 0) creditors.push({ userId, cents });
    else if (cents < 0) debtors.push({ userId, cents: Math.abs(cents) });
  });

  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  const transfers: SimplifiedDebtTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settledCents = Math.min(debtor.cents, creditor.cents);

    if (settledCents > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: settledCents / 100,
      });
    }

    debtor.cents -= settledCents;
    creditor.cents -= settledCents;

    if (debtor.cents === 0) i++;
    if (creditor.cents === 0) j++;
  }

  return transfers;
}

// ============================================================================
// INITIAL SEED DATA (Development & Demonstration Seed State)
// ============================================================================

const COVER_LADAKH = "../public/images/ladakh_cover.png";
const COVER_KYOTO = "../public/images/kyoto_cover.png";
const COVER_AMALFI = "../public/images/amalfi_cover.png";

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u1',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@tripsync.io',
    username: 'aarav_explores',
    avatar: 'AS',
    phone: '+91 98201 44510',
    preferredCurrency: 'INR',
    country: 'India',
    role: 'TRIP_ADMIN',
    travelPreferences: ['High-Altitude Roadtrips', 'Specialty Coffee', 'Photography', 'Boutique Stays'],
    createdAt: '2025-02-14',
    online: true,
  },
  {
    id: 'u2',
    fullName: 'Priya Nair',
    email: 'priya.nair@tripsync.io',
    username: 'priya_wanderlust',
    avatar: 'PN',
    phone: '+91 98112 77823',
    preferredCurrency: 'INR',
    country: 'India',
    role: 'USER',
    travelPreferences: ['Culinary Trails', 'Cultural Heritage', 'Hiking'],
    createdAt: '2025-03-01',
    online: true,
  },
  {
    id: 'u3',
    fullName: 'Rohan Verma',
    email: 'rohan.verma@tripsync.io',
    username: 'rohan_rides',
    avatar: 'RV',
    phone: '+91 97654 31209',
    preferredCurrency: 'INR',
    country: 'India',
    role: 'USER',
    travelPreferences: ['Adventure Sports', 'Camping', 'Stargazing'],
    createdAt: '2025-03-19',
    online: true,
  },
  {
    id: 'u4',
    fullName: 'Ananya Patel',
    email: 'ananya.patel@tripsync.io',
    username: 'ananya_nomad',
    avatar: 'AP',
    phone: '+91 99204 11982',
    preferredCurrency: 'INR',
    country: 'India',
    role: 'USER',
    travelPreferences: ['Museums', 'Local Markets', 'Scenic Trains'],
    createdAt: '2025-04-08',
    online: false,
  },
  {
    id: 'u5',
    fullName: 'Kabir Mehta',
    email: 'kabir.mehta@tripsync.io',
    username: 'kabir_admin',
    avatar: 'KM',
    phone: '+91 98450 90871',
    preferredCurrency: 'INR',
    country: 'India',
    role: 'PLATFORM_ADMIN',
    travelPreferences: ['Glamping', 'Wildlife Safaris', 'Architecture'],
    createdAt: '2025-01-10',
    online: true,
  },
];

const INITIAL_TRIPS: Trip[] = [
  {
    id: 't1',
    name: 'Ladakh Himalayan Expedition',
    description: '7-day high-altitude overland journey across Leh, Nubra Valley, Khardung La, and Pangong Tso with our 5-person crew.',
    coverImage: COVER_LADAKH,
    startingLocation: 'Mumbai / Delhi IGI',
    destination: 'Leh, Nubra & Pangong Tso, Ladakh',
    startDate: '2026-11-05',
    endDate: '2026-11-12',
    tripType: 'GROUP',
    visibility: 'PRIVATE',
    currency: 'INR',
    maxParticipants: 8,
    tripCode: 'LADAKH26',
    status: 'ACTIVE',
    createdBy: 'u1',
    members: [
      { userId: 'u1', memberRole: 'TRIP_ADMIN', status: 'JOINED', canEditItinerary: true, canInviteMembers: true, joinedAt: '2026-10-01' },
      { userId: 'u2', memberRole: 'MEMBER', status: 'JOINED', canEditItinerary: true, canInviteMembers: true, joinedAt: '2026-10-02' },
      { userId: 'u3', memberRole: 'MEMBER', status: 'JOINED', canEditItinerary: true, canInviteMembers: false, joinedAt: '2026-10-02' },
      { userId: 'u4', memberRole: 'MEMBER', status: 'JOINED', canEditItinerary: true, canInviteMembers: false, joinedAt: '2026-10-03' },
      { userId: 'u5', memberRole: 'MEMBER', status: 'JOINED', canEditItinerary: true, canInviteMembers: true, joinedAt: '2026-10-04' },
    ],
  },
  {
    id: 't2',
    name: 'Kyoto Autumn & Sakura Heritage Trail',
    description: 'Exploring Arashiyama bamboo groves, Fushimi Inari shrines, Uji matcha houses, and historic Gion machiya stays.',
    coverImage: COVER_KYOTO,
    startingLocation: 'Kansai International (KIX)',
    destination: 'Kyoto & Nara, Japan',
    startDate: '2026-12-10',
    endDate: '2026-12-18',
    tripType: 'GROUP',
    visibility: 'PRIVATE',
    currency: 'INR',
    maxParticipants: 6,
    tripCode: 'KYOTO26',
    status: 'UPCOMING',
    createdBy: 'u2',
    members: [
      { userId: 'u2', memberRole: 'TRIP_ADMIN', status: 'JOINED', canEditItinerary: true, canInviteMembers: true, joinedAt: '2026-10-10' },
      { userId: 'u1', memberRole: 'MEMBER', status: 'JOINED', canEditItinerary: true, canInviteMembers: true, joinedAt: '2026-10-11' },
      { userId: 'u4', memberRole: 'MEMBER', status: 'JOINED', canEditItinerary: true, canInviteMembers: false, joinedAt: '2026-10-12' },
    ],
  },
  {
    id: 't3',
    name: 'Amalfi Coast Cliffside Odyssey',
    description: 'Solo coastal photography & lemon-grove trekking across Positano, Ravello, and Capri.',
    coverImage: COVER_AMALFI,
    startingLocation: 'Naples Centrale',
    destination: 'Positano & Ravello, Italy',
    startDate: '2027-04-15',
    endDate: '2027-04-21',
    tripType: 'SOLO',
    visibility: 'PUBLIC',
    currency: 'INR',
    maxParticipants: 1,
    tripCode: 'AMALFI27',
    status: 'UPCOMING',
    createdBy: 'u1',
    members: [
      { userId: 'u1', memberRole: 'TRIP_ADMIN', status: 'JOINED', canEditItinerary: true, canInviteMembers: true, joinedAt: '2026-10-15' },
    ],
  },
];

const INITIAL_ITINERARY: ItineraryActivity[] = [
  {
    id: 'act1',
    tripId: 't1',
    dayNumber: 1,
    title: 'Airport Pickup & Acclimatization Transfer',
    description: 'Touch down at Kushok Bakula Rimpochee Airport (IXL) and transfer in 4x4 SUVs to Leh boutique heritage stay.',
    destinationName: 'Kushok Bakula Airport, Leh',
    startTime: '08:00',
    endTime: '09:30',
    category: 'TRANSPORT',
    estimatedCost: 2400,
    assignedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    bookingRef: 'IXL-SUV-908',
    notes: 'Drink plenty of warm water; avoid strenuous walking on Day 1.',
    attachmentName: 'leh_transfer_voucher.pdf',
    completed: true,
    xPct: 22,
    yPct: 68,
  },
  {
    id: 'act2',
    tripId: 't1',
    dayNumber: 1,
    title: 'Hotel Check-in at The Grand Dragon Leh',
    description: 'Check in to mountain-view heated rooms, oxygen saturation check, and Kahwa welcome tea.',
    destinationName: 'The Grand Dragon, Old Road Leh',
    startTime: '10:00',
    endTime: '11:30',
    category: 'HOTEL',
    estimatedCost: 5000,
    assignedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    bookingRef: 'GDL-88219',
    notes: 'Early check-in confirmed with front desk.',
    completed: true,
    xPct: 34,
    yPct: 58,
  },
  {
    id: 'act3',
    tripId: 't1',
    dayNumber: 1,
    title: 'Ladakhi Artisanal Lunch at The Tibetan Kitchen',
    description: 'Authentic thukpa, steamed tingmo, and yak-cheese momos in central Leh.',
    destinationName: 'The Tibetan Kitchen, Fort Road',
    startTime: '12:00',
    endTime: '13:45',
    category: 'FOOD',
    estimatedCost: 3500,
    assignedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    bookingRef: 'RES-TK-12PM',
    notes: 'Table reserved on the sunny courtyard deck.',
    completed: false,
    xPct: 45,
    yPct: 49,
  },
  {
    id: 'act4',
    tripId: 't1',
    dayNumber: 1,
    title: 'Local Sightseeing: Shanti Stupa & Leh Palace Sunset',
    description: 'Gentle afternoon drive up to Shanti Stupa and 17th-century Leh Palace overlooking the Indus valley.',
    destinationName: 'Shanti Stupa, Changspa Hill',
    startTime: '14:00',
    endTime: '17:30',
    category: 'SIGHTSEEING',
    estimatedCost: 1500,
    assignedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    bookingRef: 'INNER-LINE-PERMIT-2026',
    notes: 'Bring wide-angle lenses and windproof jackets.',
    completed: false,
    xPct: 62,
    yPct: 36,
  },
  {
    id: 'act5',
    tripId: 't1',
    dayNumber: 1,
    title: 'Group Bonfire Dinner at Bon Appetit',
    description: 'Stargazing rooftop dinner with wood-fired trout, apricot crumble, and trip briefing.',
    destinationName: 'Bon Appetit Rooftop, Changspa',
    startTime: '19:00',
    endTime: '21:00',
    category: 'FOOD',
    estimatedCost: 4200,
    assignedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    bookingRef: 'BA-ROOF-7PM',
    notes: 'Settle Day 1 shared taxi and stay expenses after dinner.',
    completed: false,
    xPct: 78,
    yPct: 26,
  },
  {
    id: 'act6',
    tripId: 't1',
    dayNumber: 2,
    title: 'Khardung La Pass & Hunder Sand Dunes Drive',
    description: 'Ascend across Khardung La (17,582 ft) into Nubra Valley for double-humped Bactrian camel safari.',
    destinationName: 'Hunder Dunes, Nubra Valley',
    startTime: '07:30',
    endTime: '15:30',
    category: 'ADVENTURE',
    estimatedCost: 8500,
    assignedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    bookingRef: 'PRM-NUBRA-441',
    notes: 'Keep Inner Line Permits handy at South Pullu checkpost.',
    completed: false,
    xPct: 84,
    yPct: 18,
  },
];

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp1',
    tripId: 't1',
    title: 'Boutique Mountain Villa Accommodation (Leh)',
    description: '5-person group stay paid by Aarav (Person A) divided equally among all 5 members (₹1,000 each).',
    amount: 5000,
    currency: 'INR',
    category: 'ACCOMMODATION',
    splitMethod: 'EQUAL',
    paidByUserId: 'u1',
    date: '2026-10-29 10:15',
    receiptName: 'grand_dragon_invoice_5000.pdf',
    notes: 'Matches exact specification example: ₹5,000 split equally 5 ways = ₹1,000/person.',
    splits: [
      { userId: 'u1', owedAmount: 1000, percentage: 20, shares: 1 },
      { userId: 'u2', owedAmount: 1000, percentage: 20, shares: 1 },
      { userId: 'u3', owedAmount: 1000, percentage: 20, shares: 1 },
      { userId: 'u4', owedAmount: 1000, percentage: 20, shares: 1 },
      { userId: 'u5', owedAmount: 1000, percentage: 20, shares: 1 },
    ],
  },
  {
    id: 'exp2',
    tripId: 't1',
    title: '4x4 Expedition SUV Convoy & Inner Line Permits',
    description: 'Pre-booked 4x4 SUV deposit and wildlife/border permits paid by Priya.',
    amount: 4500,
    currency: 'INR',
    category: 'TRANSPORTATION',
    splitMethod: 'EQUAL',
    paidByUserId: 'u2',
    date: '2026-10-29 12:30',
    receiptName: 'ladakh_suv_permits.jpg',
    notes: 'Includes oxygen cylinder rental in vehicle.',
    splits: [
      { userId: 'u1', owedAmount: 900, percentage: 20, shares: 1 },
      { userId: 'u2', owedAmount: 900, percentage: 20, shares: 1 },
      { userId: 'u3', owedAmount: 900, percentage: 20, shares: 1 },
      { userId: 'u4', owedAmount: 900, percentage: 20, shares: 1 },
      { userId: 'u5', owedAmount: 900, percentage: 20, shares: 1 },
    ],
  },
  {
    id: 'exp3',
    tripId: 't1',
    title: 'Tibetan Kitchen Group Welcome Feast',
    description: 'Lunch and artisanal ginger-lemon honey teas paid by Rohan.',
    amount: 2500,
    currency: 'INR',
    category: 'FOOD',
    splitMethod: 'EQUAL',
    paidByUserId: 'u3',
    date: '2026-10-29 14:10',
    receiptName: 'tibetan_kitchen_bill.png',
    splits: [
      { userId: 'u1', owedAmount: 500, percentage: 20, shares: 1 },
      { userId: 'u2', owedAmount: 500, percentage: 20, shares: 1 },
      { userId: 'u3', owedAmount: 500, percentage: 20, shares: 1 },
      { userId: 'u4', owedAmount: 500, percentage: 20, shares: 1 },
      { userId: 'u5', owedAmount: 500, percentage: 20, shares: 1 },
    ],
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    tripId: 't1',
    senderId: 'u1',
    type: 'TEXT',
    content: 'Welcome to the Ladakh Himalayan Expedition channel! All Inner Line Permits for Nubra and Pangong Tso are uploaded to Day 1 & Day 2.',
    deliveryStatus: 'READ',
    isEdited: false,
    isDeleted: false,
    reactions: [
      { emoji: '🔥', userIds: ['u2', 'u3', 'u5'] },
      { emoji: '✈️', userIds: ['u4'] },
    ],
    timestamp: '09:42 AM',
  },
  {
    id: 'm2',
    tripId: 't1',
    senderId: 'u2',
    replyToId: 'm1',
    type: 'ITINERARY',
    content: 'Just confirmed our courtyard table at The Tibetan Kitchen for 12:00 PM! Sharing the activity card below:',
    sharedMeta: {
      title: 'Day 1 • 12:00 PM – The Tibetan Kitchen',
      subtitle: 'Fort Road, Leh • Est. ₹3,500',
      badge: 'ITINERARY ACTIVITY',
    },
    deliveryStatus: 'READ',
    isEdited: false,
    isDeleted: false,
    reactions: [{ emoji: '❤️', userIds: ['u1', 'u3'] }],
    timestamp: '10:05 AM',
  },
  {
    id: 'm3',
    tripId: 't1',
    senderId: 'u3',
    type: 'LOCATION',
    content: 'Sharing my live location from Leh Main Bazaar while picking up portable oxygen cans.',
    sharedMeta: {
      title: 'Live Location • Leh Main Bazaar (34.1642° N, 77.5848° E)',
      subtitle: 'Accuracy: ±6m • Battery: 88% • Active for 1 hr',
      badge: 'LIVE GPS',
    },
    deliveryStatus: 'READ',
    isEdited: false,
    isDeleted: false,
    reactions: [{ emoji: '👍', userIds: ['u1', 'u2'] }],
    timestamp: '10:18 AM',
  },
  {
    id: 'm4',
    tripId: 't1',
    senderId: 'u1',
    type: 'EXPENSE',
    content: 'Added the ₹5,000 Boutique Mountain Villa expense (split equally ₹1,000 each across all 5 of us).',
    sharedMeta: {
      title: 'Boutique Mountain Villa Accommodation • ₹5,000',
      subtitle: 'Paid by Aarav Sharma • Equal Split (₹1,000 / member)',
      badge: 'EXPENSE LEDGER',
    },
    deliveryStatus: 'READ',
    isEdited: false,
    isDeleted: false,
    reactions: [{ emoji: '🎉', userIds: ['u2', 'u5'] }],
    timestamp: '10:22 AM',
  },
];

const INITIAL_MAP_PINS: MapPinItem[] = [
  {
    id: 'pin1',
    tripId: 't1',
    name: 'Kushok Bakula Rimpochee Airport (IXL)',
    category: 'DESTINATION',
    xPct: 22,
    yPct: 68,
    lat: 34.1359,
    lng: 77.5465,
    rating: 4.6,
    reviewsCount: 3420,
    address: 'Airport Rd, Leh, Ladakh 194101',
    description: 'One of the highest commercial airports in the world at 3,256m elevation.',
    distanceFromPrevKm: 0,
    estimatedTimeFromPrev: 'Start Point',
    saved: true,
  },
  {
    id: 'pin2',
    tripId: 't1',
    name: 'The Grand Dragon Ladakh',
    category: 'HOTEL',
    xPct: 34,
    yPct: 58,
    lat: 34.1602,
    lng: 77.5809,
    rating: 4.8,
    reviewsCount: 2890,
    address: 'Old Road, Sheynam, Leh 194101',
    description: 'Solar-heated luxury heritage hotel overlooking Stok Kangri peaks.',
    distanceFromPrevKm: 4.8,
    estimatedTimeFromPrev: '14 mins drive',
    saved: true,
  },
  {
    id: 'pin3',
    tripId: 't1',
    name: 'The Tibetan Kitchen',
    category: 'RESTAURANT',
    xPct: 45,
    yPct: 49,
    lat: 34.1661,
    lng: 77.5837,
    rating: 4.7,
    reviewsCount: 4120,
    address: 'Fort Road, Leh 194101',
    description: 'Iconic Ladakhi & Tibetan dining spot famed for steaming thukpa and momos.',
    distanceFromPrevKm: 1.6,
    estimatedTimeFromPrev: '6 mins walk',
    saved: true,
  },
  {
    id: 'pin4',
    tripId: 't1',
    name: 'Shanti Stupa & Changspa Viewpoint',
    category: 'ATTRACTION',
    xPct: 62,
    yPct: 36,
    lat: 34.1736,
    lng: 77.5750,
    rating: 4.9,
    reviewsCount: 8940,
    address: 'Changspa Hill, Leh 194101',
    description: 'White-domed Buddhist chorten offering panoramic golden-hour views of Leh.',
    distanceFromPrevKm: 3.4,
    estimatedTimeFromPrev: '11 mins drive',
    saved: true,
  },
  {
    id: 'pin5',
    tripId: 't1',
    name: 'Pangong Tso High-Altitude Lake Camp',
    category: 'DESTINATION',
    xPct: 84,
    yPct: 18,
    lat: 33.7595,
    lng: 78.6674,
    rating: 4.9,
    reviewsCount: 15400,
    address: 'Spangmik, Pangong Tso, Ladakh 194101',
    description: 'Endorheic crystal-blue Himalayan lake at 4,225m stretching 134 km.',
    distanceFromPrevKm: 148.0,
    estimatedTimeFromPrev: '4 hrs 45 mins via Chang La',
    saved: true,
  },
  {
    id: 'pin6',
    tripId: 't1',
    name: 'Hemis Monastery & Museum',
    category: 'ATTRACTION',
    xPct: 72,
    yPct: 62,
    lat: 33.9126,
    lng: 77.7077,
    rating: 4.8,
    reviewsCount: 5230,
    address: 'Hemis, Ladakh 194101',
    description: '17th-century Drukpa Lineage monastery renowned for its annual masked Cham festival.',
    distanceFromPrevKm: 42.5,
    estimatedTimeFromPrev: '1 hr 10 mins drive',
    saved: false,
  },
  {
    id: 'pin7',
    tripId: 't2',
    name: 'Fushimi Inari Taisha Thousand Torii',
    category: 'ATTRACTION',
    xPct: 38,
    yPct: 44,
    lat: 34.9671,
    lng: 135.7727,
    rating: 4.9,
    reviewsCount: 42100,
    address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto',
    description: 'Sacred Shinto shrine famous for its vermilion Senbon Torii mountain trails.',
    distanceFromPrevKm: 5.2,
    estimatedTimeFromPrev: '12 mins JR Nara Line',
    saved: true,
  },
  {
    id: 'pin8',
    tripId: 't3',
    name: 'Spiaggia Grande & Cliffside Positano',
    category: 'DESTINATION',
    xPct: 52,
    yPct: 48,
    lat: 40.6281,
    lng: 14.4850,
    rating: 4.9,
    reviewsCount: 19800,
    address: 'Via del Brigantino, 84017 Positano SA, Italy',
    description: 'Pastel cliffside village cascading into the turquoise Tyrrhenian Sea.',
    distanceFromPrevKm: 0,
    estimatedTimeFromPrev: 'Ferry Pier',
    saved: true,
  },
];

const INITIAL_LIVE_LOCATIONS: LiveLocationSession[] = [
  {
    userId: 'u1',
    tripId: 't1',
    isActive: true,
    audienceScope: 'ENTIRE_GROUP',
    allowedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    durationMinutes: 60,
    remainingSeconds: 3420,
    lat: 34.1602,
    lng: 77.5809,
    xPct: 36,
    yPct: 55,
    accuracyMeters: 5,
    batteryPct: 94,
    speedKmh: 0,
    lastUpdated: 'Just now',
  },
  {
    userId: 'u2',
    tripId: 't1',
    isActive: true,
    audienceScope: 'ENTIRE_GROUP',
    allowedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    durationMinutes: 60,
    remainingSeconds: 2890,
    lat: 34.1661,
    lng: 77.5837,
    xPct: 46,
    yPct: 48,
    accuracyMeters: 7,
    batteryPct: 82,
    speedKmh: 4,
    lastUpdated: '18s ago',
  },
  {
    userId: 'u3',
    tripId: 't1',
    isActive: true,
    audienceScope: 'ENTIRE_GROUP',
    allowedMemberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    durationMinutes: 15,
    remainingSeconds: 740,
    lat: 34.1710,
    lng: 77.5780,
    xPct: 58,
    yPct: 39,
    accuracyMeters: 6,
    batteryPct: 88,
    speedKmh: 28,
    lastUpdated: '9s ago',
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    tripId: 't1',
    category: 'EXPENSE',
    title: 'New Expense Added: ₹5,000 Accommodation',
    body: 'Aarav Sharma added "Boutique Mountain Villa Accommodation (Leh)" (₹5,000). Your equal share is ₹1,000.',
    timestamp: '10 mins ago',
    isRead: false,
    targetTab: 'expenses',
  },
  {
    id: 'n2',
    tripId: 't1',
    category: 'LOCATION',
    title: 'Rohan Verma started sharing live location',
    body: 'Rohan is sharing live GPS coordinates with the Ladakh group for 15 minutes.',
    timestamp: '18 mins ago',
    isRead: false,
    targetTab: 'map',
  },
  {
    id: 'n3',
    tripId: 't1',
    category: 'ITINERARY',
    title: 'Upcoming Activity in 30 Minutes',
    body: 'Day 1 • 12:00 PM: Ladakhi Artisanal Lunch at The Tibetan Kitchen (Fort Road).',
    timestamp: '25 mins ago',
    isRead: false,
    targetTab: 'itinerary',
  },
  {
    id: 'n4',
    tripId: 't1',
    category: 'CHAT',
    title: 'Priya Nair replied to your message',
    body: '"Just confirmed our courtyard table at The Tibetan Kitchen for 12:00 PM!"',
    timestamp: '34 mins ago',
    isRead: true,
    targetTab: 'chat',
  },
  {
    id: 'n5',
    tripId: 't2',
    category: 'TRIP',
    title: 'Trip Reminder: Kyoto Heritage Trail',
    body: 'All 3 group members have verified passports and JR Pass reservations.',
    timestamp: '2 hours ago',
    isRead: true,
    targetTab: 'trips',
  },
];

const INITIAL_ACTIVITY_LOGS: TripActivityLog[] = [
  {
    id: 'log1',
    tripId: 't1',
    actorUserId: 'u1',
    actionType: 'EXPENSE_ADDED',
    summary: 'Aarav Sharma recorded ₹5,000 for Boutique Mountain Villa Accommodation (Equal split: ₹1,000/member).',
    timestamp: '10:22 AM',
  },
  {
    id: 'log2',
    tripId: 't1',
    actorUserId: 'u3',
    actionType: 'LOCATION_STARTED',
    summary: 'Rohan Verma enabled temporary live location sharing (15m auto-expiry).',
    timestamp: '10:18 AM',
  },
  {
    id: 'log3',
    tripId: 't1',
    actorUserId: 'u2',
    actionType: 'ITINERARY_UPDATED',
    summary: 'Priya Nair attached booking reference RES-TK-12PM to Day 1 Lunch.',
    timestamp: '10:05 AM',
  },
  {
    id: 'log4',
    tripId: 't1',
    actorUserId: 'u5',
    actionType: 'MEMBER_JOINED',
    summary: 'Kabir Mehta joined Ladakh Himalayan Expedition via invite code LADAKH26.',
    timestamp: 'Yesterday',
  },
];

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

// ============================================================================
// MAIN TRIPSYNC PRODUCTION APPLICATION
// ============================================================================

export default function App() {
  // Theme & Navigation State
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'trips' | 'chat' | 'map' | 'itinerary' | 'expenses' | 'explore' | 'notifications' | 'architecture'
  >('dashboard');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Core Persistent Entities
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>('u1');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'profile'>('profile');

  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [activeTripId, setActiveTripId] = useState<string>('t1');
  const [invitations, setInvitations] = useState<TripInvitation[]>([
    {
      id: 'inv1',
      tripId: 't1',
      email: 'meera.kapoor@example.com',
      invitedByUserId: 'u1',
      token: 'TS-INV-99812A',
      status: 'PENDING',
      createdAt: '2026-10-28',
    },
  ]);
  const [activityLogs, setActivityLogs] = useState<TripActivityLog[]>(INITIAL_ACTIVITY_LOGS);

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [itinerary, setItinerary] = useState<ItineraryActivity[]>(INITIAL_ITINERARY);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [mapPins, setMapPins] = useState<MapPinItem[]>(INITIAL_MAP_PINS);
  const [liveLocations, setLiveLocations] = useState<LiveLocationSession[]>(INITIAL_LIVE_LOCATIONS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    pushEnabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    tripAlerts: true,
    itineraryAlerts: true,
    chatAlerts: true,
    expenseAlerts: true,
    locationAlerts: true,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',
  });

  // Toast Notification Queue
  const [toasts, setToasts] = useState<{ id: string; title: string; type: 'success' | 'info' | 'warning' }[]>([]);
  const addToast = (title: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev.slice(-3), { id, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Safe localStorage persistence
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('tripsync_dark_mode');
      if (savedTheme !== null) setDarkMode(savedTheme === 'true');
    } catch {
      // Ignore sandbox storage restrictions
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem('tripsync_dark_mode', String(next));
    } catch {
      // Ignore sandbox storage restrictions
    }
  };

  // Active User & Active Trip Helpers
  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || trips[0],
    [trips, activeTripId]
  );

  const currentMemberRecord = useMemo(
    () => activeTrip.members.find((m) => m.userId === currentUser.id),
    [activeTrip, currentUser]
  );

  const isTripAdmin = useMemo(
    () =>
      currentUser.role === 'PLATFORM_ADMIN' ||
      currentMemberRecord?.memberRole === 'TRIP_ADMIN' ||
      activeTrip.createdBy === currentUser.id,
    [currentUser, currentMemberRecord, activeTrip]
  );

  const canEditItinerary = useMemo(
    () => isTripAdmin || Boolean(currentMemberRecord?.canEditItinerary),
    [isTripAdmin, currentMemberRecord]
  );

  const getUserById = (uid: string) =>
    users.find((u) => u.id === uid) || {
      id: uid,
      fullName: 'Traveler',
      avatar: 'TR',
      email: '',
      username: 'traveler',
      phone: '',
      preferredCurrency: 'INR' as const,
      country: 'India',
      role: 'USER' as const,
      travelPreferences: [],
      createdAt: '',
      online: false,
    };

  const logTripActivity = (actionType: string, summary: string) => {
    const entry: TripActivityLog = {
      id: 'log-' + Date.now(),
      tripId: activeTrip.id,
      actorUserId: currentUser.id,
      actionType,
      summary,
      timestamp: 'Just now',
    };
    setActivityLogs((prev) => [entry, ...prev]);
  };

  const pushNotification = (
    category: AppNotification['category'],
    title: string,
    body: string,
    targetTab: AppNotification['targetTab']
  ) => {
    if (!notifPrefs.inAppEnabled) return;
    const item: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      tripId: activeTrip.id,
      category,
      title,
      body,
      timestamp: 'Just now',
      isRead: false,
      targetTab,
    };
    setNotifications((prev) => [item, ...prev]);
  };

  // Copy helper with fallback
  const copyTextSafe = (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    addToast(`Copied ${label}: ${text}`, 'info');
  };

  // ============================================================================
  // LIVE LOCATION TIMER & THROTTLED GPS SIMULATION
  // ============================================================================
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveLocations((prev) =>
        prev.map((sess) => {
          if (!sess.isActive || sess.remainingSeconds <= 0) return sess;
          const nextRem = sess.remainingSeconds - 1;
          if (nextRem <= 0) {
            return { ...sess, isActive: false, remainingSeconds: 0, lastUpdated: 'Expired' };
          }
          // Subtle realistic movement along route
          const jitterX = Math.max(12, Math.min(88, sess.xPct + (Math.random() - 0.48) * 0.35));
          const jitterY = Math.max(15, Math.min(82, sess.yPct + (Math.random() - 0.52) * 0.35));
          return {
            ...sess,
            remainingSeconds: nextRem,
            xPct: Math.round(jitterX * 10) / 10,
            yPct: Math.round(jitterY * 10) / 10,
          };
        })
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // ============================================================================
  // EXPENSE BALANCES & DEBT SIMPLIFICATION COMPUTATIONS (FOR ACTIVE TRIP)
  // ============================================================================
  const tripExpenses = useMemo(
    () => expenses.filter((e) => e.tripId === activeTrip.id),
    [expenses, activeTrip.id]
  );

  const tripSettlements = useMemo(
    () => settlements.filter((s) => s.tripId === activeTrip.id && s.status === 'COMPLETED'),
    [settlements, activeTrip.id]
  );

  const [transitiveDemoMode, setTransitiveDemoMode] = useState<boolean>(false);

  const financialSummary = useMemo(() => {
    const memberIds = activeTrip.members.map((m) => m.userId);
    const totalPaid: Record<string, number> = {};
    const totalOwed: Record<string, number> = {};
    const netBalance: Record<string, number> = {};

    memberIds.forEach((uid) => {
      totalPaid[uid] = 0;
      totalOwed[uid] = 0;
      netBalance[uid] = 0;
    });

    let grandTotal = 0;

    if (transitiveDemoMode) {
      // Classic specification demo: A owes B ₹1,000, B owes C ₹1,000 -> Simplified: A pays C ₹1,000
      const uA = memberIds[0] || 'u1';
      const uB = memberIds[1] || 'u2';
      const uC = memberIds[2] || 'u3';
      grandTotal = 2000;
      totalPaid[uB] = 1000;
      totalOwed[uA] = 1000;
      totalPaid[uC] = 1000;
      totalOwed[uB] = 1000;
      netBalance[uA] = -1000;
      netBalance[uB] = 0;
      netBalance[uC] = 1000;
    } else {
      tripExpenses.forEach((exp) => {
        grandTotal += exp.amount;
        totalPaid[exp.paidByUserId] = (totalPaid[exp.paidByUserId] || 0) + exp.amount;
        exp.splits.forEach((sp) => {
          totalOwed[sp.userId] = (totalOwed[sp.userId] || 0) + sp.owedAmount;
        });
      });

      // Factor in completed manual settlements
      tripSettlements.forEach((st) => {
        totalPaid[st.fromUserId] = (totalPaid[st.fromUserId] || 0) + st.amount;
        totalPaid[st.toUserId] = (totalPaid[st.toUserId] || 0) - st.amount;
      });

      memberIds.forEach((uid) => {
        netBalance[uid] = Math.round(((totalPaid[uid] || 0) - (totalOwed[uid] || 0)) * 100) / 100;
      });
    }

    const simplifiedTransfers = simplifyGroupDebts(netBalance);

    // Category aggregation for Recharts
    const catMap: Record<string, number> = {};
    tripExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const categoryChartData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    const memberChartData = memberIds.map((uid) => {
      const u = getUserById(uid);
      return {
        name: u.fullName.split(' ')[0],
        Paid: Math.round(totalPaid[uid] || 0),
        Share: Math.round(totalOwed[uid] || 0),
        Net: Math.round(netBalance[uid] || 0),
      };
    });

    return {
      grandTotal,
      totalPaid,
      totalOwed,
      netBalance,
      simplifiedTransfers,
      categoryChartData,
      memberChartData,
    };
  }, [activeTrip, tripExpenses, tripSettlements, transitiveDemoMode, users]);

  // ============================================================================
  // MODAL & FORM STATES Across Modules
  // ============================================================================

  // 1. Create Trip Modal State
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [newTripForm, setNewTripForm] = useState({
    name: '',
    description: '',
    coverImage: COVER_LADAKH,
    startingLocation: 'Mumbai BOM',
    destination: '',
    startDate: '2026-11-20',
    endDate: '2026-11-26',
    tripType: 'GROUP' as 'GROUP' | 'SOLO',
    visibility: 'PRIVATE' as 'PRIVATE' | 'PUBLIC',
    currency: 'INR' as 'INR' | 'USD' | 'EUR' | 'JPY',
    maxParticipants: 10,
  });

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripForm.name.trim() || !newTripForm.destination.trim()) {
      addToast('Please provide a trip name and destination.', 'warning');
      return;
    }
    const code = (newTripForm.name.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'TRIP') + Math.floor(10 + Math.random() * 89);
    const created: Trip = {
      id: 't-' + Date.now(),
      name: newTripForm.name.trim(),
      description: newTripForm.description.trim() || 'Collaborative journey organized on TripSync.',
      coverImage: newTripForm.coverImage,
      startingLocation: newTripForm.startingLocation,
      destination: newTripForm.destination,
      startDate: newTripForm.startDate,
      endDate: newTripForm.endDate,
      tripType: newTripForm.tripType,
      visibility: newTripForm.visibility,
      currency: newTripForm.currency,
      maxParticipants: Number(newTripForm.maxParticipants) || 10,
      tripCode: code,
      status: 'UPCOMING',
      createdBy: currentUser.id,
      members: [
        {
          userId: currentUser.id,
          memberRole: 'TRIP_ADMIN',
          status: 'JOINED',
          canEditItinerary: true,
          canInviteMembers: true,
          joinedAt: new Date().toISOString().slice(0, 10),
        },
      ],
    };
    setTrips((prev) => [created, ...prev]);
    setActiveTripId(created.id);
    setCreateTripOpen(false);
    addToast(`Created trip "${created.name}" (Code: ${code})!`);
    pushNotification('TRIP', `Trip Created: ${created.name}`, `Share code ${code} with your travel group.`, 'trips');
  };

  // 2. Join Trip by Code & Invite Member State
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    const found = trips.find((t) => t.tripCode.toUpperCase() === code);
    if (!found) {
      addToast(`No trip found matching code "${code}". Try LADAKH26 or KYOTO26.`, 'warning');
      return;
    }
    const alreadyIn = found.members.some((m) => m.userId === currentUser.id);
    if (!alreadyIn) {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === found.id
            ? {
                ...t,
                members: [
                  ...t.members,
                  {
                    userId: currentUser.id,
                    memberRole: 'MEMBER',
                    status: 'JOINED',
                    canEditItinerary: true,
                    canInviteMembers: false,
                    joinedAt: 'Today',
                  },
                ],
              }
            : t
        )
      );
    }
    setActiveTripId(found.id);
    setJoinCodeInput('');
    addToast(`Switched to trip "${found.name}"!`);
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput.trim() || !inviteEmailInput.includes('@')) {
      addToast('Enter a valid email address to send a trip invitation.', 'warning');
      return;
    }
    const token = 'TS-INV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const inv: TripInvitation = {
      id: 'inv-' + Date.now(),
      tripId: activeTrip.id,
      email: inviteEmailInput.trim(),
      invitedByUserId: currentUser.id,
      token,
      status: 'PENDING',
      createdAt: 'Just now',
    };
    setInvitations((prev) => [inv, ...prev]);
    setInviteEmailInput('');
    logTripActivity('MEMBER_INVITED', `${currentUser.fullName} invited ${inv.email} (Token: ${token}).`);
    addToast(`Invitation sent to ${inv.email}!`);
  };

  // 3. Chat Composer & Actions State
  const [chatInput, setChatInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isTeammateTyping, setIsTeammateTyping] = useState(false);

  const tripMessages = useMemo(
    () =>
      messages
        .filter((m) => m.tripId === activeTrip.id)
        .filter((m) =>
          chatSearch.trim()
            ? m.content.toLowerCase().includes(chatSearch.toLowerCase()) ||
              (m.sharedMeta?.title || '').toLowerCase().includes(chatSearch.toLowerCase())
            : true
        ),
    [messages, activeTrip.id, chatSearch]
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (editingMessageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId ? { ...m, content: chatInput.trim(), isEdited: true } : m
        )
      );
      setEditingMessageId(null);
      setChatInput('');
      addToast('Message updated.');
      return;
    }

    const msg: ChatMessage = {
      id: 'm-' + Date.now(),
      tripId: activeTrip.id,
      senderId: currentUser.id,
      replyToId: replyingToId || undefined,
      type: 'TEXT',
      content: chatInput.trim(),
      deliveryStatus: 'READ',
      isEdited: false,
      isDeleted: false,
      reactions: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, msg]);
    setChatInput('');
    setReplyingToId(null);
  };

  const handleQuickShareToChat = (
    type: ChatMessage['type'],
    content: string,
    meta: { title: string; subtitle: string; badge: string }
  ) => {
    const msg: ChatMessage = {
      id: 'm-' + Date.now(),
      tripId: activeTrip.id,
      senderId: currentUser.id,
      type,
      content,
      sharedMeta: meta,
      deliveryStatus: 'READ',
      isEdited: false,
      isDeleted: false,
      reactions: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, msg]);
    addToast(`Shared ${meta.badge.toLowerCase()} to ${activeTrip.name} chat!`);
  };

  const simulateStompIncomingMessage = () => {
    setIsTeammateTyping(true);
    setTimeout(() => {
      setIsTeammateTyping(false);
      const sender = currentUser.id === 'u2' ? getUserById('u3') : getUserById('u2');
      const incoming: ChatMessage = {
        id: 'm-' + Date.now(),
        tripId: activeTrip.id,
        senderId: sender.id,
        type: 'TEXT',
        content: `Hey ${currentUser.fullName.split(' ')[0]}! I just checked the weather along the route — clear skies and 14°C. Ready to roll!`,
        deliveryStatus: 'READ',
        isEdited: false,
        isDeleted: false,
        reactions: [{ emoji: '🙌', userIds: [currentUser.id] }],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, incoming]);
      pushNotification('CHAT', `New message from ${sender.fullName}`, incoming.content, 'chat');
      addToast(`STOMP WebSocket: New message from ${sender.fullName}`, 'info');
    }, 1100);
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        let nextReactions: ChatReaction[];
        if (existing) {
          const hasUser = existing.userIds.includes(currentUser.id);
          const nextUsers = hasUser
            ? existing.userIds.filter((id) => id !== currentUser.id)
            : [...existing.userIds, currentUser.id];
          nextReactions = m.reactions
            .map((r) => (r.emoji === emoji ? { ...r, userIds: nextUsers } : r))
            .filter((r) => r.userIds.length > 0);
        } else {
          nextReactions = [...m.reactions, { emoji, userIds: [currentUser.id] }];
        }
        return { ...m, reactions: nextReactions };
      })
    );
  };

  // 4. Interactive Map & Live Location State
  const [selectedPinId, setSelectedPinId] = useState<string>('pin2');
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>('ALL');
  const [showRouteLine, setShowRouteLine] = useState<boolean>(true);
  const [showMemberAvatars, setShowMemberAvatars] = useState<boolean>(true);
  const [sharingDuration, setSharingDuration] = useState<15 | 60 | 480>(60);
  const [sharingAudience, setSharingAudience] = useState<'ENTIRE_GROUP' | 'SELECTED_MEMBERS'>('ENTIRE_GROUP');
  const [selectedAllowedMembers, setSelectedAllowedMembers] = useState<string[]>(['u1', 'u2', 'u3', 'u4', 'u5']);
  const [newPinFormOpen, setNewPinFormOpen] = useState<boolean>(false);
  const [newPinName, setNewPinName] = useState<string>('');
  const [newPinCategory, setNewPinCategory] = useState<MapPinItem['category']>('ATTRACTION');

  const myLiveSession = useMemo(
    () => liveLocations.find((s) => s.tripId === activeTrip.id && s.userId === currentUser.id),
    [liveLocations, activeTrip.id, currentUser.id]
  );

  const handleStartLiveLocation = () => {
    const startSession = (lat: number, lng: number) => {
      const nextSession: LiveLocationSession = {
        userId: currentUser.id,
        tripId: activeTrip.id,
        isActive: true,
        audienceScope: sharingAudience,
        allowedMemberIds:
          sharingAudience === 'ENTIRE_GROUP'
            ? activeTrip.members.map((m) => m.userId)
            : selectedAllowedMembers,
        durationMinutes: sharingDuration,
        remainingSeconds: sharingDuration * 60,
        lat,
        lng,
        xPct: myLiveSession?.xPct || 40,
        yPct: myLiveSession?.yPct || 52,
        accuracyMeters: 5,
        batteryPct: 92,
        speedKmh: 12,
        lastUpdated: 'Just now',
      };
      setLiveLocations((prev) => {
        const others = prev.filter((s) => !(s.tripId === activeTrip.id && s.userId === currentUser.id));
        return [...others, nextSession];
      });
      logTripActivity(
        'LOCATION_SHARED',
        `${currentUser.fullName} started live location sharing (${sharingDuration}m timer, ${sharingAudience}).`
      );
      pushNotification(
        'LOCATION',
        `${currentUser.fullName} started sharing live location`,
        `Active for ${sharingDuration} minutes with explicit consent.`,
        'map'
      );
      addToast(`Live location sharing enabled for ${sharingDuration} minutes.`);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => startSession(pos.coords.latitude, pos.coords.longitude),
        () => startSession(34.1625, 77.5815),
        { timeout: 2500 }
      );
    } else {
      startSession(34.1625, 77.5815);
    }
  };

  const handleStopLiveLocationImmediately = () => {
    setLiveLocations((prev) =>
      prev.map((s) =>
        s.tripId === activeTrip.id && s.userId === currentUser.id
          ? { ...s, isActive: false, remainingSeconds: 0, lastUpdated: 'Stopped by user' }
          : s
      )
    );
    logTripActivity('LOCATION_STOPPED', `${currentUser.fullName} stopped sharing live location.`);
    pushNotification(
      'LOCATION',
      `${currentUser.fullName} stopped sharing location`,
      'Live GPS session terminated immediately.',
      'map'
    );
    addToast('Live location sharing stopped immediately.', 'info');
  };

  const handleAddCustomPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinName.trim()) return;
    const created: MapPinItem = {
      id: 'pin-' + Date.now(),
      tripId: activeTrip.id,
      name: newPinName.trim(),
      category: newPinCategory,
      xPct: Math.floor(25 + Math.random() * 55),
      yPct: Math.floor(22 + Math.random() * 55),
      lat: 34.15 + Math.random() * 0.05,
      lng: 77.56 + Math.random() * 0.05,
      rating: 4.8,
      reviewsCount: 120,
      address: `${activeTrip.destination}`,
      description: `Custom group marker added by ${currentUser.fullName}.`,
      distanceFromPrevKm: 2.8,
      estimatedTimeFromPrev: '9 mins drive',
      saved: true,
    };
    setMapPins((prev) => [...prev, created]);
    setSelectedPinId(created.id);
    setNewPinName('');
    setNewPinFormOpen(false);
    addToast(`Added custom map marker "${created.name}"!`);
  };

  // 5. Itinerary State (Timeline, Calendar, Map, List views + Reordering + CRUD)
  const [itineraryViewMode, setItineraryViewMode] = useState<'TIMELINE' | 'CALENDAR' | 'MAP' | 'LIST'>('TIMELINE');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [activityModalOpen, setActivityModalOpen] = useState<boolean>(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    destinationName: '',
    startTime: '15:00',
    endTime: '16:30',
    category: 'SIGHTSEEING' as ItineraryActivity['category'],
    estimatedCost: 1200,
    bookingRef: '',
    notes: '',
  });

  const tripActivities = useMemo(
    () => itinerary.filter((a) => a.tripId === activeTrip.id),
    [itinerary, activeTrip.id]
  );

  const dayActivities = useMemo(
    () =>
      tripActivities
        .filter((a) => a.dayNumber === selectedDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [tripActivities, selectedDay]
  );

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditItinerary) {
      addToast('You do not have permission to modify the itinerary.', 'warning');
      return;
    }
    if (!activityForm.title.trim() || !activityForm.destinationName.trim()) {
      addToast('Please enter an activity title and destination.', 'warning');
      return;
    }
    const created: ItineraryActivity = {
      id: 'act-' + Date.now(),
      tripId: activeTrip.id,
      dayNumber: selectedDay,
      title: activityForm.title.trim(),
      description: activityForm.description.trim() || 'Group collaborative activity.',
      destinationName: activityForm.destinationName.trim(),
      startTime: activityForm.startTime,
      endTime: activityForm.endTime,
      category: activityForm.category,
      estimatedCost: Number(activityForm.estimatedCost) || 0,
      assignedMemberIds: activeTrip.members.map((m) => m.userId),
      bookingRef: activityForm.bookingRef.trim() || 'PENDING',
      notes: activityForm.notes.trim(),
      completed: false,
      xPct: Math.floor(25 + Math.random() * 55),
      yPct: Math.floor(25 + Math.random() * 50),
    };
    setItinerary((prev) => [...prev, created]);
    setActivityModalOpen(false);
    setActivityForm({
      title: '',
      description: '',
      destinationName: '',
      startTime: '16:00',
      endTime: '17:30',
      category: 'SIGHTSEEING',
      estimatedCost: 1000,
      bookingRef: '',
      notes: '',
    });
    logTripActivity('ITINERARY_ADDED', `${currentUser.fullName} added "${created.title}" to Day ${selectedDay}.`);
    pushNotification(
      'ITINERARY',
      `New Activity Added to Day ${selectedDay}`,
      `${created.startTime} – ${created.title} (${created.destinationName})`,
      'itinerary'
    );
    addToast(`Added "${created.title}" to Day ${selectedDay}!`);
  };

  const moveActivityOrder = (activityId: string, direction: 'UP' | 'DOWN') => {
    const idx = dayActivities.findIndex((a) => a.id === activityId);
    if (idx === -1) return;
    const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= dayActivities.length) return;
    const itemA = dayActivities[idx];
    const itemB = dayActivities[swapIdx];
    setItinerary((prev) =>
      prev.map((a) => {
        if (a.id === itemA.id) return { ...a, startTime: itemB.startTime, endTime: itemB.endTime };
        if (a.id === itemB.id) return { ...a, startTime: itemA.startTime, endTime: itemA.endTime };
        return a;
      })
    );
    addToast(`Reordered "${itemA.title}" in Day ${selectedDay} schedule.`, 'info');
  };

  // 6. Expense Creation & Settlement Modal State
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<string>('5000');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('ACCOMMODATION');
  const [expenseSplitMethod, setExpenseSplitMethod] = useState<SplitMethod>('EQUAL');
  const [expensePaidBy, setExpensePaidBy] = useState<string>('u1');
  const [expenseParticipants, setExpenseParticipants] = useState<string[]>(['u1', 'u2', 'u3', 'u4', 'u5']);
  const [expenseCustomValues, setExpenseCustomValues] = useState<Record<string, number>>({
    u1: 20,
    u2: 20,
    u3: 20,
    u4: 20,
    u5: 20,
  });

  const liveSplitPreview = useMemo(
    () =>
      calculateExactSplits(
         parseFloat(expenseAmount || '0'),
        expenseSplitMethod,
        expenseParticipants,
        expenseCustomValues
      ),
    [expenseAmount, expenseSplitMethod, expenseParticipants, expenseCustomValues]
  );

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim()) {
      addToast('Please enter an expense title.', 'warning');
      return;
    }
    if (liveSplitPreview.error) {
      addToast(liveSplitPreview.error, 'warning');
      return;
    }
    const amt = Math.round(parseFloat(expenseAmount) * 100) / 100;
    const created: ExpenseItem = {
      id: 'exp-' + Date.now(),
      tripId: activeTrip.id,
      title: expenseTitle.trim(),
      description: expenseDesc.trim() || `${expenseSplitMethod} split across ${expenseParticipants.length} members.`,
      amount: amt,
      currency: activeTrip.currency,
      category: expenseCategory,
      splitMethod: expenseSplitMethod,
      paidByUserId: expensePaidBy,
      date: 'Just now',
      receiptName: 'receipt_' + Date.now().toString().slice(-4) + '.jpg',
      splits: liveSplitPreview.splits,
    };
    setExpenses((prev) => [created, ...prev]);
    setTransitiveDemoMode(false);
    setExpenseModalOpen(false);
    setExpenseTitle('');
    setExpenseDesc('');
    logTripActivity(
      'EXPENSE_ADDED',
      `${getUserById(expensePaidBy).fullName} paid ${formatMoney(amt, activeTrip.currency)} for "${created.title}" (${expenseSplitMethod}).`
    );
    pushNotification(
      'EXPENSE',
      `New Expense: ${created.title} (${formatMoney(amt, activeTrip.currency)})`,
      `Paid by ${getUserById(expensePaidBy).fullName} • Split via ${expenseSplitMethod}`,
      'expenses'
    );
    addToast(`Recorded expense "${created.title}" (${formatMoney(amt, activeTrip.currency)})!`);
  };

  const handleRecordSettlement = (fromUserId: string, toUserId: string, amount: number) => {
    const rec: SettlementRecord = {
      id: 'set-' + Date.now(),
      tripId: activeTrip.id,
      fromUserId,
      toUserId,
      amount,
      currency: activeTrip.currency,
      status: 'COMPLETED',
      method: 'Manual / UPI / Cash',
      notes: 'Settled via TripSync Debt Simplification Engine',
      settledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    if (transitiveDemoMode) {
      setTransitiveDemoMode(false);
    }
    setSettlements((prev) => [rec, ...prev]);
    logTripActivity(
      'SETTLEMENT_RECORDED',
      `${getUserById(fromUserId).fullName} settled ${formatMoney(amount, activeTrip.currency)} with ${getUserById(toUserId).fullName}.`
    );
    pushNotification(
      'EXPENSE',
      'Settlement Recorded',
      `${getUserById(fromUserId).fullName} paid ${getUserById(toUserId).fullName} ${formatMoney(amount, activeTrip.currency)}.`,
      'expenses'
    );
    addToast(`Recorded settlement: ${getUserById(fromUserId).fullName} → ${getUserById(toUserId).fullName} (${formatMoney(amount, activeTrip.currency)})!`);
  };

  // 7. Explore & Destination Discovery State
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState<'ALL' | 'DESTINATION' | 'HOTEL' | 'RESTAURANT' | 'ATTRACTION'>('ALL');

  const filteredExplorePlaces = useMemo(() => {
    return mapPins.filter((p) => {
      const matchesCat = exploreCategory === 'ALL' || p.category === exploreCategory;
      const matchesQ =
        !exploreQuery.trim() ||
        p.name.toLowerCase().includes(exploreQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(exploreQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(exploreQuery.toLowerCase());
      return matchesCat && matchesQ;
    });
  }, [mapPins, exploreCategory, exploreQuery]);

  const toggleBookmarkPlace = (pinId: string) => {
    setMapPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, saved: !p.saved } : p))
    );
    const target = mapPins.find((p) => p.id === pinId);
    if (target) {
      addToast(`${target.saved ? 'Removed from' : 'Saved to'} Bookmarked Places: ${target.name}`, 'info');
    }
  };

  const addDiscoveredPlaceToItinerary = (place: MapPinItem) => {
    const act: ItineraryActivity = {
      id: 'act-' + Date.now(),
      tripId: activeTrip.id,
      dayNumber: selectedDay,
      title: `Visit ${place.name}`,
      description: place.description,
      destinationName: place.address,
      startTime: '16:00',
      endTime: '18:00',
      category:
        place.category === 'RESTAURANT'
          ? 'FOOD'
          : place.category === 'HOTEL'
          ? 'HOTEL'
          : 'SIGHTSEEING',
      estimatedCost: 1500,
      assignedMemberIds: activeTrip.members.map((m) => m.userId),
      bookingRef: 'PLACES-DISCOVERY',
      notes: `Added from TripSync Explore (${place.rating}★)`,
      completed: false,
      xPct: place.xPct,
      yPct: place.yPct,
    };
    setItinerary((prev) => [...prev, act]);
    addToast(`Added "${place.name}" to ${activeTrip.name} – Day ${selectedDay}!`);
  };

  // Unread Notifications Count
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // ============================================================================
  // RENDER UI
  // ============================================================================
  return (
    <div className={`${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen font-sans transition-colors duration-200 flex flex-col`}>
      {/* FLOATING TOAST NOTIFICATIONS */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md text-sm font-medium transition-all ${
              t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : t.type === 'info'
                ? 'bg-sky-950/90 border-sky-500/50 text-sky-100'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{t.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* TOP APPLICATION HEADER */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                    TripSync
                  </span>
                  <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    v1.0 Prod
                  </span>
                </div>
                <p className={`text-[11px] hidden sm:block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your Journey. Your People. One Place.
                </p>
              </div>
            </button>

            {/* Active Trip Selector Pill */}
            <div className={`hidden lg:flex items-center gap-2 ml-4 pl-4 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="text-xs font-medium text-slate-400">Active Trip:</span>
              <select
                aria-label="Select Active Trip"
                value={activeTrip.id}
                onChange={(e) => {
                  setActiveTripId(e.target.value);
                  addToast(`Switched context to ${trips.find((t) => t.id === e.target.value)?.name}`, 'info');
                }}
                className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.tripCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Global Search Input */}
          <div className="flex-1 max-w-xs hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search trips, places, expenses, chat..."
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-500'
                }`}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Controls: Role/User Switcher, Notifications, Theme, Profile */}
          <div className="flex items-center gap-2">
            {/* Multi-User Role Switcher for live RBAC & Collaboration Testing */}
            <div className="hidden sm:flex items-center gap-1.5">
              <select
                aria-label="Switch Authenticated User"
                value={currentUser.id}
                onChange={(e) => {
                  setCurrentUserId(e.target.value);
                  const u = getUserById(e.target.value);
                  addToast(`Signed in as ${u.fullName} (${u.role})`, 'info');
                }}
                className={`text-xs font-medium rounded-lg px-2 py-1.5 border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-teal-300' : 'bg-slate-100 border-slate-300 text-teal-800'
                }`}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 rounded-xl border transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                  : darkMode
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Smart Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile / Auth Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                setAuthMode('profile');
                setAuthModalOpen(true);
              }}
              className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border transition-colors ${
                darkMode ? 'bg-slate-800 border-slate-700 hover:border-sky-500/50' : 'bg-white border-slate-200 hover:border-sky-500'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                {currentUser.avatar}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold leading-none">{currentUser.fullName.split(' ')[0]}</div>
                <div className="text-[10px] text-emerald-400 font-medium">{currentUser.role}</div>
              </div>
            </button>
          </div>
        </div>

        {/* PRIMARY MODULE NAVIGATION BAR */}
        <div className={`border-t ${darkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'}`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Compass },
              { id: 'trips', label: 'Trips & Roles', icon: Users },
              { id: 'chat', label: 'Group Chat', icon: MessageSquare, badge: tripMessages.length },
              { id: 'map', label: 'Live Map & GPS', icon: MapPin, badge: liveLocations.filter((l) => l.tripId === activeTrip.id && l.isActive).length },
              { id: 'itinerary', label: 'Itinerary', icon: Calendar, badge: tripActivities.length },
              { id: 'expenses', label: 'Expenses & Splitwise', icon: Wallet },
              { id: 'explore', label: 'Explore Places', icon: ExploreIcon },
              { id: 'notifications', label: 'Alerts', icon: Bell, badge: unreadNotifCount },
              { id: 'architecture', label: 'System Architecture & API', icon: Server },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20'
                      : darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-white/25 text-white' : 'bg-sky-500/20 text-sky-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* GLOBAL SEARCH FILTER BANNER (IF SEARCH ACTIVE) */}
      {globalSearch.trim() !== '' && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-sky-500/40' : 'bg-white border-sky-300'} shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Global Search Results for "{globalSearch}"
              </span>
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear Search
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="font-semibold text-slate-400 mb-1">Matching Trips & Places</div>
                {mapPins
                  .filter((p) => p.name.toLowerCase().includes(globalSearch.toLowerCase()))
                  .slice(0, 3)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPinId(p.id);
                        setActiveTab('map');
                        setGlobalSearch('');
                      }}
                      className="block w-full text-left py-1 px-2 rounded hover:bg-sky-500/10 text-sky-400 truncate"
                    >
                      📍 {p.name} ({p.category})
                    </button>
                  ))}
              </div>
              <div>
                <div className="font-semibold text-slate-400 mb-1">Matching Itinerary Activities</div>
                {itinerary
                  .filter((a) => a.title.toLowerCase().includes(globalSearch.toLowerCase()))
                  .slice(0, 3)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedDay(a.dayNumber);
                        setActiveTab('itinerary');
                        setGlobalSearch('');
                      }}
                      className="block w-full text-left py-1 px-2 rounded hover:bg-teal-500/10 text-teal-400 truncate"
                    >
                      🗓️ Day {a.dayNumber}: {a.title}
                    </button>
                  ))}
              </div>
              <div>
                <div className="font-semibold text-slate-400 mb-1">Matching Expenses & Messages</div>
                {expenses
                  .filter((e) => e.title.toLowerCase().includes(globalSearch.toLowerCase()))
                  .slice(0, 3)
                  .map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setActiveTab('expenses');
                        setGlobalSearch('');
                      }}
                      className="block w-full text-left py-1 px-2 rounded hover:bg-emerald-500/10 text-emerald-400 truncate"
                    >
                      💳 {e.title} ({formatMoney(e.amount, e.currency)})
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 space-y-6">
        {/* ===================================================================
            TAB 1: MAIN APPLICATION DASHBOARD
        =================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero Welcome & Quick Actions Banner */}
            <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 ${darkMode ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/70 border-slate-800' : 'bg-gradient-to-r from-sky-50 via-white to-teal-50 border-slate-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Unified Travel Command Center • Active Trip: {activeTrip.name}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome back, {currentUser.fullName.split(' ')[0]}! Ready for {activeTrip.destination}?
                  </h1>
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    No more switching between WhatsApp, Google Maps, Splitwise, and Notion. Your group chat, live GPS avatars, day-wise itinerary, and simplified expense settlements are synced in real time.
                  </p>
                </div>

                {/* Quick Actions Row */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateTripOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 hover:opacity-95 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Trip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('trips')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      darkMode ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Key className="w-4 h-4 text-teal-400" />
                    <span>Join Trip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('map')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      darkMode ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span>Open Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('expenses');
                      setExpenseModalOpen(true);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      darkMode ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Add Expense</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('itinerary');
                      setActivityModalOpen(true);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      darkMode ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Create Itinerary</span>
                  </button>
                </div>
              </div>

              {/* KPI Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
                  <div className="text-xs text-slate-400">Active & Upcoming Trips</div>
                  <div className="text-xl font-extrabold mt-0.5">{trips.length} Trips</div>
                  <div className="text-[11px] text-sky-400 mt-0.5">Code: {activeTrip.tripCode}</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
                  <div className="text-xs text-slate-400">Live Sharing Members</div>
                  <div className="text-xl font-extrabold mt-0.5 text-emerald-400">
                    {liveLocations.filter((l) => l.tripId === activeTrip.id && l.isActive).length} / {activeTrip.members.length} Active
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Consent-verified GPS</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
                  <div className="text-xs text-slate-400">Total Trip Expenses</div>
                  <div className="text-xl font-extrabold mt-0.5">
                    {formatMoney(financialSummary.grandTotal, activeTrip.currency)}
                  </div>
                  <div className="text-[11px] text-teal-400 mt-0.5">
                    Your Net: {financialSummary.netBalance[currentUser.id] >= 0 ? '+' : ''}
                    {formatMoney(financialSummary.netBalance[currentUser.id] || 0, activeTrip.currency)}
                  </div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
                  <div className="text-xs text-slate-400">Planned Activities</div>
                  <div className="text-xl font-extrabold mt-0.5">{tripActivities.length} Stops</div>
                  <div className="text-[11px] text-amber-400 mt-0.5">
                    {tripActivities.filter((a) => a.completed).length} Completed
                  </div>
                </div>
              </div>
            </div>

            {/* Active & Upcoming Trip Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" />
                  <span>Your Journeys (Group & Solo)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setCreateTripOpen(true)}
                  className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Trip
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {trips.map((trip) => {
                  const isSelected = trip.id === activeTrip.id;
                  return (
                    <div
                      key={trip.id}
                      className={`group rounded-2xl overflow-hidden border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'ring-2 ring-sky-500 border-sky-500/50 shadow-xl shadow-sky-500/10'
                          : darkMode
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="relative h-44 overflow-hidden bg-slate-800">
                          <img
                            src={trip.coverImage}
                            alt={trip.name}
                            className="w-full h-full object-cover max-w-full group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                trip.status === 'ACTIVE'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-sky-500 text-white'
                              }`}
                            >
                              {trip.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/80 text-slate-200 border border-slate-700">
                              {trip.tripType} • {trip.visibility}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <div className="text-xs text-sky-300 font-medium flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {trip.destination}
                            </div>
                            <h3 className="font-bold text-base leading-tight mt-0.5">{trip.name}</h3>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <p className={`text-xs line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {trip.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-teal-400" />
                              {trip.startDate} → {trip.endDate}
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              #{trip.tripCode}
                            </span>
                          </div>

                          {/* Participant Avatars */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex -space-x-2">
                              {trip.members.map((m) => {
                                const u = getUserById(m.userId);
                                return (
                                  <div
                                    key={m.userId}
                                    title={`${u.fullName} (${m.memberRole})`}
                                    className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-teal-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900"
                                  >
                                    {u.avatar}
                                  </div>
                                );
                              })}
                            </div>
                            <span className="text-xs text-slate-400">
                              {trip.members.length}/{trip.maxParticipants} Travelers
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Navigation Footer */}
                      <div className={`px-4 py-3 border-t flex items-center justify-between gap-2 ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <button
                          type="button"
                          onClick={() => setActiveTripId(trip.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                              : 'bg-sky-500 text-white hover:bg-sky-600'
                          }`}
                        >
                          {isSelected ? '✓ Active Workspace' : 'Switch to Trip'}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTripId(trip.id);
                              setActiveTab('map');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-400"
                            title="Open Trip Map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTripId(trip.id);
                              setActiveTab('chat');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-teal-400"
                            title="Open Group Chat"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTripId(trip.id);
                              setActiveTab('expenses');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400"
                            title="Open Expense Ledger"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3-Column Live Snapshot: Upcoming Itinerary, Pending Expense Settlements, Recent Conversations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Column 1: Upcoming Itinerary Activities */}
              <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Day 1 Schedule ({activeTrip.name})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('itinerary')}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    Full Planner →
                  </button>
                </div>
                <div className="space-y-3">
                  {tripActivities.slice(0, 4).map((act) => (
                    <div
                      key={act.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-400 font-mono text-[11px] font-bold">
                          {act.startTime}
                        </span>
                        <div>
                          <div className={`text-xs font-semibold ${act.completed ? 'line-through text-slate-500' : ''}`}>
                            {act.title}
                          </div>
                          <div className="text-[11px] text-slate-400">{act.destinationName}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                        {formatMoney(act.estimatedCost, activeTrip.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Simplified Expense Settlements */}
              <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Pending Expense Settlements</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    Ledger →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {financialSummary.simplifiedTransfers.length === 0 ? (
                    <div className="text-xs text-slate-400 py-8 text-center">
                      🎉 All group balances are settled!
                    </div>
                  ) : (
                    financialSummary.simplifiedTransfers.map((tr, idx) => {
                      const payer = getUserById(tr.fromUserId);
                      const payee = getUserById(tr.toUserId);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-rose-400">{payer.fullName.split(' ')[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-semibold text-emerald-400">{payee.fullName.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">
                              {formatMoney(tr.amount, activeTrip.currency)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRecordSettlement(tr.fromUserId, tr.toUserId, tr.amount)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-[11px] font-semibold transition"
                            >
                              Settle
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Recent Group Chat & Activity Feed */}
              <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span>Recent Group Messages</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    Open Chat →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {tripMessages.slice(-3).map((m) => {
                    const sender = getUserById(m.senderId);
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border text-xs ${
                          darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sky-400">{sender.fullName}</span>
                          <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                        </div>
                        <p className="text-slate-300 line-clamp-2">{m.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: TRIP CREATION, INVITATIONS & ROLE-BASED GROUP MANAGEMENT
        =================================================================== */}
        {activeTab === 'trips' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  <span>Trip Management & Role-Based Access Control</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage trip details, invite members via email/link/code, configure TRIP_ADMIN vs MEMBER permissions, and review the audit log.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateTripOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-semibold shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Create New Trip
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Active Trip Configuration & Members Table */}
              <div className="lg:col-span-2 space-y-5">
                {/* Active Trip Card + Invite Code Sharing */}
                <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          {activeTrip.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {activeTrip.tripType} • {activeTrip.visibility} • Currency: {activeTrip.currency}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold mt-1">{activeTrip.name}</h3>
                      <p className="text-xs text-slate-400">
                        {activeTrip.startingLocation} → {activeTrip.destination} ({activeTrip.startDate} to {activeTrip.endDate})
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyTextSafe(activeTrip.tripCode, 'Trip Join Code')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs font-mono font-bold hover:bg-sky-500/25"
                      >
                        <Copy className="w-3.5 h-3.5" /> Code: {activeTrip.tripCode}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyTextSafe(
                            `https://tripsync.app/join/${activeTrip.tripCode}?token=TS-${activeTrip.id.toUpperCase()}`,
                            'Unique Invite Link'
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/25"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Copy Invite Link
                      </button>
                    </div>
                  </div>

                  {/* Member Role & Permission Matrix */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Group Members & RBAC Permissions ({activeTrip.members.length}/{activeTrip.maxParticipants})
                      </h4>
                      <span className="text-[11px] text-sky-400">
                        Your Effective Role: <strong>{isTripAdmin ? 'TRIP_ADMIN' : 'MEMBER'}</strong>
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeTrip.members.map((m) => {
                        const u = getUserById(m.userId);
                        return (
                          <div
                            key={m.userId}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white font-bold text-xs flex items-center justify-center">
                                  {u.avatar}
                                </div>
                                <span
                                  className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-slate-900 ${
                                    u.online ? 'bg-emerald-400' : 'bg-slate-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold">{u.fullName}</span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      m.memberRole === 'TRIP_ADMIN'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {m.memberRole}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {u.email} • Joined {m.joinedAt}
                                </div>
                              </div>
                            </div>

                            {/* Admin Controls: Toggle Itinerary Permission, Transfer Admin, or Remove */}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={!isTripAdmin}
                                onClick={() => {
                                  setTrips((prev) =>
                                    prev.map((t) =>
                                      t.id === activeTrip.id
                                        ? {
                                            ...t,
                                            members: t.members.map((mem) =>
                                              mem.userId === m.userId
                                                ? { ...mem, canEditItinerary: !mem.canEditItinerary }
                                                : mem
                                            ),
                                          }
                                        : t
                                    )
                                  );
                                  addToast(`Updated itinerary edit permission for ${u.fullName}.`, 'info');
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                                  m.canEditItinerary
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                                } ${!isTripAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {m.canEditItinerary ? '✓ Can Edit Itinerary' : 'View-Only Itinerary'}
                              </button>

                              {isTripAdmin && m.memberRole !== 'TRIP_ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrips((prev) =>
                                      prev.map((t) =>
                                        t.id === activeTrip.id
                                          ? {
                                              ...t,
                                              members: t.members.map((mem) =>
                                                mem.userId === m.userId ? { ...mem, memberRole: 'TRIP_ADMIN' } : mem
                                              ),
                                            }
                                          : t
                                      )
                                    );
                                    logTripActivity('OWNERSHIP_GRANTED', `${currentUser.fullName} promoted ${u.fullName} to TRIP_ADMIN.`);
                                    addToast(`Promoted ${u.fullName} to Trip Admin!`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-[11px] font-semibold flex items-center gap-1"
                                  title="Promote / Transfer Trip Ownership"
                                >
                                  <Crown className="w-3 h-3" /> Make Admin
                                </button>
                              )}

                              {isTripAdmin && m.userId !== currentUser.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrips((prev) =>
                                      prev.map((t) =>
                                        t.id === activeTrip.id
                                          ? { ...t, members: t.members.filter((mem) => mem.userId !== m.userId) }
                                          : t
                                      )
                                    );
                                    logTripActivity('MEMBER_REMOVED', `${currentUser.fullName} removed ${u.fullName} from trip.`);
                                    addToast(`Removed ${u.fullName} from ${activeTrip.name}.`, 'warning');
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Invite by Email & Pending Invitations */}
                <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    <span>Invite Travelers by Email & Manage Pending Invitations</span>
                  </h4>
                  <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2.5 mb-4">
                    <input
                      type="email"
                      value={inviteEmailInput}
                      onChange={(e) => setInviteEmailInput(e.target.value)}
                      placeholder="Enter traveler's email (e.g., devika.rao@tripsync.io)"
                      className={`flex-1 px-3.5 py-2 rounded-xl border text-xs ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shrink-0"
                    >
                      Send Invitation
                    </button>
                  </form>

                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <span className="font-semibold">{inv.email}</span>
                          <span className="text-slate-400 ml-2 font-mono text-[11px]">({inv.token})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'ACCEPTED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : inv.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                          {inv.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setInvitations((prev) =>
                                    prev.map((i) => (i.id === inv.id ? { ...i, status: 'ACCEPTED' } : i))
                                  );
                                  addToast(`Accepted invitation for ${inv.email}!`);
                                }}
                                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px]"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInvitations((prev) =>
                                    prev.map((i) => (i.id === inv.id ? { ...i, status: 'REJECTED' } : i))
                                  );
                                  addToast(`Rejected invitation for ${inv.email}.`, 'info');
                                }}
                                className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[11px]"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Join Trip by Code & Audit Activity Feed */}
              <div className="space-y-5">
                <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-teal-400" />
                    <span>Join a Trip via Code</span>
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Enter a trip code shared by your organizer (e.g., <code className="text-sky-400">LADAKH26</code>, <code className="text-sky-400">KYOTO26</code>, <code className="text-sky-400">AMALFI27</code>).
                  </p>
                  <form onSubmit={handleJoinByCode} className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="Enter Code (e.g. KYOTO26)"
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs uppercase font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs"
                    >
                      Join
                    </button>
                  </form>
                </div>

                {/* Live Trip Activity Log */}
                <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>Trip Activity Feed</span>
                  </h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {activityLogs
                      .filter((l) => l.tripId === activeTrip.id)
                      .map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded-xl border text-xs ${
                            darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-mono font-semibold text-sky-400">{log.actionType}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{log.summary}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: REAL-TIME GROUP CHAT (Spring WebSocket + STOMP Protocol UI)
        =================================================================== */}
        {activeTab === 'chat' && (
          <div className={`rounded-3xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {/* Left Sidebar: Trip Conversations List */}
            <div className={`lg:col-span-3 border-b lg:border-b-0 lg:border-r p-4 flex flex-col justify-between ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span>Trip Channels (STOMP)</span>
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                  </span>
                </div>

                {/* Search Messages in Channel */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search messages..."
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Conversation List */}
                <div className="space-y-1.5">
                  {trips.map((t) => {
                    const active = t.id === activeTrip.id;
                    const count = messages.filter((m) => m.tripId === t.id).length;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTripId(t.id)}
                        className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                            : darkMode
                            ? 'hover:bg-slate-800/60 text-slate-300'
                            : 'hover:bg-slate-200/70 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-bold text-xs truncate">{t.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            /topic/trips/{t.tripCode.toLowerCase()}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulate Real-Time Incoming Teammate Message */}
              <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  Real-Time WebSocket Test Actions
                </div>
                <button
                  type="button"
                  onClick={simulateStompIncomingMessage}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-teal-500/20 to-sky-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Simulate Teammate Reply
                </button>
              </div>
            </div>

            {/* Center Column: Active Conversation Stream & Rich Composer */}
            <div className="lg:col-span-6 flex flex-col justify-between h-[620px]">
              {/* Conversation Header */}
              <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'}`}>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>{activeTrip.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400">
                      #{activeTrip.tripCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeTrip.members.length} members • {users.filter((u) => u.online).length} online now
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickShareToChat('LOCATION', 'Sharing my live GPS position with the group.', {
                        title: `Live Location • ${activeTrip.destination}`,
                        subtitle: 'Accuracy ±5m • Shared via Browser Geolocation',
                        badge: 'LIVE LOCATION',
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-[11px] font-semibold flex items-center gap-1"
                    title="Share Current Location to Chat"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Share GPS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickShareToChat(
                        'EXPENSE',
                        `Sharing latest trip balance summary (${formatMoney(financialSummary.grandTotal, activeTrip.currency)} total).`,
                        {
                          title: `${activeTrip.name} Expense Ledger`,
                          subtitle: `Total: ${formatMoney(financialSummary.grandTotal, activeTrip.currency)} • ${financialSummary.simplifiedTransfers.length} pending settlements`,
                          badge: 'EXPENSE SUMMARY',
                        }
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-semibold flex items-center gap-1"
                    title="Share Expense Card to Chat"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Share Split
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {tripMessages.map((msg) => {
                  const sender = getUserById(msg.senderId);
                  const isMine = msg.senderId === currentUser.id;
                  const repliedMsg = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-sky-400">{sender.fullName}</span>
                        <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                        {msg.isEdited && <span className="text-[10px] italic text-slate-500">(edited)</span>}
                      </div>

                      <div
                        className={`max-w-md rounded-2xl p-3.5 border text-xs space-y-2 ${
                          isMine
                            ? 'bg-sky-600/25 border-sky-500/40 text-slate-100 rounded-br-none'
                            : darkMode
                            ? 'bg-slate-800/90 border-slate-700 text-slate-100 rounded-bl-none'
                            : 'bg-slate-100 border-slate-200 text-slate-900 rounded-bl-none'
                        }`}
                      >
                        {/* Quoted Reply Banner */}
                        {repliedMsg && (
                          <div className="p-2 rounded-lg bg-slate-950/50 border-l-2 border-sky-400 text-[11px] text-slate-300">
                            <span className="font-bold text-sky-400">
                              @{getUserById(repliedMsg.senderId).fullName}:
                            </span>{' '}
                            {repliedMsg.content.slice(0, 70)}
                          </div>
                        )}

                        {msg.isDeleted ? (
                          <p className="italic text-slate-400">🚫 This message was deleted.</p>
                        ) : (
                          <>
                            <p className="leading-relaxed">{msg.content}</p>

                            {/* Rich Shared Card (Location, Itinerary, Expense, Destination, Media) */}
                            {msg.sharedMeta && (
                              <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-950/80 border-slate-700' : 'bg-white border-slate-300'}`}>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-0.5">
                                  {msg.sharedMeta.badge}
                                </div>
                                <div className="font-bold text-xs">{msg.sharedMeta.title}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{msg.sharedMeta.subtitle}</div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Emoji Reactions Strip & Message Controls */}
                        {!msg.isDeleted && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1">
                              {['❤️', '🔥', '👍', '✈️', '🎉'].map((emoji) => {
                                const reactObj = msg.reactions.find((r) => r.emoji === emoji);
                                const count = reactObj ? reactObj.userIds.length : 0;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded-full text-[11px] transition ${
                                      count > 0
                                        ? 'bg-sky-500/30 border border-sky-400/50 text-white'
                                        : 'hover:bg-slate-700/50 opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    {emoji} {count > 0 && count}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <button
                                type="button"
                                onClick={() => setReplyingToId(msg.id)}
                                className="hover:text-sky-400 flex items-center gap-0.5"
                              >
                                <Reply className="w-3 h-3" /> Reply
                              </button>
                              {isMine && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setChatInput(msg.content);
                                    }}
                                    className="hover:text-amber-400"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMessages((prev) =>
                                        prev.map((m) => (m.id === msg.id ? { ...m, isDeleted: true } : m))
                                      )
                                    }
                                    className="hover:text-rose-400"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                              <span className="text-sky-400 font-semibold">✓✓ {msg.deliveryStatus}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTeammateTyping && (
                  <div className="text-xs text-teal-400 italic flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    <span>Teammate is typing via STOMP WebSocket...</span>
                  </div>
                )}
              </div>

              {/* Message Composer Footer */}
              <div className={`p-3 border-t ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                {(replyingToId || editingMessageId) && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-sky-500/15 text-sky-300 text-xs">
                    <span>
                      {editingMessageId ? '✏️ Editing your message' : '↩️ Replying to message'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(null);
                        setEditingMessageId(null);
                        setChatInput('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickShareToChat('DOCUMENT', 'Uploaded boarding passes & hotel vouchers PDF.', {
                        title: 'ladakh_permits_and_vouchers.pdf',
                        subtitle: 'PDF Document • 1.4 MB • Encrypted S3 Storage',
                        badge: 'DOCUMENT ATTACHMENT',
                      })
                    }
                    className={`p-2 rounded-xl border ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-200'}`}
                    title="Attach Media or Ticket PDF"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Message ${activeTrip.name}...`}
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{editingMessageId ? 'Save' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Sidebar: Trip Context, Online Presence & Shared Items */}
            <div className={`lg:col-span-3 border-t lg:border-t-0 lg:border-l p-4 space-y-4 ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Online Presence (Redis Pub/Sub)
              </h4>
              <div className="space-y-2">
                {activeTrip.members.map((m) => {
                  const u = getUserById(m.userId);
                  return (
                    <div key={m.userId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${u.online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className="font-medium">{u.fullName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{u.online ? 'Online' : 'Offline'}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                  One-Click Share to Chat
                </h4>
                <div className="space-y-2">
                  {tripActivities.slice(0, 2).map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() =>
                        handleQuickShareToChat('ITINERARY', `Check out our planned stop: ${act.title}`, {
                          title: `Day ${act.dayNumber} • ${act.startTime} – ${act.title}`,
                          subtitle: `${act.destinationName} • Est. ${formatMoney(act.estimatedCost, activeTrip.currency)}`,
                          badge: 'ITINERARY CARD',
                        })
                      }
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                        darkMode ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50' : 'bg-white border-slate-200 hover:border-sky-500'
                      }`}
                    >
                      <div className="font-semibold text-sky-400 truncate">🗓️ Share: {act.title}</div>
                      <div className="text-[10px] text-slate-400">{act.startTime} • {act.destinationName}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: INTERACTIVE MAP & SNAPCHAT-INSPIRED LIVE LOCATION SHARING
        =================================================================== */}
        {activeTab === 'map' && (
          <div className="space-y-5">
            {/* Privacy-First Live Location Sharing Control Bar */}
            <div className={`rounded-2xl border p-4 sm:p-5 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Privacy-First GPS
                    </span>
                    <h2 className="text-base font-bold">
                      Snapchat Maps-Style Live Group Location & Route Navigator
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Explicit consent required. Locations are never tracked automatically, only authorized trip members can view, and temporary sessions auto-expire in Redis.
                  </p>
                </div>

                {/* Live Location Controls: Duration, Audience, Start & Immediate Stop */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="Location Sharing Duration"
                    value={sharingDuration}
                    onChange={(e) => setSharingDuration(Number(e.target.value) as 15 | 60 | 480)}
                    className={`text-xs rounded-xl px-3 py-2 border font-semibold ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value={15}>⏱️ 15 Minutes</option>
                    <option value={60}>⏱️ 1 Hour</option>
                    <option value={480}>⏱️ 8 Hours</option>
                  </select>

                  <select
                    aria-label="Location Sharing Audience"
                    value={sharingAudience}
                    onChange={(e) => setSharingAudience(e.target.value as 'ENTIRE_GROUP' | 'SELECTED_MEMBERS')}
                    className={`text-xs rounded-xl px-3 py-2 border font-semibold ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="ENTIRE_GROUP">👥 Entire Trip Group</option>
                    <option value="SELECTED_MEMBERS">🔒 Selected Members Only</option>
                  </select>

                  {myLiveSession?.isActive ? (
                    <button
                      type="button"
                      onClick={handleStopLiveLocationImmediately}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>
                        Stop Sharing Immediately ({Math.floor(myLiveSession.remainingSeconds / 60)}m {myLiveSession.remainingSeconds % 60}s left)
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartLiveLocation}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/25"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Enable Live Location Sharing</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Full-Screen Map Experience + Route & Marker Details Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Interactive Map Canvas (8 columns) */}
              <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 relative min-h-[520px] flex flex-col justify-between p-4 select-none">
                {/* Topographic Grid & SVG Route Layer */}
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 2px 2px, rgba(56, 189, 248, 0.35) 1px, transparent 0)',
                    backgroundSize: '28px 28px',
                  }}
                />

                {/* SVG Route Polylines between Trip Destinations */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {showRouteLine && (
                    <>
                      <polyline
                        fill="none"
                        stroke="rgba(14, 165, 233, 0.28)"
                        strokeWidth="1.6"
                        points={mapPins
                          .filter((p) => p.tripId === activeTrip.id)
                          .map((p) => `${p.xPct},${p.yPct}`)
                          .join(' ')}
                      />
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="0.65"
                        strokeDasharray="1.8 1.2"
                        points={mapPins
                          .filter((p) => p.tripId === activeTrip.id)
                          .map((p) => `${p.xPct},${p.yPct}`)
                          .join(' ')}
                      />
                    </>
                  )}
                </svg>

                {/* Top Map Layer Controls */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800">
                    {['ALL', 'DESTINATION', 'HOTEL', 'RESTAURANT', 'ATTRACTION'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setMapCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                          mapCategoryFilter === cat
                            ? 'bg-sky-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowRouteLine(!showRouteLine)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold ${
                        showRouteLine ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-slate-400'
                      }`}
                    >
                      🛣️ Route Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMemberAvatars(!showMemberAvatars)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold ${
                        showMemberAvatars ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'
                      }`}
                    >
                      👥 Live Avatars
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPinFormOpen(!newPinFormOpen)}
                      className="px-2.5 py-1 rounded-xl bg-sky-500 text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Marker
                    </button>
                  </div>
                </div>

                {/* Add Custom Marker Inline Popover */}
                {newPinFormOpen && (
                  <form
                    onSubmit={handleAddCustomPin}
                    className="relative z-20 mt-2 max-w-md bg-slate-900/95 border border-sky-500/40 rounded-2xl p-3.5 flex flex-wrap items-center gap-2 shadow-2xl"
                  >
                    <input
                      type="text"
                      value={newPinName}
                      onChange={(e) => setNewPinName(e.target.value)}
                      placeholder="Custom marker name (e.g., Magnetic Hill Viewpoint)"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                    <select
                      aria-label="Marker Category"
                      value={newPinCategory}
                      onChange={(e) => setNewPinCategory(e.target.value as MapPinItem['category'])}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="ATTRACTION">Attraction</option>
                      <option value="RESTAURANT">Restaurant</option>
                      <option value="HOTEL">Hotel</option>
                      <option value="DESTINATION">Destination</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold"
                    >
                      Drop Pin
                    </button>
                  </form>
                )}

                {/* Interactive Map Pins & Live Member Avatar Markers */}
                <div className="relative flex-1 my-4">
                  {mapPins
                    .filter((p) => p.tripId === activeTrip.id)
                    .filter((p) => mapCategoryFilter === 'ALL' || p.category === mapCategoryFilter)
                    .map((pin, index) => {
                      const isSelected = pin.id === selectedPinId;
                      return (
                        <button
                          key={pin.id}
                          type="button"
                          onClick={() => setSelectedPinId(pin.id)}
                          style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all ${
                            isSelected ? 'z-20 scale-110' : 'z-10 hover:scale-105'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-lg text-xs font-bold whitespace-nowrap ${
                              isSelected
                                ? 'bg-sky-500 text-white border-white'
                                : 'bg-slate-900/90 text-slate-100 border-sky-500/50 hover:border-sky-400'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-slate-950/60 text-[10px] flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span>{pin.name.split(' ')[0]}</span>
                          </div>
                        </button>
                      );
                    })}

                  {/* Snapchat Maps-Style Live Member Avatars */}
                  {showMemberAvatars &&
                    liveLocations
                      .filter((s) => s.tripId === activeTrip.id && s.isActive)
                      .map((sess) => {
                        const u = getUserById(sess.userId);
                        return (
                          <div
                            key={sess.userId}
                            style={{ left: `${sess.xPct}%`, top: `${sess.yPct}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
                          >
                            <div className="relative">
                              <span className="w-10 h-10 rounded-full bg-emerald-500/30 animate-ping absolute inset-0" />
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center ring-2 ring-white shadow-xl">
                                {u.avatar}
                              </div>
                            </div>
                            <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/95 border border-emerald-500/50 text-[10px] font-bold text-emerald-300 whitespace-nowrap">
                              {u.fullName.split(' ')[0]} • {sess.batteryPct}% • {sess.lastUpdated}
                            </span>
                          </div>
                        );
                      })}
                </div>

                {/* Bottom Map Telemetry Legend */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                      <span>Route: {activeTrip.startingLocation} → {activeTrip.destination}</span>
                    </span>
                    <span className="hidden sm:inline text-slate-500">|</span>
                    <span className="hidden sm:inline text-emerald-400 font-semibold">
                      PostGIS Spatial Engine + Redis TTL Presence
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click any marker to inspect route ETA & details
                  </span>
                </div>
              </div>

              {/* Right Sidebar: Selected Marker Details & Member Live GPS Roster (4 columns) */}
              <div className="lg:col-span-4 space-y-4">
                {(() => {
                  const selectedPin =
                    mapPins.find((p) => p.id === selectedPinId) ||
                    mapPins.find((p) => p.tripId === activeTrip.id) ||
                    mapPins[0];
                  return (
                    <div className={`rounded-2xl border p-5 space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                          {selectedPin.category}
                        </span>
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {selectedPin.rating} ({selectedPin.reviewsCount})
                        </span>
                      </div>
                      <h3 className="font-bold text-base">{selectedPin.name}</h3>
                      <p className="text-xs text-slate-400">{selectedPin.address}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedPin.description}
                      </p>

                      <div className={`p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <div className="text-[10px] text-slate-400">Leg Distance</div>
                          <div className="font-bold text-sky-400">{selectedPin.distanceFromPrevKm ?? 3.2} km</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Est. Travel Time</div>
                          <div className="font-bold text-teal-400">{selectedPin.estimatedTimeFromPrev || '10 mins'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => addDiscoveredPlaceToItinerary(selectedPin)}
                          className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold"
                        >
                          + Add to Day {selectedDay}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBookmarkPlace(selectedPin.id)}
                          className={`p-2 rounded-xl border ${
                            selectedPin.saved
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : darkMode
                              ? 'border-slate-700 text-slate-400'
                              : 'border-slate-300 text-slate-600'
                          }`}
                          title="Save Destination"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Live Location Status Roster */}
                <div className={`rounded-2xl border p-5 space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    <span>Group Live Location Sessions</span>
                  </h4>
                  <div className="space-y-2.5">
                    {activeTrip.members.map((m) => {
                      const u = getUserById(m.userId);
                      const sess = liveLocations.find((s) => s.tripId === activeTrip.id && s.userId === m.userId);
                      const active = Boolean(sess?.isActive);
                      return (
                        <div
                          key={m.userId}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-teal-500 text-white font-bold text-[10px] flex items-center justify-center">
                              {u.avatar}
                            </div>
                            <div>
                              <div className="font-semibold">{u.fullName}</div>
                              <div className="text-[10px] text-slate-400">
                                {active
                                  ? `Updated ${sess?.lastUpdated} • ${sess?.audienceScope}`
                                  : sess
                                  ? `Stopped (${sess.lastUpdated})`
                                  : 'Location sharing off'}
                              </div>
                            </div>
                          </div>
                          {active && sess ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              {Math.floor(sess.remainingSeconds / 60)}m left
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                              Private
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: COLLABORATIVE DAY-WISE ITINERARY PLANNER
        =================================================================== */}
        {activeTab === 'itinerary' && (
          <div className="space-y-6">
            {/* Top Bar: Day Tabs, 4 View Switchers (Timeline, Calendar, Map, List), Add Activity */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span>Collaborative Day-Wise Itinerary ({activeTrip.name})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Switch between Day-wise Timeline, Calendar Grid, Route Map, and Compact List views. Reorder stops and track completion.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 4 View Switchers */}
                <div className={`flex items-center p-1 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  {(['TIMELINE', 'CALENDAR', 'MAP', 'LIST'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setItineraryViewMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        itineraryViewMode === mode
                          ? 'bg-sky-500 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActivityModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-semibold shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add Activity
                </button>
              </div>
            </div>

            {/* Day Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    selectedDay === d
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : darkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Day {d} {d === 1 ? '– Arrival & Exploration' : d === 2 ? '– Nubra & Khardung La' : '– Pangong Lake'}
                </button>
              ))}
            </div>

            {/* VIEW 1: DAY-WISE TIMELINE VIEW */}
            {itineraryViewMode === 'TIMELINE' && (
              <div className="space-y-4">
                {dayActivities.length === 0 ? (
                  <div className={`rounded-2xl border p-10 text-center space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-bold">No activities scheduled for Day {selectedDay} yet</div>
                    <button
                      type="button"
                      onClick={() => setActivityModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold"
                    >
                      + Add First Activity for Day {selectedDay}
                    </button>
                  </div>
                ) : (
                  dayActivities.map((act, idx) => (
                    <div
                      key={act.id}
                      className={`rounded-2xl border p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        act.completed
                          ? darkMode
                            ? 'bg-slate-900/40 border-emerald-500/30'
                            : 'bg-emerald-50/40 border-emerald-200'
                          : darkMode
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Completion Checkbox & Time */}
                        <button
                          type="button"
                          onClick={() =>
                            setItinerary((prev) =>
                              prev.map((a) => (a.id === act.id ? { ...a, completed: !a.completed } : a))
                            )
                          }
                          className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                            act.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'border-slate-600 hover:border-sky-400'
                          }`}
                          title="Mark Activity Completed"
                        >
                          {act.completed && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 text-sky-400 font-mono text-xs font-bold">
                              {act.startTime} – {act.endTime}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-teal-300">
                              {act.category}
                            </span>
                            <span className="text-xs font-bold text-emerald-400">
                              Est. {formatMoney(act.estimatedCost, activeTrip.currency)}
                            </span>
                          </div>
                          <h3 className={`font-bold text-base ${act.completed ? 'line-through text-slate-400' : ''}`}>
                            {act.title}
                          </h3>
                          <div className="text-xs text-sky-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {act.destinationName}
                          </div>
                          <p className="text-xs text-slate-400">{act.description}</p>
                          {act.notes && (
                            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 inline-block mt-1">
                              📌 Note: {act.notes} • Booking Ref: <strong>{act.bookingRef}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Controls: Reorder Up/Down, Navigate on Map, Delete */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveActivityOrder(act.id, 'UP')}
                          className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-30"
                          title="Move Earlier"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === dayActivities.length - 1}
                          onClick={() => moveActivityOrder(act.id, 'DOWN')}
                          className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-30"
                          title="Move Later"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('map')}
                          className="px-3 py-2 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-xs font-semibold flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Route
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItinerary((prev) => prev.filter((a) => a.id !== act.id));
                            addToast(`Removed "${act.title}" from itinerary.`, 'info');
                          }}
                          className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/30"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VIEW 2: CALENDAR GRID VIEW */}
            {itineraryViewMode === 'CALENDAR' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((d) => {
                  const acts = tripActivities
                    .filter((a) => a.dayNumber === d)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  return (
                    <div
                      key={d}
                      className={`rounded-2xl border p-4 space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-sm text-amber-400">Day {d} Schedule</span>
                        <span className="text-xs text-slate-400">{acts.length} activities</span>
                      </div>
                      <div className="space-y-2">
                        {acts.map((a) => (
                          <div
                            key={a.id}
                            className={`p-2.5 rounded-xl border text-xs ${
                              darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="font-mono text-[10px] text-sky-400">
                              {a.startTime} – {a.endTime}
                            </div>
                            <div className="font-bold mt-0.5">{a.title}</div>
                            <div className="text-[11px] text-slate-400">{a.destinationName}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW 3: ITINERARY ROUTE MAP VIEW */}
            {itineraryViewMode === 'MAP' && (
              <div className={`rounded-2xl border p-6 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Day {selectedDay} Stop-by-Stop Navigation Route</h3>
                  <span className="text-xs text-teal-400">Google Directions API Polyline Sync</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {dayActivities.map((act, i) => (
                    <div
                      key={act.id}
                      className={`p-3.5 rounded-xl border relative ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-sky-400">
                        STOP #{i + 1} • {act.startTime}
                      </div>
                      <div className="font-bold text-xs mt-1">{act.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{act.destinationName}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 4: COMPACT TABLE LIST VIEW */}
            {itineraryViewMode === 'LIST' && (
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-xs">
                  <thead className={darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-600'}>
                    <tr>
                      <th className="p-3">Day / Time</th>
                      <th className="p-3">Activity</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3">Booking Ref</th>
                      <th className="p-3 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tripActivities.map((a) => (
                      <tr key={a.id}>
                        <td className="p-3 font-mono text-sky-400">
                          Day {a.dayNumber} • {a.startTime}
                        </td>
                        <td className="p-3 font-semibold">{a.title}</td>
                        <td className="p-3 text-slate-400">{a.destinationName}</td>
                        <td className="p-3 font-mono text-teal-400">{a.bookingRef}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {formatMoney(a.estimatedCost, activeTrip.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 6: EXPENSE MANAGEMENT & SPLITWISE-LIKE SETTLEMENT ENGINE
        =================================================================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Header & Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span>Expense Ledger & Debt Simplification Engine ({activeTrip.name})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supports Equal, Exact/Custom, Percentage, Share-based, and Unequal splits with BigDecimal-grade cent/paise rounding reconciliation.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTransitiveDemoMode(!transitiveDemoMode);
                    addToast(
                      !transitiveDemoMode
                        ? 'Loaded Transitive Debt Simplification Demo: A owes B ₹1,000 & B owes C ₹1,000 → Simplified to A pays C ₹1,000!'
                        : 'Restored full trip expense ledger.',
                      'info'
                    );
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
                    transitiveDemoMode
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : darkMode
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  {transitiveDemoMode ? '✓ Showing A→B→C Simplification Demo' : '⚡ Test A→B→C Debt Simplification'}
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add Expense
                </button>
              </div>
            </div>

            {/* Member Balance Scorecard Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {activeTrip.members.map((m) => {
                const u = getUserById(m.userId);
                const paid = financialSummary.totalPaid[m.userId] || 0;
                const owed = financialSummary.totalOwed[m.userId] || 0;
                const net = financialSummary.netBalance[m.userId] || 0;
                return (
                  <div
                    key={m.userId}
                    className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white font-bold text-xs flex items-center justify-center">
                        {u.avatar}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{u.fullName}</div>
                        <div className="text-[10px] text-slate-400"> Paid: {formatMoney(paid, activeTrip.currency)}</div>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400">Share: {formatMoney(owed, activeTrip.currency)}</span>
                      <span
                        className={`text-xs font-extrabold ${
                          net > 0 ? 'text-emerald-400' : net < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {net > 0 ? `+${formatMoney(net, activeTrip.currency)}` : formatMoney(net, activeTrip.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Debt Simplification Engine & Recharts Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 Columns: Debt Simplification Engine & Settlement History */}
              <div className={`lg:col-span-5 rounded-2xl border p-5 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Debt Simplification Engine</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Minimizes total transfers across the group
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                    {financialSummary.simplifiedTransfers.length} Transfers
                  </span>
                </div>

                {transitiveDemoMode && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <strong>Active Specification Example:</strong> Aarav owes Priya ₹1,000, and Priya owes Rohan ₹1,000. Simplified to a single transfer: <strong>Aarav pays Rohan ₹1,000</strong>.
                  </div>
                )}

                <div className="space-y-2.5">
                  {financialSummary.simplifiedTransfers.map((tr, i) => {
                    const fromU = getUserById(tr.fromUserId);
                    const toU = getUserById(tr.toUserId);
                    return (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                          darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span className="text-rose-400">{fromU.fullName}</span>
                            <span className="text-slate-400">pays</span>
                            <span className="text-emerald-400">{toU.fullName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Simplified net settlement
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold">
                            {formatMoney(tr.amount, activeTrip.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRecordSettlement(tr.fromUserId, tr.toUserId, tr.amount)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Settlement History */}
                {tripSettlements.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Recorded Settlement History
                    </h4>
                    {tripSettlements.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-300"
                      >
                        <span>
                          ✓ {getUserById(s.fromUserId).fullName.split(' ')[0]} paid{' '}
                          {getUserById(s.toUserId).fullName.split(' ')[0]}
                        </span>
                        <span className="font-bold">
                          {formatMoney(s.amount, s.currency)} ({s.settledAt})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 7 Columns: Recharts Category & Member Contribution Visualizations */}
              <div className={`lg:col-span-7 rounded-2xl border p-5 grid grid-cols-1 md:grid-cols-2 gap-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Spend by Category</span>
                  </h4>
                  <div className="relative h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialSummary.categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                        >
                          {financialSummary.categoryChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Paid vs Individual Share</span>
                  </h4>
                  <div className="relative h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialSummary.memberChartData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Share" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Ledger List */}
            <div className={`rounded-2xl border p-5 space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-sm">Detailed Expense Transactions</h3>
              <div className="space-y-3">
                {tripExpenses.map((exp) => {
                  const payer = getUserById(exp.paidByUserId);
                  return (
                    <div
                      key={exp.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                            {exp.category}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                            Split: {exp.splitMethod}
                          </span>
                          <span className="text-[11px] text-slate-400">{exp.date}</span>
                        </div>
                        <h4 className="font-bold text-sm">{exp.title}</h4>
                        <p className="text-xs text-slate-400">{exp.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {exp.splits.map((sp) => (
                            <span
                              key={sp.userId}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-300"
                            >
                              {getUserById(sp.userId).fullName.split(' ')[0]}: {formatMoney(sp.owedAmount, exp.currency)} ({sp.percentage}%)
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-emerald-400">
                          {formatMoney(exp.amount, exp.currency)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Paid by <strong>{payer.fullName}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 7: EXPLORE & DESTINATION DISCOVERY (Google Places Integration)
        =================================================================== */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ExploreIcon className="w-5 h-5 text-sky-400" />
                  <span>Explore & Destination Discovery</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Discover top-rated destinations, hotels, restaurants, and tourist attractions. Bookmark favorites or add directly to your trip itinerary.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={exploreQuery}
                  onChange={(e) => setExploreQuery(e.target.value)}
                  placeholder="Search places, restaurants, attractions..."
                  className={`px-3.5 py-2 rounded-xl border text-xs w-64 ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(['ALL', 'DESTINATION', 'HOTEL', 'RESTAURANT', 'ATTRACTION'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setExploreCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    exploreCategory === cat
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : darkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Places Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExplorePlaces.map((place) => (
                <div
                  key={place.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400">
                        {place.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {place.rating} ({place.reviewsCount})
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleBookmarkPlace(place.id)}
                          className={`p-1.5 rounded-lg border ${
                            place.saved
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : 'border-slate-700 text-slate-400'
                          }`}
                          title="Bookmark Destination"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-base">{place.name}</h3>
                    <div className="text-xs text-sky-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {place.address}
                    </div>
                    <p className="text-xs text-slate-400">{place.description}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => addDiscoveredPlaceToItinerary(place)}
                      className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold"
                    >
                      + Add to Itinerary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickShareToChat('DESTINATION', `Discovered ${place.name} (${place.rating}★) on TripSync Explore!`, {
                          title: place.name,
                          subtitle: `${place.address} • ${place.rating}★ (${place.reviewsCount} reviews)`,
                          badge: 'DISCOVERED PLACE',
                        });
                        setActiveTab('chat');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                        darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Share to Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 8: SMART NOTIFICATION SYSTEM & PREFERENCES
        =================================================================== */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Notification Center */}
            <div className={`lg:col-span-7 rounded-2xl border p-5 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-sky-400" />
                    <span>Smart Notification Center ({unreadNotifCount} Unread)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Powered by Spring Scheduler & Firebase Cloud Messaging (FCM) with deduplication
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      pushNotification(
                        'TRIP',
                        'Scheduled Trip Reminder (Spring Scheduler)',
                        `${activeTrip.name} starts soon! Check your Inner Line Permits and offline maps.`,
                        'itinerary'
                      );
                      addToast('Triggered scheduled trip reminder notification!', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold"
                  >
                    ⚡ Test Scheduled Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                      addToast('Marked all notifications as read.', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Mark All Read
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                      !n.isRead
                        ? darkMode
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-sky-50 border-sky-200'
                        : darkMode
                        ? 'bg-slate-950/50 border-slate-800 opacity-75'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                          {n.category}
                        </span>
                        <span className="text-[11px] text-slate-400">{n.timestamp}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                        )}
                      </div>
                      <h4 className="font-bold text-xs">{n.title}</h4>
                      <p className="text-xs text-slate-400">{n.body}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
                          );
                          setActiveTab(n.targetTab);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white text-xs font-semibold"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Columns: Notification Preferences & Quiet Hours */}
            <div className={`lg:col-span-5 rounded-2xl border p-5 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>Notification Channels & Quiet Hours</span>
              </h3>

              <div className="space-y-3 text-xs">
                {[
                  { key: 'pushEnabled', label: 'Browser / Mobile Push Notifications (FCM)' },
                  { key: 'emailEnabled', label: 'Email Notifications & Digests' },
                  { key: 'inAppEnabled', label: 'In-App Real-Time Alerts' },
                  { key: 'tripAlerts', label: 'Trip Invitations & Countdown Reminders' },
                  { key: 'itineraryAlerts', label: 'Itinerary Changes & 30-Min Activity Alerts' },
                  { key: 'chatAlerts', label: 'Chat Mentions & Replies' },
                  { key: 'expenseAlerts', label: 'New Expenses & Settlement Reminders' },
                  { key: 'locationAlerts', label: 'Group Live Location Start/Stop Alerts' },
                ].map((item) => {
                  const enabled = Boolean(notifPrefs[item.key as keyof typeof notifPrefs]);
                  return (
                    <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                      <span>{item.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifPrefs((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof prev],
                          }));
                          addToast(`Updated ${item.label}`, 'info');
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                          enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {enabled ? 'Enabled' : 'Muted'}
                      </button>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <div className="font-semibold mb-2">Quiet Hours (Do Not Disturb)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={notifPrefs.quietHoursStart}
                        onChange={(e) => setNotifPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={notifPrefs.quietHoursEnd}
                        onChange={(e) => setNotifPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 9: SYSTEM ARCHITECTURE, 24-TABLE POSTGIS SCHEMA & REST API v1
        =================================================================== */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-400" />
                <span>TripSync Full-Stack Production Architecture & Database Blueprint</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                All backend source files, Flyway SQL migrations, JUnit 5 + Testcontainers tests, Playwright E2E specs, and Docker Compose manifests are packaged in <code className="text-sky-400">tripsync-fullstack.zip</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-xs font-bold text-sky-400 uppercase mb-2 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" /> Spring Boot 3.3 / Java 21 Modules
                  </div>
                  <ul className="text-xs space-y-1 text-slate-300 font-mono">
                    <li>com.tripsync.auth (JWT + OAuth2 + BCrypt)</li>
                    <li>com.tripsync.user (Profiles & Preferences)</li>
                    <li>com.tripsync.trip (Lifecycle & Codes)</li>
                    <li>com.tripsync.member (RBAC: TRIP_ADMIN/USER)</li>
                    <li>com.tripsync.chat (WebSocket STOMP /topic)</li>
                    <li>com.tripsync.location (PostGIS + Redis TTL)</li>
                    <li>com.tripsync.itinerary (Day/Activity CRUD)</li>
                    <li>com.tripsync.expense (BigDecimal Engine)</li>
                    <li>com.tripsync.settlement (Debt Simplifier)</li>
                    <li>com.tripsync.notification (FCM + Scheduler)</li>
                  </ul>
                </div>

                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-xs font-bold text-emerald-400 uppercase mb-2 flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> 24 Normalized PostgreSQL + PostGIS Tables
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    {[
                      'users', 'user_profiles', 'refresh_tokens', 'trips', 'trip_members',
                      'trip_invitations', 'trip_activity_logs', 'conversations', 'conversation_members',
                      'messages', 'message_attachments', 'message_reactions', 'locations',
                      'location_sharing_sessions', 'itinerary_days', 'itinerary_activities',
                      'itinerary_participants', 'expenses', 'expense_participants', 'expense_splits',
                      'settlements', 'notifications', 'notification_preferences', 'saved_places', 'uploaded_files'
                    ].map((tbl) => (
                      <span key={tbl} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {tbl}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-xs font-bold text-amber-400 uppercase mb-2 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" /> RESTful API v1 Endpoints
                  </div>
                  <ul className="text-[11px] space-y-1 font-mono text-slate-300">
                    <li>POST /api/v1/auth/register | /login | /refresh</li>
                    <li>GET/POST /api/v1/trips & /trips/&#123;id&#125;</li>
                    <li>POST /api/v1/trips/&#123;id&#125;/invitations | /join</li>
                    <li>GET/POST /api/v1/trips/&#123;id&#125;/messages</li>
                    <li>GET/POST /api/v1/trips/&#123;id&#125;/itinerary</li>
                    <li>POST /api/v1/trips/&#123;id&#125;/expenses</li>
                    <li>GET /api/v1/trips/&#123;id&#125;/balances</li>
                    <li>POST /api/v1/trips/&#123;id&#125;/settlements</li>
                    <li>POST /api/v1/trips/&#123;id&#125;/location/share | /stop</li>
                    <li>GET /api/v1/notifications</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          MODAL 1: CREATE NEW TRIP MODAL
      ===================================================================== */}
      {createTripOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-lg w-full rounded-3xl border p-6 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Create a New Trip</h3>
              <button type="button" onClick={() => setCreateTripOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateTrip} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Trip Name *</label>
                <input
                  type="text"
                  required
                  value={newTripForm.name}
                  onChange={(e) => setNewTripForm({ ...newTripForm, name: e.target.value })}
                  placeholder="e.g., Spiti Valley Winter Expedition"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Starting Location *</label>
                  <input
                    type="text"
                    required
                    value={newTripForm.startingLocation}
                    onChange={(e) => setNewTripForm({ ...newTripForm, startingLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={newTripForm.destination}
                    onChange={(e) => setNewTripForm({ ...newTripForm, destination: e.target.value })}
                    placeholder="e.g., Kaza, Himachal Pradesh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newTripForm.startDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">End Date</label>
                  <input
                    type="date"
                    value={newTripForm.endDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Trip Type</label>
                  <select
                    value={newTripForm.tripType}
                    onChange={(e) => setNewTripForm({ ...newTripForm, tripType: e.target.value as 'GROUP' | 'SOLO' })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="GROUP">Group</option>
                    <option value="SOLO">Solo</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Visibility</label>
                  <select
                    value={newTripForm.visibility}
                    onChange={(e) => setNewTripForm({ ...newTripForm, visibility: e.target.value as 'PRIVATE' | 'PUBLIC' })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Currency</label>
                  <select
                    value={newTripForm.currency}
                    onChange={(e) => setNewTripForm({ ...newTripForm, currency: e.target.value as 'INR' | 'USD' | 'EUR' | 'JPY' })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Cover Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Himalayas', url: COVER_LADAKH },
                    { label: 'Kyoto Pagoda', url: COVER_KYOTO },
                    { label: 'Amalfi Coast', url: COVER_AMALFI },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setNewTripForm({ ...newTripForm, coverImage: c.url })}
                      className={`p-2 rounded-xl border text-center ${
                        newTripForm.coverImage === c.url ? 'border-sky-500 bg-sky-500/20' : 'border-slate-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateTripOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold"
                >
                  Create Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD ITINERARY ACTIVITY MODAL
      ===================================================================== */}
      {activityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-lg w-full rounded-3xl border p-6 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Activity to Day {selectedDay}</h3>
              <button type="button" onClick={() => setActivityModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="e.g., Sunset Photography at Shanti Stupa"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Destination / Place *</label>
                <input
                  type="text"
                  required
                  value={activityForm.destinationName}
                  onChange={(e) => setActivityForm({ ...activityForm, destinationName: e.target.value })}
                  placeholder="e.g., Changspa Hill, Leh"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={activityForm.startTime}
                    onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">End Time</label>
                  <input
                    type="time"
                    value={activityForm.endTime}
                    onChange={(e) => setActivityForm({ ...activityForm, endTime: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Est. Cost ({activeTrip.currency})</label>
                  <input
                    type="number"
                    value={activityForm.estimatedCost}
                    onChange={(e) => setActivityForm({ ...activityForm, estimatedCost: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={activityForm.category}
                    onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value as ItineraryActivity['category'] })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="SIGHTSEEING">Sightseeing</option>
                    <option value="FOOD">Food & Dining</option>
                    <option value="HOTEL">Hotel / Check-in</option>
                    <option value="TRANSPORT">Transport / Flight</option>
                    <option value="ADVENTURE">Adventure</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Booking Reference</label>
                  <input
                    type="text"
                    value={activityForm.bookingRef}
                    onChange={(e) => setActivityForm({ ...activityForm, bookingRef: e.target.value })}
                    placeholder="e.g., PNR-88412"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ADD EXPENSE & MULTI-METHOD SPLIT CALCULATOR MODAL
      ===================================================================== */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`max-w-xl w-full rounded-3xl border p-6 space-y-4 my-8 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Group Expense & Split Calculator</h3>
              <button type="button" onClick={() => setExpenseModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">Expense Title *</label>
                  <input
                    type="text"
                    required
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="e.g., Nubra Glamping Tents (5 Members)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Total Amount ({activeTrip.currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    {[
                      'ACCOMMODATION', 'FOOD', 'TRANSPORTATION', 'FUEL',
                      'FLIGHTS', 'TRAIN_TICKETS', 'ACTIVITIES', 'SHOPPING', 'MISCELLANEOUS'
                    ].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Paid By</label>
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    {activeTrip.members.map((m) => {
                      const u = getUserById(m.userId);
                      return (
                        <option key={m.userId} value={m.userId}>
                          {u.fullName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Split Method</label>
                  <select
                    value={expenseSplitMethod}
                    onChange={(e) => {
                      const m = e.target.value as SplitMethod;
                      setExpenseSplitMethod(m);
                      const count = expenseParticipants.length || 1;
                      const amt = parseFloat(expenseAmount || '0');
                      const nextVals: Record<string, number> = {};
                      expenseParticipants.forEach((uid) => {
                        if (m === 'PERCENTAGE') nextVals[uid] = Math.round((100 / count) * 100) / 100;
                        else if (m === 'SHARES') nextVals[uid] = 1;
                        else nextVals[uid] = Math.round((amt / count) * 100) / 100;
                      });
                      setExpenseCustomValues(nextVals);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sky-400 font-bold"
                  >
                    <option value="EQUAL">Equal Split</option>
                    <option value="EXACT">Custom / Exact Amount</option>
                    <option value="PERCENTAGE">Percentage Split (%)</option>
                    <option value="SHARES">Share-Based Split (Units)</option>
                    <option value="UNEQUAL">Unequal Split</option>
                  </select>
                </div>
              </div>

              {/* Participant Split Breakdown & Custom Inputs */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-400">
                  Participant Breakdown ({expenseSplitMethod})
                </div>
                {activeTrip.members.map((m) => {
                  const u = getUserById(m.userId);
                  const included = expenseParticipants.includes(m.userId);
                  const computed = liveSplitPreview.splits.find((s) => s.userId === m.userId);
                  return (
                    <div key={m.userId} className="flex items-center justify-between gap-2 py-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExpenseParticipants((prev) => [...prev, m.userId]);
                            } else {
                              setExpenseParticipants((prev) => prev.filter((id) => id !== m.userId));
                            }
                          }}
                        />
                        <span className="font-medium">{u.fullName}</span>
                      </label>

                      {included && expenseSplitMethod !== 'EQUAL' && (
                        <input
                          type="number"
                          step="0.01"
                          value={expenseCustomValues[m.userId] ?? 0}
                          onChange={(e) =>
                            setExpenseCustomValues((prev) => ({
                              ...prev,
                              [m.userId]: parseFloat(e.target.value || '0'),
                            }))
                          }
                          className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-right"
                        />
                      )}

                      <span className="font-mono font-bold text-emerald-400">
                        {included && computed
                          ? `${formatMoney(computed.owedAmount, activeTrip.currency)} (${computed.percentage}%)`
                          : 'Excluded'}
                      </span>
                    </div>
                  );
                })}

                {liveSplitPreview.error && (
                  <div className="text-rose-400 text-[11px] font-semibold pt-1">
                    ⚠️ {liveSplitPreview.error}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: AUTHENTICATION, OAUTH2 & USER PROFILE MANAGEMENT MODAL
      ===================================================================== */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-3xl border p-6 space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">
                  {authMode === 'profile'
                    ? 'User Profile & Security'
                    : authMode === 'login'
                    ? 'Sign In to TripSync'
                    : authMode === 'register'
                    ? 'Create TripSync Account'
                    : 'Reset Password'}
                </h3>
              </div>
              <button type="button" onClick={() => setAuthModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Auth Mode Switcher Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 text-xs">
              {(['profile', 'login', 'register', 'forgot'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAuthMode(m)}
                  className={`py-1.5 rounded-lg font-semibold capitalize ${
                    authMode === m ? 'bg-sky-500 text-white' : 'text-slate-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {authMode === 'profile' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white font-extrabold text-base flex items-center justify-center">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{currentUser.fullName}</div>
                    <div className="text-slate-400">@{currentUser.username} • {currentUser.email}</div>
                    <div className="text-emerald-400 font-semibold mt-0.5">
                      Role: {currentUser.role} • Joined {currentUser.createdAt}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Phone</div>
                    <div className="font-semibold">{currentUser.phone}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Country & Currency</div>
                    <div className="font-semibold">{currentUser.country} ({currentUser.preferredCurrency})</div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Travel Preferences</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentUser.travelPreferences.map((pref) => (
                      <span key={pref} className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addToast('Revoked all active JWT refresh tokens across devices.', 'warning');
                      setAuthModalOpen(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout All Devices
                  </button>
                </div>
              </div>
            )}

            {(authMode === 'login' || authMode === 'register' || authMode === 'forgot') && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsAuthenticated(true);
                  setAuthModalOpen(false);
                  addToast(
                    authMode === 'forgot'
                      ? 'Password reset token dispatched to your email!'
                      : 'Authenticated via JWT + Refresh Token Rotation!'
                  );
                }}
                className="space-y-3 text-xs"
              >
                {authMode === 'register' && (
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                )}
                <input
                  type="email"
                  required
                  defaultValue={currentUser.email}
                  placeholder="Email address"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
                {authMode !== 'forgot' && (
                  <input
                    type="password"
                    required
                    defaultValue="••••••••••••"
                    placeholder="Password"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold"
                >
                  {authMode === 'login'
                    ? 'Sign In with JWT'
                    : authMode === 'register'
                    ? 'Register & Verify Email'
                    : 'Send Password Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalOpen(false);
                    addToast('Authenticated via Google OAuth 2.0!', 'info');
                  }}
                  className="w-full py-2 rounded-xl border border-slate-700 hover:bg-slate-800 font-semibold flex items-center justify-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-400" /> Continue with Google OAuth 2.0
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
