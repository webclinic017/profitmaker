
import React from 'react';
import { GuideLineType } from '@/types/alignmentGuides';

interface AlignmentGuidesProps {
  guideLines: GuideLineType[];
}

const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guideLines }) => {
  return (
    <>
      {guideLines.map((guideLine, index) => (
        <div
          key={`${guideLine.orientation}-${guideLine.position}-${index}`}
          className="absolute pointer-events-none"
          style={{
            left: guideLine.orientation === 'vertical' ? `${guideLine.position}px` : `${guideLine.start}px`,
            top: guideLine.orientation === 'horizontal' ? `${guideLine.position}px` : `${guideLine.start}px`,
            width: guideLine.orientation === 'vertical' ? '1px' : `${guideLine.length}px`,
            height: guideLine.orientation === 'horizontal' ? '1px' : `${guideLine.length}px`,
            backgroundColor: '#2D9CDB',
            boxShadow: '0 0 0 1px rgba(45, 156, 219, 0.5)',
            zIndex: 9999,
          }}
        />
      ))}
    </>
  );
};

export default AlignmentGuides;
