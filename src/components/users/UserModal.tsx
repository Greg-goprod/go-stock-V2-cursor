import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { User } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, user }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: 'user'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        department: user.department,
        role: user.role
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        role: 'user'
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSubmit = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        department: formData.department,
        role: formData.role
      };

      if (user) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update(dataToSubmit)
          .eq('id', user.id);

        if (error) throw error;
        toast.success(t('userUpdated'));
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert([dataToSubmit]);

        if (error) throw error;
        toast.success(t('userAdded'));
      }

      onClose();
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        role: 'user'
      });
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || t('errorSavingUser'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? t('editUser') : t('addUser')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('name')} *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('email')} *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('phone')}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('department')} *
          </label>
          <input
            type="text"
            name="department"
            required
            value={formData.department}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('role')} *
          </label>
          <select
            name="role"
            required
            value={formData.role}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="user">{t('user')}</option>
            <option value="admin">{t('admin')}</option>
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? t('saving') : user ? t('save') : t('add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;