import { z } from 'zod';

export const FlightLegSchema = z.object({
  departure: z.any().nullable().optional(),
  destination: z.any().nullable().optional(),
  takeoffTime: z.string().optional(),
  landTime: z.string().optional(),
  duration: z.number().optional(),
  distance: z.number().nullable().optional(),
  passengers: z.array(z.string()).optional(),
  pilots: z.array(z.string()).optional(),
  pilotId: z.string().optional(),
  date: z.string().optional(),
  arrDate: z.string().optional(),
}).passthrough();

export const FlightSchema = z.object({
  id: z.union([z.string(), z.number()]),
  flightNumber: z.union([z.string(), z.number()]).optional(),
  title: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional(),
  aircraftId: z.string().optional(),
  accountId: z.string().optional(),
  tag: z.string().optional(),
  legs: z.array(z.any()).optional(),
  comments: z.string().optional(),
  opsNotes: z.string().optional(),
  expenses: z.array(z.any()).optional(),
  uploads: z.array(z.any()).optional(),
  flightLog: z.any().optional(),
}).passthrough();

export const AircraftSchema = z.object({
  id: z.string(),
  tailNumber: z.string(),
  make: z.string().optional(),
  model: z.string().optional(),
  totalHours: z.number().optional(),
  hobbs: z.number().optional(),
  engine1Hours: z.number().optional(),
  engine2Hours: z.number().optional(),
  engine1Cycles: z.number().optional(),
  engine2Cycles: z.number().optional(),
  landings: z.number().optional(),
  dualEngine: z.boolean().optional(),
  status: z.string().optional(),
});

export const PilotSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  medicalExpiry: z.string().optional(),
  isPilot: z.boolean().optional(),
});

export const PassengerSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
});

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export const VendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const ExpenseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  category: z.string(),
  vendor: z.string().optional(),
  amount: z.number().or(z.string().transform(Number)),
  date: z.string(),
  payer: z.string().optional(),
  description: z.string().optional(),
  fuelType: z.string().optional(),
  gallons: z.number().or(z.string().transform(Number)).optional(),
  purchaser: z.string().optional(),
});

export function validateFlight(data: unknown) {
  return FlightSchema.safeParse(data);
}

export function validateAircraft(data: unknown) {
  return AircraftSchema.safeParse(data);
}

export function validatePilot(data: unknown) {
  return PilotSchema.safeParse(data);
}

export function validatePassenger(data: unknown) {
  return PassengerSchema.safeParse(data);
}

export function validateAccount(data: unknown) {
  return AccountSchema.safeParse(data);
}

export function validateVendor(data: unknown) {
  return VendorSchema.safeParse(data);
}

export function validateExpense(data: unknown) {
  return ExpenseSchema.safeParse(data);
}
