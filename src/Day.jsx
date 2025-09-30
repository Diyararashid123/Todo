export default function Day({ day, dayIdx, editMode, addNewSession, editSession, deleteSession, getTypeColor }) {
  return (
    <div className="day-container">
      <div className="day-header">
        <div className="day-name">{day.day}</div>
        <div className="day-date">{day.date}</div>
        {editMode && (
          <button 
            className="add-session-btn"
            onClick={() => addNewSession(dayIdx)}
          >
            + Add
          </button>
        )}
      </div>
      {day.sessions.map((session, sessionIdx) => (
        <div key={sessionIdx} className="session-card">
          <div
            className="session-color-bar"
            style={{ backgroundColor: getTypeColor(session.type) }}
          ></div>
          <div className="session-content">
            <div className="session-icon">{session.icon}</div>
            <div className="session-info">
              <div className="session-title">{session.title}</div>
              <div className="session-time">{session.time}</div>
              {session.focus && (
                <div className="focus-badge">
                  <div className="focus-text">{session.focus}</div>
                </div>
              )}
            </div>
            {editMode && (
              <div className="session-actions">
                <button 
                  className="edit-btn"
                  onClick={() => editSession(dayIdx, sessionIdx)}
                >
                  ✏️
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => deleteSession(dayIdx, sessionIdx)}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}