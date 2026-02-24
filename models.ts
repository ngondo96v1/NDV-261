import mongoose, { Schema, Document } from 'mongoose';
import { UserRank, Notification as INotification, LoanRecord as ILoanRecord, LogEntry as ILogEntry } from './types';

// User Schema
export interface IUserModel extends Document {
  phone: string;
  fullName: string;
  idNumber: string;
  balance: number;
  totalLimit: number;
  rank: UserRank;
  rankProgress: number;
  isLoggedIn: boolean;
  isAdmin: boolean;
  pendingUpgradeRank: UserRank | null;
  rankUpgradeBill?: string;
  address?: string;
  joinDate?: string;
  idFront?: string;
  idBack?: string;
  refZalo?: string;
  relationship?: string;
  lastLoanSeq?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  updatedAt: number;
}

const UserSchema: Schema = new Schema({
  id: { type: String }, // Optional, can use _id if it's a valid ObjectId
  phone: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  idNumber: { type: String, required: true },
  balance: { type: Number, default: 0 },
  totalLimit: { type: Number, default: 0 },
  rank: { type: String, default: 'standard' },
  rankProgress: { type: Number, default: 0 },
  isLoggedIn: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  pendingUpgradeRank: { type: String, default: null },
  rankUpgradeBill: { type: String },
  address: { type: String },
  joinDate: { type: String },
  idFront: { type: String },
  idBack: { type: String },
  refZalo: { type: String },
  relationship: { type: String },
  lastLoanSeq: { type: Number, default: 0 },
  bankName: { type: String },
  bankAccountNumber: { type: String },
  bankAccountHolder: { type: String },
  updatedAt: { type: Number, default: Date.now }
});

// Loan Schema
export interface ILoanModel extends Document {
  id: string; // Custom ID from frontend
  userId: string;
  userName: string;
  amount: number;
  date: string;
  createdAt: string;
  status: string;
  fine?: number;
  billImage?: string;
  signature?: string;
  rejectionReason?: string;
  updatedAt: number;
}

const LoanSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  createdAt: { type: String, required: true },
  status: { type: String, required: true },
  fine: { type: Number, default: 0 },
  billImage: { type: String },
  signature: { type: String },
  rejectionReason: { type: String },
  updatedAt: { type: Number, default: Date.now }
});

// Notification Schema
export interface INotificationModel extends Document {
  id: string; // Custom ID from frontend
  userId: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
}

const NotificationSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, required: true }
});

// System Settings Schema
export interface ISystemSettingsModel extends Document {
  budget: number;
  rankProfit: number;
}

const SystemSettingsSchema: Schema = new Schema({
  budget: { type: Number, default: 30000000 },
  rankProfit: { type: Number, default: 0 }
});

// Log Schema
export interface ILogModel extends Document {
  user: string;
  time: string;
  action: string;
  ip: string;
  device: string;
}

const LogSchema: Schema = new Schema({
  user: { type: String, required: true },
  time: { type: String, required: true },
  action: { type: String, required: true },
  ip: { type: String },
  device: { type: String }
});

export const UserModel = mongoose.model<IUserModel>('User', UserSchema);
export const LoanModel = mongoose.model<ILoanModel>('Loan', LoanSchema);
export const NotificationModel = mongoose.model<INotificationModel>('Notification', NotificationSchema);
export const SystemSettingsModel = mongoose.model<ISystemSettingsModel>('SystemSettings', SystemSettingsSchema);
export const LogModel = mongoose.model<ILogModel>('Log', LogSchema);
