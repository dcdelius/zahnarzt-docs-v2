import React from 'react';

export default function BrandLogo({ subtitle = "AI DOCS", className = "" }) {
  return (
    <div className={`flex-shrink-0 ${className}`}>
      <span className="text-5xl font-extrabold tracking-tight text-[#ff9900] block mb-2 leading-none">
        docudent.
      </span>
      <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block pl-1">
        {subtitle}
      </span>
    </div>
  );
}




