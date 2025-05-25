import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Equipment, User, CheckoutRecord, Notification, Supplier, Category } from '../types';
import { sampleEquipment, sampleUsers, sampleCheckouts, sampleNotifications, sampleCategories, sampleSuppliers } from '../data/sampleData';
import { addDays, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface AppContextType {
  equipment: Equipment[];
  users: User[];
  checkouts: CheckoutRecord[];
  notifications: Notification[];
  categories: Category[];
  suppliers: Supplier[];
  equipmentStatuses: string[];
  userRoles: string[];
  statusConfigs: StatusConfig[];
  roleConfigs: RoleConfig[];
  addEquipment: (equipment: Omit<Equipment, 'id'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  addUser: (user: Omit<User, 'id' | 'dateCreated'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  checkoutEquipment: (equipmentId: string, userId: string, dueDate: string, notes?: string) => void;
  returnEquipment: (checkoutId: string, notes?: string) => void;
  markNotificationAsRead: (id: string) => void;
  getEquipmentById: (id: string) => Equipment | undefined;
  getUserById: (id: string) => User | undefined;
  getCheckoutById: (id: string) => CheckoutRecord | undefined;
  getOverdueCheckouts: () => CheckoutRecord[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  importEquipment: (equipment: Omit<Equipment, 'id'>[]) => void;
  updateEquipmentStatuses: (statuses: string[]) => void;
  updateUserRoles: (roles: string[]) => void;
  updateStatusConfigs: (configs: StatusConfig[]) => void;
  updateRoleConfigs: (configs: RoleConfig[]) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [equipment, setEquipment] = useState<Equipment[]>(sampleEquipment);
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>(sampleCheckouts);
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [categories, setCategories] = useState<Category[]>(sampleCategories);
  const [suppliers, setSuppliers] = useState<Supplier[]>(sampleSuppliers);
  const [equipmentStatuses, setEquipmentStatuses] = useState<string[]>([
    'available',
    'checked-out',
    'maintenance',
    'retired'
  ]);
  const [userRoles, setUserRoles] = useState<string[]>([
    'admin',
    'user'
  ]);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([
    { id: 'available', name: 'available', color: '#10b981' },
    { id: 'checked-out', name: 'checked-out', color: '#f59e0b' },
    { id: 'maintenance', name: 'maintenance', color: '#3b82f6' },
    { id: 'retired', name: 'retired', color: '#64748b' },
  ]);

  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([
    { id: 'admin', name: 'admin', color: '#8b5cf6' },
    { id: 'user', name: 'user', color: '#06b6d4' },
  ]);

  useEffect(() => {
    const checkOverdueItems = () => {
      const activeCheckouts = checkouts.filter(c => c.status === 'active');
      const now = new Date();
      
      activeCheckouts.forEach(checkout => {
        const dueDate = parseISO(checkout.dueDate);
        
        if (isPast(dueDate) && checkout.status !== 'overdue') {
          setCheckouts(prev => 
            prev.map(c => 
              c.id === checkout.id ? { ...c, status: 'overdue' } : c
            )
          );
          
          const equipment = getEquipmentById(checkout.equipmentId);
          const user = getUserById(checkout.userId);
          
          if (equipment && user) {
            const newNotification: Notification = {
              id: crypto.randomUUID(),
              type: 'overdue',
              message: `${equipment.name} checked out by ${user.name} is overdue`,
              date: new Date().toISOString(),
              read: false,
              relatedId: checkout.id
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            
            toast.error(`${equipment.name} is overdue!`);
          }
        }
      });
    };

    checkOverdueItems();
    
    const interval = setInterval(checkOverdueItems, 3600000);
    
    return () => clearInterval(interval);
  }, [checkouts]);

  const addEquipment = (equipmentData: Omit<Equipment, 'id'>) => {
    const newEquipment: Equipment = {
      ...equipmentData,
      id: crypto.randomUUID(),
    };
    
    setEquipment(prev => [...prev, newEquipment]);
    toast.success('Equipment added successfully');
  };

  const updateEquipment = (id: string, updates: Partial<Equipment>) => {
    setEquipment(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
    toast.success('Equipment updated successfully');
  };

  const deleteEquipment = (id: string) => {
    const isCheckedOut = checkouts.some(
      checkout => checkout.equipmentId === id && checkout.status === 'active'
    );

    if (isCheckedOut) {
      toast.error('Cannot delete equipment that is currently checked out');
      return;
    }

    setEquipment(prev => prev.filter(item => item.id !== id));
    toast.success('Equipment deleted successfully');
  };

  const addUser = (userData: Omit<User, 'id' | 'dateCreated'>) => {
    const newUser: User = {
      ...userData,
      id: crypto.randomUUID(),
      dateCreated: new Date().toISOString()
    };
    
    setUsers(prev => [...prev, newUser]);
    toast.success('User added successfully');
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === id ? { ...user, ...updates } : user
      )
    );
    toast.success('User updated successfully');
  };

  const deleteUser = (id: string) => {
    const hasActiveCheckouts = checkouts.some(
      checkout => checkout.userId === id && ['active', 'overdue'].includes(checkout.status)
    );

    if (hasActiveCheckouts) {
      toast.error('Cannot delete user with active checkouts');
      return;
    }

    setUsers(prev => prev.filter(user => user.id !== id));
    toast.success('User deleted successfully');
  };

  const checkoutEquipment = (equipmentId: string, userId: string, dueDate: string, notes?: string) => {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    
    if (!equipmentItem) {
      toast.error('Equipment not found');
      return;
    }
    
    if (equipmentItem.status !== 'available') {
      toast.error('Equipment is not available for checkout');
      return;
    }

    const newCheckout: CheckoutRecord = {
      id: crypto.randomUUID(),
      equipmentId,
      userId,
      checkoutDate: new Date().toISOString(),
      dueDate,
      status: 'active',
      notes
    };
    
    updateEquipment(equipmentId, { status: 'checked-out' });
    
    setCheckouts(prev => [...prev, newCheckout]);
    
    toast.success('Equipment checked out successfully');
  };

  const returnEquipment = (checkoutId: string, notes?: string) => {
    const checkout = checkouts.find(item => item.id === checkoutId);
    
    if (!checkout) {
      toast.error('Checkout record not found');
      return;
    }
    
    if (checkout.status === 'returned') {
      toast.error('Equipment has already been returned');
      return;
    }

    const updatedCheckout: CheckoutRecord = {
      ...checkout,
      status: 'returned',
      returnDate: new Date().toISOString(),
      notes: notes ? `${checkout.notes || ''}\nReturn notes: ${notes}` : checkout.notes
    };
    
    setCheckouts(prev => 
      prev.map(item => 
        item.id === checkoutId ? updatedCheckout : item
      )
    );
    
    updateEquipment(checkout.equipmentId, { status: 'available' });
    
    toast.success('Equipment returned successfully');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const getEquipmentById = (id: string) => {
    return equipment.find(item => item.id === id);
  };

  const getUserById = (id: string) => {
    return users.find(user => user.id === id);
  };

  const getCheckoutById = (id: string) => {
    return checkouts.find(checkout => checkout.id === id);
  };

  const getOverdueCheckouts = () => {
    return checkouts.filter(checkout => checkout.status === 'overdue');
  };

  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: crypto.randomUUID()
    };
    
    setCategories(prev => [...prev, newCategory]);
    toast.success('Category added successfully');
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => 
      prev.map(category => 
        category.id === id ? { ...category, ...updates } : category
      )
    );
    toast.success('Category updated successfully');
  };

  const deleteCategory = (id: string) => {
    const equipmentUsingCategory = equipment.some(item => item.category === id);

    if (equipmentUsingCategory) {
      toast.error('Cannot delete category that is in use');
      return;
    }

    setCategories(prev => prev.filter(category => category.id !== id));
    toast.success('Category deleted successfully');
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: crypto.randomUUID()
    };
    
    setSuppliers(prev => [...prev, newSupplier]);
    toast.success('Supplier added successfully');
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => 
      prev.map(supplier => 
        supplier.id === id ? { ...supplier, ...updates } : supplier
      )
    );
    toast.success('Supplier updated successfully');
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
    toast.success('Supplier deleted successfully');
  };

  const importEquipment = (equipmentList: Omit<Equipment, 'id'>[]) => {
    const newEquipment = equipmentList.map(item => ({
      ...item,
      id: crypto.randomUUID(),
    }));
    
    setEquipment(prev => [...prev, ...newEquipment]);
    toast.success(`${newEquipment.length} equipment items imported successfully`);
  };

  const updateEquipmentStatuses = (statuses: string[]) => {
    setEquipmentStatuses(statuses);
    toast.success('Equipment statuses updated successfully');
  };

  const updateUserRoles = (roles: string[]) => {
    setUserRoles(roles);
    toast.success('User roles updated successfully');
  };

  const updateStatusConfigs = (configs: StatusConfig[]) => {
    setStatusConfigs(configs);
    toast.success('Status configurations updated successfully');
  };

  const updateRoleConfigs = (configs: RoleConfig[]) => {
    setRoleConfigs(configs);
    toast.success('Role configurations updated successfully');
  };

  return (
    <AppContext.Provider
      value={{
        equipment,
        users,
        checkouts,
        notifications,
        categories,
        suppliers,
        equipmentStatuses,
        userRoles,
        statusConfigs,
        roleConfigs,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        addUser,
        updateUser,
        deleteUser,
        checkoutEquipment,
        returnEquipment,
        markNotificationAsRead,
        getEquipmentById,
        getUserById,
        getCheckoutById,
        getOverdueCheckouts,
        addCategory,
        updateCategory,
        deleteCategory,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        importEquipment,
        updateEquipmentStatuses,
        updateUserRoles,
        updateStatusConfigs,
        updateRoleConfigs
      }}
    >
      {children}
    </AppContext.Provider>
  );
};