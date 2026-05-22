export interface WorkLog {
  id: string;
  userId: string;
  dateGregorian: string; // YYYY-MM-DD
  dateHijri: string;     // Arabic Islamic Date string
  company: string;       // Default: "Al Tamdin Al Watania"
  location: string;      // Site or work location
  description: string;   // Details of tasks completed
  hours: number;         // Standard work hours
  overtime: number;      // Overtime hours
  notes?: string;        // Custom remarks or audit notes
  createdAt: string;     // Created date ISO
  updatedAt: string;     // Updated date ISO
}

export type FilterPeriod = 'all' | 'week' | 'month' | 'monthly' | 'custom';
