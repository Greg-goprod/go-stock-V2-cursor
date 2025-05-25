import { Equipment, User, CheckoutRecord, Notification, Category, Supplier } from '../types';
import { addDays, subDays } from 'date-fns';

// Helper function to get dates relative to today
const getDate = (dayOffset: number) => {
  return new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000).toISOString();
};

// Sample categories
export const sampleCategories: Category[] = [
  { id: 'cat-1', name: 'Electronics', description: 'Electronic devices and accessories' },
  { id: 'cat-2', name: 'Tools', description: 'Hand and power tools' },
  { id: 'cat-3', name: 'Office Equipment', description: 'Office furniture and equipment' },
  { id: 'cat-4', name: 'Safety Equipment', description: 'Personal protective equipment' },
];

// Sample suppliers
export const sampleSuppliers: Supplier[] = [
  { 
    id: 'sup-1', 
    name: 'TechSource Inc.', 
    contactPerson: 'John Smith', 
    email: 'john@techsource.com', 
    phone: '555-123-4567', 
    website: 'https://techsource.example.com' 
  },
  { 
    id: 'sup-2', 
    name: 'ToolMaster Supply', 
    contactPerson: 'Sarah Johnson', 
    email: 'sarah@toolmaster.com', 
    phone: '555-987-6543', 
    website: 'https://toolmaster.example.com' 
  },
  { 
    id: 'sup-3', 
    name: 'Office Solutions', 
    contactPerson: 'Mike Brown', 
    email: 'mike@officesolutions.com', 
    phone: '555-456-7890' 
  },
];

// Sample equipment
export const sampleEquipment: Equipment[] = [
  {
    id: 'eq-1',
    name: 'Laptop Dell XPS 13',
    description: 'Dell XPS 13 laptop with 16GB RAM and 512GB SSD',
    category: 'cat-1',
    serialNumber: 'DL-XPS-5678',
    status: 'available',
    addedDate: getDate(-90),
    lastMaintenance: getDate(-15),
    imageUrl: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
    supplier: 'sup-1',
    location: 'Main Office'
  },
  {
    id: 'eq-2',
    name: 'Power Drill',
    description: 'DeWalt 20V MAX Cordless Drill',
    category: 'cat-2',
    serialNumber: 'DW-20V-1234',
    status: 'checked-out',
    addedDate: getDate(-120),
    imageUrl: 'https://images.pexels.com/photos/1029243/pexels-photo-1029243.jpeg?auto=compress&cs=tinysrgb&w=600',
    supplier: 'sup-2',
    location: 'Workshop'
  },
  {
    id: 'eq-3',
    name: 'Office Chair',
    description: 'Ergonomic office chair with lumbar support',
    category: 'cat-3',
    serialNumber: 'OC-ERG-8765',
    status: 'available',
    addedDate: getDate(-60),
    imageUrl: 'https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=600',
    supplier: 'sup-3',
    location: 'Storage Room'
  },
  {
    id: 'eq-4',
    name: 'Safety Helmet',
    description: 'Hard hat for construction site use',
    category: 'cat-4',
    serialNumber: 'SH-HAT-9012',
    status: 'available',
    addedDate: getDate(-45),
    imageUrl: 'https://images.pexels.com/photos/159358/construction-site-build-construction-work-159358.jpeg?auto=compress&cs=tinysrgb&w=600',
    supplier: 'sup-2',
    location: 'Safety Locker'
  },
  {
    id: 'eq-5',
    name: 'Monitor 27"',
    description: 'Dell 27" 4K monitor',
    category: 'cat-1',
    serialNumber: 'DL-MON-3456',
    status: 'available',
    addedDate: getDate(-75),
    imageUrl: 'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=600',
    supplier: 'sup-1',
    location: 'Main Office'
  },
  {
    id: 'eq-6',
    name: 'Circular Saw',
    description: 'Milwaukee 7-1/4" Circular Saw',
    category: 'cat-2',
    serialNumber: 'MS-CS-7890',
    status: 'maintenance',
    addedDate: getDate(-100),
    lastMaintenance: getDate(-5),
    imageUrl: 'https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=600',
    supplier: 'sup-2',
    location: 'Workshop'
  }
];

// Sample users
export const sampleUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '06 12 34 56 78',
    department: 'IT',
    role: 'admin',
    dateCreated: getDate(-180)
  },
  {
    id: 'user-2',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '06 23 45 67 89',
    department: 'Maintenance',
    role: 'user',
    dateCreated: getDate(-150)
  },
  {
    id: 'user-3',
    name: 'Carol Williams',
    email: 'carol@example.com',
    phone: '06 34 56 78 90',
    department: 'Office Administration',
    role: 'user',
    dateCreated: getDate(-100)
  },
  {
    id: 'user-4',
    name: 'Dave Brown',
    email: 'dave@example.com',
    phone: '06 45 67 89 01',
    department: 'Construction',
    role: 'user',
    dateCreated: getDate(-90)
  }
];

// Sample checkouts
export const sampleCheckouts: CheckoutRecord[] = [
  {
    id: 'co-1',
    equipmentId: 'eq-2',
    userId: 'user-4',
    checkoutDate: getDate(-5),
    dueDate: getDate(2),
    status: 'active',
    notes: 'Needed for site work'
  },
  {
    id: 'co-2',
    equipmentId: 'eq-1',
    userId: 'user-3',
    checkoutDate: getDate(-20),
    dueDate: getDate(-10),
    returnDate: getDate(-9),
    status: 'returned',
    notes: 'Temporary use while main computer was being repaired'
  },
  {
    id: 'co-3',
    equipmentId: 'eq-5',
    userId: 'user-2',
    checkoutDate: getDate(-15),
    dueDate: getDate(-5),
    status: 'overdue',
    notes: 'Needed for special project'
  }
];

// Sample notifications
export const sampleNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'overdue',
    message: 'Monitor 27" checked out by Bob Johnson is overdue',
    date: getDate(-2),
    read: false,
    relatedId: 'co-3'
  },
  {
    id: 'notif-2',
    type: 'maintenance',
    message: 'Circular Saw is scheduled for maintenance',
    date: getDate(-7),
    read: true,
    relatedId: 'eq-6'
  },
  {
    id: 'notif-3',
    type: 'system',
    message: 'System backup completed successfully',
    date: getDate(-10),
    read: true
  }
];