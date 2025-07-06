import React from 'react';
import { useStatusColors } from '../../hooks/useStatusColors';

interface StatusBadgeProps {
  status: string;
  availableQuantity?: number;
  totalQuantity?: number;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  availableQuantity, 
  totalQuantity, 
  className = '' 
}) => {
  const { statusConfigs, getStatusColor } = useStatusColors();
  
  const statusConfig = statusConfigs.find(s => s.id === status);
  const statusName = statusConfig?.name || status;
  const statusColor = getStatusColor(status);
  
  // Format the display text
  let displayText = statusName;
  if (status === 'available' && availableQuantity !== undefined && totalQuantity !== undefined) {
    if (totalQuantity === 0) {
      displayText = '0/0';
    } else {
      displayText = `${availableQuantity}/${totalQuantity}`;
    }
  }

  // Format the display text
  const getDisplayText = () => {
    if (status === 'available' && availableQuantity !== undefined && totalQuantity !== undefined) {
      if (totalQuantity === 0) {
        return '0/0';
      }
      return `${availableQuantity}/${totalQuantity}`;
    }
    return statusName;
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${className}`}
      style={{ backgroundColor: statusColor }}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;