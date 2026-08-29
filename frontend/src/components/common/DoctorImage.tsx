import React, { useState } from 'react';
import { Stethoscope } from 'lucide-react';

interface DoctorImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  className?: string;
  doctorName?: string;
}

export const DoctorImage: React.FC<DoctorImageProps> = ({
  src,
  alt,
  className = '',
  doctorName = 'Doctor',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  // Generate initials for avatar fallback
  const initials = doctorName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'MD';

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-tr from-teal-700 to-teal-500 text-white font-bold select-none ${className}`}
        title={alt}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <Stethoscope className="w-1/3 h-1/3 text-teal-200" />
          <span className="text-xs tracking-wider opacity-90">{initials}</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
      {...rest}
    />
  );
};
