import React from 'react';
import { useStatusColors } from '../../hooks/useStatusColors';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const { statusConfigs, getStatusColor } = useStatusColors();
  
  const statusConfig = statusConfigs.find(s => s.id === status);
  const statusName = statusConfig?.name || status;
  const statusColor = getStatusColor(status);

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${className}`}
      style={{ backgroundColor: statusColor }}
    >
      {statusName}
    </span>
  );
};

export default StatusBadge;