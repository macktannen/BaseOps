import { z } from 'zod';
import {
  PilotSchema,
  PassengerSchema,
  AccountSchema,
  AircraftSchema,
  VendorSchema,
} from './services/validation';

export interface FlightUpload {
  id?: string | number;
  name?: string;
  type?: string;
  size?: number;
  url?: string | null;
  storagePath?: string;
  [key: string]: any;
}

export interface FlightLog {
  signature?: {
    name: string;
    timestamp: string;
    isoTimestamp?: string;
  } | null;
  isLocked?: boolean;
  aircraftTotals?: Record<string, any>;
  auditLog?: string[];
  [key: string]: any;
}

export interface Flight {
  id: string | number;
  flightNumber?: string | number;
  title?: string;
  date?: string;
  status?: string;
  aircraftId?: string;
  accountId?: string;
  tag?: string;
  legs?: FlightLeg[];
  comments?: string;
  opsNotes?: string;
  expenses?: Expense[];
  uploads?: FlightUpload[];
  flightLog?: FlightLog;
  [key: string]: any;
}

export interface LocationRef {
  id: string;
  type?: 'airport' | 'custom' | string;
  name?: string;
  title?: string;
  lat?: number;
  lon?: number;
  municipality?: string;
  state?: string;
  [key: string]: any;
}

export interface FlightLeg {
  departure?: LocationRef | null;
  destination?: LocationRef | null;
  takeoffTime?: string;
  landTime?: string;
  duration?: number;
  distance?: number | null;
  passengers?: string[];
  pilots?: string[];
  pilotId?: string;
  pilotRoles?: Record<string, string>;
  date?: string;
  arrDate?: string;
  [key: string]: any;
}

export interface Pilot extends z.infer<typeof PilotSchema> {
  [key: string]: any;
}

export interface Passenger extends z.infer<typeof PassengerSchema> {
  isCrew?: boolean;
  emergencyContact?: string;
  medicalNotes?: string;
  notes?: string;
  [key: string]: any;
}

export interface Account extends z.infer<typeof AccountSchema> {
  [key: string]: any;
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  groups?: string[];
  group?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

export interface CustomZone {
  id: string;
  title?: string;
  address?: string;
  type?: string;
  lat?: number;
  lon?: number;
  coordinates?: string;
  contactName?: string;
  contactPhone?: string;
  hazards?: string;
  usageCount?: number;
  [key: string]: any;
}

export interface Aircraft extends z.infer<typeof AircraftSchema> {
  auditLog?: string[];
  [key: string]: any;
}

export interface Vendor extends z.infer<typeof VendorSchema> {
  [key: string]: any;
}

export interface ReceiptFile {
  storagePath?: string;
  name?: string;
  type?: string;
  size?: number;
  url?: string | null;
  error?: string | null;
}

export interface Expense {
  id: string | number;
  category: string;
  vendor?: string;
  amount: number | string;
  date: string;
  payer?: string;
  description?: string;
  fuelType?: string;
  gallons?: number | string;
  purchaser?: string;
  receiptFiles?: ReceiptFile[];
  receiptCount?: number;
  hasReceipt?: boolean;
  isPaid?: boolean;
  autoParsed?: boolean;
  _dirty?: boolean;
  _saved?: boolean;
  _pendingDeletes?: string[];
  flightId?: string | number;
  flightNumber?: string | number;
  flightTitle?: string;
  flightDate?: string;
  flightAircraft?: string;
  flightAccount?: string;
  isDepartment?: boolean;
  [key: string]: any;
}

export interface CalendarNote {
  id: string | number;
  title: string;
  content?: string;
  [key: string]: any;
}

export interface CalendarViewSettings {
  compactMode?: boolean;
  showCrewPills?: boolean;
  fields?: {
    aircraft?: boolean;
    account?: boolean;
    pilot?: boolean;
    route?: boolean;
    passengers?: boolean;
  };
  hiddenTags?: string[];
  hiddenStatuses?: string[];
  aircraftFilter?: string[];
  accountFilter?: string[];
  pilotFilter?: string[];
  schedulesGridColorBy?: string;
  [key: string]: any;
}

export type Personnel =
  | (Pilot & { type: 'pilot' })
  | (Passenger & { type: 'crew' })
  | (Passenger & { type: 'pax' });
