import { useState } from 'react';
import Day from '../src/Day.jsx';

export function TabbedDayView({ studyPlan, editMode, addNewSession, editSession, deleteSession, getTypeColor }) {
  // Get today's day name
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = daysOfWeek[new Date().getDay()];
  
  // Find the index of today in the studyPlan, default to 0 if not found
  const todayIndex = studyPlan.days.findIndex(day => day.day === today);
  const defaultTab = todayIndex !== -1 ? todayIndex : 0;
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="tabbed-view">
      <div className="tabs-container">
        {studyPlan.days.map((day, idx) => (
          <button
            key={idx}
            className={`tab ${activeTab === idx ? 'active' : ''}`}
            onClick={() => setActiveTab(idx)}
          >
            <div className="tab-day">{day.day}</div>
            <div className="tab-date">{day.date}</div>
          </button>
        ))}
      </div>
      
      <div className="tab-content">
        <Day
          day={studyPlan.days[activeTab]}
          dayIdx={activeTab}
          editMode={editMode}
          addNewSession={addNewSession}
          editSession={editSession}
          deleteSession={deleteSession}
          getTypeColor={getTypeColor}
        />
      </div>
    </div>
  );
}