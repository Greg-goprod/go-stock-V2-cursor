export interface Equipment {
  id: string;
  name: string;
  description: string;
  category: string;
  serialNumber: string;
  status: 'available' | 'checked-out' | 'maintenance' | 'retired';
  addedDate: string;
  lastMaintenance?: string;
  imageUrl?: string;
  supplier?: string;
  location?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: 'admin' | 'user';
  dateCreated: string;
}

export interface CheckoutRecord {
  id: string;
  equipmentId: string;
  userId: string;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'overdue';
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'overdue' | 'maintenance' | 'system';
  message: string;
  date: string;
  read: boolean;
  relatedId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  website?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}