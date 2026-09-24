import React from 'react';
import { RoutePlanner } from './RoutePlanner';

interface DestinationSearchProps {
  onPickOnMap?: (field: 'source' | 'destination') => void;
  className?: string;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  onPickOnMap,
  className,
}) => {
  return <RoutePlanner onPickOnMap={onPickOnMap} className={className} />;
};

