import React from "react";

interface InfoSectionProps {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}

const InfoSection = ({ title, intro, children }: InfoSectionProps) => {
  return (
    <section className="info-section">
      <div className="info-section__header">
        <h2 className="info-section__title">{title}</h2>
      </div>
      <div className="info-section__content">
        {intro && <div className="info-section__intro">{intro}</div>}
        {children}
      </div>
    </section>
  );
};

export default InfoSection;
