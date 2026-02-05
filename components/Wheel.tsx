
import React from 'react';
import { FoodItem } from '../types';

interface WheelProps {
  items: FoodItem[];
  rotation: number;
  isSpinning: boolean;
}

const Wheel: React.FC<WheelProps> = ({ items, rotation, isSpinning }) => {
  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 10;
  const totalItems = items.length;
  const anglePerSlice = 360 / totalItems;

  return (
    <div className="relative flex justify-center items-center">
      {/* The Arrow Pointer */}
      <div className="absolute -top-4 z-20 text-red-500 text-4xl transform -translate-x-1/2 left-1/2">
        <i className="fas fa-caret-down"></i>
      </div>

      <div 
        className="relative transition-transform duration-[4000ms] ease-out shadow-2xl rounded-full border-8 border-white bg-white"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset dx="2" dy="2" />
              <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
              <feFlood floodColor="#000000" floodOpacity="0.1" />
              <feComposite in2="shadowDiff" operator="in" />
              <feComposite in2="SourceGraphic" operator="over" />
            </filter>
          </defs>
          
          {items.map((item, index) => {
            const startAngle = index * anglePerSlice;
            const endAngle = (index + 1) * anglePerSlice;
            const x1 = center + radius * Math.cos((startAngle - 90) * (Math.PI / 180));
            const y1 = center + radius * Math.sin((startAngle - 90) * (Math.PI / 180));
            const x2 = center + radius * Math.cos((endAngle - 90) * (Math.PI / 180));
            const y2 = center + radius * Math.sin((endAngle - 90) * (Math.PI / 180));
            
            const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            // Calculate text rotation
            const textAngle = startAngle + anglePerSlice / 2;
            const textX = center + (radius / 1.6) * Math.cos((textAngle - 90) * (Math.PI / 180));
            const textY = center + (radius / 1.6) * Math.sin((textAngle - 90) * (Math.PI / 180));

            return (
              <g key={item.id}>
                <path d={pathData} fill={item.color} stroke="white" strokeWidth="2" />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize={totalItems > 8 ? "10" : "14"}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {item.name}
                </text>
              </g>
            );
          })}
          
          {/* Inner Circle Decoration */}
          <circle cx={center} cy={center} r="15" fill="white" className="shadow-md" />
        </svg>
      </div>
    </div>
  );
};

export default Wheel;
