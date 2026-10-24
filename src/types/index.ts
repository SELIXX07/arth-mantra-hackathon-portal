export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'participant' | 'admin' | 'market_admin' | 'superadmin';

export const PES_DEPARTMENTS = [
  'BCOM GENERAL',
  'BCOM ACCA',
  'CFA',
  'CMA',
  'B.Com (Hons.)',
  'BBA (General)',
  'BBA (Business Analytics)',
  'BBA (Hospitality & Event Management)',
  'MBA (Master of Business Administration)',
  'B.Tech - Computer Science & Engineering (CSE)',
  'B.Tech - CSE (AI & ML)',
  'B.Tech - Electronics & Communication Engineering (ECE)',
  'B.Tech - Mechanical Engineering (ME)',
  'B.Tech - Electrical & Electronics Engineering (EEE)',
  'B.Tech - Biotechnology (BT)',
  'BCA (Bachelor of Computer Applications)',
  'B.Sc (Computer Science)',
  'B.Sc (Data Science)',
  'MCA (Master of Computer Applications)',
  'M.Tech (Engineering)',
  'B.Des (Design)',
  'B.Arch (Architecture)',
  'BBA LLB (Hons.)',
  'BA LLB (Hons.)',
  'B.Pharm (Bachelor of Pharmacy)',
  'Pharm.D (Doctor of Pharmacy)',
  'B.Sc (Psychology / Nursing)',
  'Other / Department of Choice'
] as const;

export const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'] as const;

export const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export const RESIDENCE_OPTIONS = ['Hostelite', 'Non-Hostelite'] as const;
export type ResidenceType = typeof RESIDENCE_OPTIONS[number];

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  srn?: string;
  department?: string;
  semester?: string;
  section?: string;
  residence_type?: string;
  role: UserRole;
  created_at: string;
  must_reset_password?: boolean;
}

export interface TeamMember {
  name: string;
  srn: string;
  phone: string;
  email: string;
  department?: string;
  semester?: string;
  section?: string;
  residence_type?: string;
  assigned_problem_statement?: ProblemStatement;
}

export interface Hackathon {
  id: string;
  name: string;
  date: string;
  entry_fee: number;
  max_teams: number;
  description: string;
  poster_url?: string;
  upi_id?: string;
  qr_code_url?: string;
  whatsapp_link?: string;
  is_active: boolean;
  show_registered_teams?: boolean;
  created_by: string;
  created_at: string;
}

export interface TeamRegistration {
  id: string;
  hackathon_id: string;
  hackathon_name: string;
  leader_user_id: string;
  leader_email: string;
  team_name: string;
  members: TeamMember[];   // member[0] = leader, member[1..5] = rest
  payment_screenshot_url: string;
  utr_reference?: string;
  status: RegistrationStatus;
  rejection_comment?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  // Score tracking fields (ARTHMANTRA 6-Round Structure & Innovation Credit System)
  score?: number;
  round_1_score?: number; // Round 1: The Industry Blueprint
  round_2_score?: number; // Round 2: The Intelligence Drop
  round_3_score?: number; // Round 3: The Central Budget & Live Market
  round_4_score?: number; // Round 4: The Resource Auction
  round_5_score?: number; // Round 5: The Hidden Insider Challenge
  round_6_score?: number; // Round 6: The Boardroom Showdown

  // Innovation Credit (IC) System & Wallet Mechanics
  ic_starting?: number; // Starting capital (10,000 IC per team)
  ic_stock_trades?: number; // Net share purchases & trading tax
  ic_auction_spent?: number; // Winning bids in Resource Auction
  ic_r5_wager?: number; // Declared wager in Round 5 (max 20% liquid IC or 1,000 IC cap)
  ic_r5_result?: 'won' | 'lost' | 'none'; // Outcome: +50% bonus if won, stake lost if lost
  ic_balance?: number; // Remaining liquid Innovation Credits
  brownie_points?: number; // Brownie points (recorded separately from Innovation Credits)

  judge_notes?: string;
  assigned_problem_statement?: ProblemStatement;
  created_at: string;
  updated_at: string;
}

export interface ProblemStatement {
  title: string;
  track: string;
  description: string;
  resources?: string;
  deliverables?: string;
  assigned_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  added_by: string;
  first_login_pending: boolean;
  temporary_password?: string;
  created_at: string;
}
