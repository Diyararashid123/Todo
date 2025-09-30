import React, { useState, useEffect } from 'react';
import './App.css';
import OpenAI from "openai";
import { TabbedDayView } from './TabbedView.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('input');
  const [inputText, setInputText] = useState('');
  const [studyPlan, setStudyPlan] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const exampleText = `My weekly nursing university schedule:

CLASSES:
- Monday: Nursing Fundamentals 9:00-12:00, Anatomy Lab 14:00-17:00
- Tuesday: Pharmacology lecture 10:00-12:00, Clinical Skills 14:00-17:00  
- Wednesday: Pathophysiology 9:00-11:00, Patient Care Workshop 13:00-16:00
- Thursday: FREE DAY (no classes)
- Friday: Community Health 9:00-12:00, then I have a project presentation at 15:00

WORK (Hotel night shifts):
- Friday 22:00 to Saturday 06:00
- Saturday 22:00 to Sunday 06:00

COMMUTE: 
- Train ride is 45 minutes each way
- I leave home around 7:30 AM to arrive by 8:30 AM

URGENT DEADLINES:
- Care plan assignment due Thursday 23:59
- Pharmacology quiz next Tuesday during class
- Clinical reflection report due in 10 days

FINAL EXAMS COMING UP:
- Anatomy: December 15
- Pharmacology: December 18  
- Patient Care: December 20

PERSONAL NOTES:
- I'm completely exhausted after night shifts and need good sleep
- I wake up around 6:00 AM on class days
- I prefer studying in the morning when I'm fresh
- Need time for meals and family
- Thursday is my power day since no classes!`;

  // Check for weekly reset
  useEffect(() => {
    const currentWeek = getWeekKey();
    const savedWeek = localStorage.getItem('weekKey');
    const savedApiKey = localStorage.getItem('apiKey');

    if (savedWeek !== currentWeek) {
      // New week - clear everything except API key
      localStorage.setItem('weekKey', currentWeek);
      localStorage.removeItem('studyPlan');
      setStudyPlan(null);
      setInputText('');
    }

    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  function getWeekKey() {
    const now = new Date();
    const monday = new Date(now);
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    monday.setDate(now.getDate() + diff);
    return `week-${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
  }

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('apiKey', key);
  };

  const loadExample = () => {
    setInputText(exampleText);
  };

  const generatePlan = async () => {
    if (!inputText.trim()) {
      alert('Please enter your schedule information');
      return;
    }

    setCurrentPage('loading');

    // Check if API key is provided
    if (!apiKey || !apiKey.startsWith('sk-')) {
      setCurrentPage('input');
      alert('Please add your OpenAI API key in the yellow box to generate a real plan.');
      return;
    }

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Only for demo - move to backend in production
      });

      const today = new Date();
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = daysOfWeek[today.getDay()];
      const currentDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert study planner for busy nursing students. Create a realistic weekly schedule that accounts for EVERY hour of the day.

CRITICAL RULES:
1. Plan EXACTLY 7 days (Monday through Sunday)
2. Account for ALL hours - don't leave gaps between activities
3. If there's a lecture at 12:00 but free time from 09:00-12:00, add a "free" or "study" session for 09:00-12:00
4. Add realistic travel/commute time before and after classes
5. Include meal times (breakfast, lunch, dinner) as "rest" type
6. Add buffer time between activities (15-30 min)
7. After night shifts, plan 6-8 hours recovery sleep
8. Use commute time only for light activities (reviewing notes, reading)
9. Break long study sessions into 2-3 hour blocks with breaks
10. Thursday is free = maximize productive study time

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "urgent": [{"title": "Task", "due": "Day", "priority": "high"}],
  "days": [
    {
      "day": "Monday",
      "date": "Oct 7",
      "sessions": [
        {"time": "06:00-07:00", "type": "rest", "title": "Morning Routine", "icon": "☕"},
        {"time": "07:00-07:45", "type": "commute", "title": "Train to Uni", "icon": "🚂", "focus": "Review notes"}
      ]
    }
  ],
  "stats": {
    "totalHours": 25,
    "subjects": [{"name": "Subject", "hours": 8, "color": "#3B82F6"}]
  },
  "tips": ["• Tip 1", "• Tip 2"]
}

Session Types: "class", "study", "work", "rest", "commute", "free"
Icons: 🏥💊📚🧪🩺🎯📖📝💻🏨💤😴🍽️☕🚂
Colors: #3B82F6, #8B5CF6, #10B981, #F97316, #EF4444, #EC4899`
          },
          {
            role: "user",
            content: `Today is ${currentDay}, ${currentDate}.

My schedule:
${inputText}

Create a complete weekly plan starting from this Monday. Make sure:
1. Every single hour from 6:00 AM to midnight is planned
2. Include realistic wake up times, meal times, and travel times
3. Don't skip hours - if I have class at 12:00, plan what I'm doing from 6:00-12:00
4. Add specific study goals for each study session
5. Be realistic about energy levels after work shifts

Return ONLY the JSON, nothing else.`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0].message.content;
      const plan = JSON.parse(responseText);

      if (!plan || !plan.days || plan.days.length === 0) {
        throw new Error('Invalid plan structure received');
      }

      setStudyPlan(plan);
      localStorage.setItem('studyPlan', JSON.stringify(plan));
      setCurrentPage('result');

    } catch (err) {
      console.error('Error:', err);
      setCurrentPage('input');
      
      let errorMessage = `Failed to generate plan: ${err.message}\n\n`;
      
      if (err.message.includes('API key') || err.message.includes('Incorrect API key')) {
        errorMessage = 'Invalid API key! Please check:\n\n1. Go to https://platform.openai.com/api-keys\n2. Create a new key\n3. Copy the FULL key (starts with sk-)\n4. Paste it in the yellow box';
      } else if (err.message.includes('quota') || err.message.includes('insufficient')) {
        errorMessage = 'Out of credits! Please:\n\n1. Go to https://platform.openai.com/account/billing\n2. Add at least $5 credit\n3. Wait a few minutes\n4. Try again';
      } else if (err.message.includes('model')) {
        errorMessage = 'Model not available. Try using "gpt-3.5-turbo" instead.';
      }
      
      alert(errorMessage);
    }
  };

  const goToInput = () => {
    setCurrentPage('input');
    setEditMode(false);
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setEditingSession(null);
  };

  const saveChanges = () => {
    localStorage.setItem('studyPlan', JSON.stringify(studyPlan));
    setEditMode(false);
    setEditingSession(null);
    alert('✅ Changes saved!');
  };

  const deleteSession = (dayIndex, sessionIndex) => {
    if (window.confirm('Delete this session?')) {
      const updatedPlan = { ...studyPlan };
      updatedPlan.days[dayIndex].sessions.splice(sessionIndex, 1);
      setStudyPlan(updatedPlan);
    }
  };

  const editSession = (dayIndex, sessionIndex) => {
    setEditingSession({ dayIndex, sessionIndex });
  };

  const updateSession = (dayIndex, sessionIndex, field, value) => {
    const updatedPlan = { ...studyPlan };
    updatedPlan.days[dayIndex].sessions[sessionIndex][field] = value;
    setStudyPlan(updatedPlan);
  };

  const addNewSession = (dayIndex) => {
    const newSession = {
      time: '09:00-10:00',
      type: 'study',
      title: 'New Session',
      icon: '📚',
      focus: 'Add details here'
    };
    const updatedPlan = { ...studyPlan };
    updatedPlan.days[dayIndex].sessions.push(newSession);
    setStudyPlan(updatedPlan);
    setEditingSession({ dayIndex, sessionIndex: updatedPlan.days[dayIndex].sessions.length - 1 });
  };

  const closeEditModal = () => {
    setEditingSession(null);
  };

  const getTypeColor = (type) => {
    const colors = {
      class: '#3B82F6',
      study: '#8B5CF6',
      work: '#1F2937',
      rest: '#10B981',
      commute: '#F97316',
      free: '#6B7280'
    };
    return colors[type] || '#6B7280';
  };

  // INPUT PAGE
  if (currentPage === 'input') {
    return (
      <div className="container">
        <div className="content">
          <div className="header">
            <div className="icon-container">✨</div>
            <div className="title">StudyFlow</div>
            <div className="subtitle">AI-Powered Study Planner</div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-emoji">⚡</div>
              <div className="stat-label">Smart AI</div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">📅</div>
              <div className="stat-label">Weekly Plans</div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">🎯</div>
              <div className="stat-label">Stay Focused</div>
            </div>
          </div>

          <div className="api-key-section">
            <div className="api-key-title">🔑 OpenAI API Key (Required)</div>
            <input
              type="password"
              className="api-key-input"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={handleApiKeyChange}
            />
            <div className="api-key-note">
              Get your key at: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com/api-keys</a>
              <br />Costs ~$0.02 per plan. Saved in browser.
            </div>
          </div>

          <div className="input-card">
            <div className="input-header">
              <div className="input-title">Your Schedule</div>
              <button className="example-button" onClick={loadExample}>
                Load Example
              </button>
            </div>
            <textarea
              className="text-area"
              placeholder="📝 Describe your week...&#10;• Classes & times&#10;• Work shifts&#10;• Commute time&#10;• Deadlines&#10;• Exam dates&#10;• Energy levels"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="features-card">
            <div className="features-title">✨ What You'll Get</div>
            <div className="feature-item">
              <div className="check-circle">✓</div>
              <div className="feature-text">Personalized day-by-day schedule</div>
            </div>
            <div className="feature-item">
              <div className="check-circle">✓</div>
              <div className="feature-text">Smart study time allocation</div>
            </div>
            <div className="feature-item">
              <div className="check-circle">✓</div>
              <div className="feature-text">Break & recovery planning</div>
            </div>
            <div className="feature-item">
              <div className="check-circle">✓</div>
              <div className="feature-text">Deadline prioritization</div>
            </div>
          </div>

          <button className="generate-button" onClick={generatePlan}>
            ✨ Create My Plan →
          </button>
        </div>
      </div>
    );
  }

  // LOADING PAGE
  if (currentPage === 'loading') {
    return (
      <div className="loading-container">
        <div className="loading-icon-container">
          <div className="spinner"></div>
        </div>
        <div className="loading-title">Creating Your Plan</div>
        <div className="loading-subtitle">AI is analyzing your schedule...</div>
      </div>
    );
  }

  // RESULT PAGE
  if (currentPage === 'result' && studyPlan) {
    const isEditing = editingSession !== null;
    const currentSession = isEditing ? studyPlan.days[editingSession.dayIndex].sessions[editingSession.sessionIndex] : null;

    return (
      <div className="container">
        <div className="top-bar">
          <button className="back-button" onClick={goToInput}>
            ← Back
          </button>
          <div className="top-bar-title">Your Study Plan</div>
          <button 
            className="edit-toggle-button" 
            onClick={editMode ? saveChanges : toggleEditMode}
          >
            {editMode ? '💾 Save' : '✏️ Edit'}
          </button>
        </div>

        <div className="content">
          <div className="result-header">
            <div className="ready-badge">
              <div className="pulse-dot"></div>
              <div className="ready-text">{editMode ? 'Edit Mode' : 'Plan Ready!'}</div>
            </div>
            <div className="result-title">This Week</div>
            <div className="result-subtitle">
              {studyPlan.stats.totalHours} hours of focused study
            </div>
          </div>

          {studyPlan.urgent && studyPlan.urgent.length > 0 && (
            <div className="urgent-card">
              <div className="urgent-title">🔥 Urgent This Week</div>
              {studyPlan.urgent.map((task, idx) => (
                <div key={idx} className="urgent-item">
                  <div>
                    <div className="urgent-item-title">{task.title}</div>
                    <div className="urgent-item-due">Due {task.due}</div>
                  </div>
                  <div className="urgent-arrow">›</div>
                </div>
              ))}
            </div>
          )}

          <div className="stats-card">
            <div className="stats-title">Study Distribution</div>
            {studyPlan.stats.subjects.map((subject, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-item-header">
                  <div className="stat-item-name">{subject.name}</div>
                  <div className="stat-item-hours">{subject.hours}h</div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(subject.hours / studyPlan.stats.totalHours) * 100}%`,
                      backgroundColor: subject.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <TabbedDayView
            studyPlan={studyPlan}
            editMode={editMode}
            addNewSession={addNewSession}
            editSession={editSession}
            deleteSession={deleteSession}
            getTypeColor={getTypeColor}
          />

          {studyPlan.tips && (
            <div className="tips-card">
              <div className="tips-title">💡 Pro Tips</div>
              {studyPlan.tips.map((tip, idx) => (
                <div key={idx} className="tip-text">{tip}</div>
              ))}
            </div>
          )}

          <div style={{ height: '100px' }}></div>
        </div>

        {!editMode && (
          <div className="floating-button-container">
            <button className="floating-button" onClick={goToInput}>
              ✨ Create New Plan
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {isEditing && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Session</h3>
                <button className="modal-close" onClick={closeEditModal}>✕</button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={currentSession.title}
                    onChange={(e) => updateSession(editingSession.dayIndex, editingSession.sessionIndex, 'title', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="text"
                    value={currentSession.time}
                    placeholder="09:00-11:00"
                    onChange={(e) => updateSession(editingSession.dayIndex, editingSession.sessionIndex, 'time', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={currentSession.type}
                    onChange={(e) => updateSession(editingSession.dayIndex, editingSession.sessionIndex, 'type', e.target.value)}
                  >
                    <option value="class">Class</option>
                    <option value="study">Study</option>
                    <option value="work">Work</option>
                    <option value="rest">Rest</option>
                    <option value="commute">Commute</option>
                    <option value="free">Free Time</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input
                    type="text"
                    value={currentSession.icon}
                    maxLength="2"
                    onChange={(e) => updateSession(editingSession.dayIndex, editingSession.sessionIndex, 'icon', e.target.value)}
                  />
                  <div className="emoji-suggestions">
                    {['📚', '💻', '🏥', '💊', '🧪', '🩺', '🎯', '✏️', '🗄️', '🏨', '💤', '🚂', '☕', '🍽️'].map(emoji => (
                      <span 
                        key={emoji}
                        className="emoji-option"
                        onClick={() => updateSession(editingSession.dayIndex, editingSession.sessionIndex, 'icon', emoji)}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Focus Note (optional)</label>
                  <input
                    type="text"
                    value={currentSession.focus || ''}
                    placeholder="e.g., Complete 50%"
                    onChange={(e) => updateSession(editingSession.dayIndex, editingSession.sessionIndex, 'focus', e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="modal-save-btn" onClick={closeEditModal}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default App;