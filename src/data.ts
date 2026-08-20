import { z } from 'zod';
import {
  PilotSchema,
  AircraftSchema,
  AccountSchema,
  FlightSchema,
  VendorSchema,
} from './services/validation';

export type Pilot = z.infer<typeof PilotSchema>;
export type Aircraft = z.infer<typeof AircraftSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type Flight = z.infer<typeof FlightSchema>;
export type Vendor = z.infer<typeof VendorSchema>;

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
}

export const mockPilots: Pilot[] = [];
export const mockAircrafts: Aircraft[] = [];
export const mockAccounts: Account[] = [];
export const mockCustomZones: CustomZone[] = [];
export const mockFlights: Flight[] = [];
export const mockVendors: Vendor[] = [];
