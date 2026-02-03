# TimeKeeper Frontend Integration - Quick Start

## 🚀 Get Started in 5 Minutes

### 1. Copy the API Utilities
Copy the `keystoneApi.js` file from this backend folder to your frontend's `src/utils/` directory:

```bash
cp keystoneApi.js ../Frontend/TimeKeeper/src/utils/
```

### 2. Update Your Frontend .env
Add to your frontend's `.env` file:
```
VITE_GRAPHQL_ENDPOINT=http://localhost:3000/api/graphql
```

### 3. Use in Your React Components

#### Create a Time Entry (Auto-save Example)
```javascript
import { createTimeEntry, updateTimeEntry } from './utils/keystoneApi';
import { useState } from 'react';

export function TimeTrackerRow({ userId, entry }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry?.title || '');

  const handleSave = async () => {
    if (entry?.id) {
      // Update existing entry
      await updateTimeEntry(entry.id, { title });
    } else {
      // Create new entry
      await createTimeEntry({
        title,
        startTime: new Date(),
        userId,
      });
    }
    setIsEditing(false);
  };

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={handleSave}
      placeholder="Enter activity..."
    />
  );
}
```

#### Display Time Entries (Sync Example)
```javascript
import { getUserTimeEntries, deleteTimeEntry } from './utils/keystoneApi';
import { useEffect, useState } from 'react';

export function TimeEntriesList({ userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEntries() {
      const data = await getUserTimeEntries(userId);
      setEntries(data);
      setLoading(false);
    }
    loadEntries();
  }, [userId]);

  const handleDelete = async (entryId) => {
    await deleteTimeEntry(entryId);
    setEntries(entries.filter(e => e.id !== entryId));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {entries.map(entry => (
        <div key={entry.id}>
          <span>{entry.title}</span>
          <span>{entry.project}</span>
          <span>{entry.duration}</span>
          <button onClick={() => handleDelete(entry.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## 📊 Real-Time Sync Pattern (Excel-like Behavior)

For seamless, real-time updates like a shared Excel sheet:

```javascript
import { updateTimeEntry } from './utils/keystoneApi';

// 1. Optimistic Update (update UI immediately)
function handleFieldChange(entryId, field, value) {
  // Update local state immediately for responsive UI
  setEntries(entries.map(e => 
    e.id === entryId ? { ...e, [field]: value } : e
  ));

  // 2. Async Sync (sync to server in background)
  updateTimeEntry(entryId, { [field]: value })
    .catch(error => {
      // 3. Error Handling (revert if sync fails)
      console.error('Sync failed:', error);
      // Optionally revert the change or show error message
    });
}
```

## 🔄 Polling for Updates (Multiple Users)

If multiple users need to see updates in real-time:

```javascript
import { getUserTimeEntries } from './utils/keystoneApi';
import { useEffect, useState } from 'react';

export function RealtimeTimeEntries({ userId }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    // Initial load
    loadEntries();

    // Poll every 5 seconds for updates
    const interval = setInterval(loadEntries, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  async function loadEntries() {
    const data = await getUserTimeEntries(userId);
    setEntries(data);
  }

  return (
    // Render entries
  );
}
```

## 📝 Common Patterns

### Auto-save on Blur
```javascript
<input
  onBlur={() => updateTimeEntry(id, { title })}
  onChange={(e) => setTitle(e.target.value)}
/>
```

### Bulk Create from Spreadsheet
```javascript
async function importFromSpreadsheet(rows, userId) {
  const entries = await Promise.all(
    rows.map(row => createTimeEntry({
      title: row.title,
      startTime: row.startTime,
      endTime: row.endTime,
      project: row.project,
      userId,
    }))
  );
  return entries;
}
```

### Calculate Daily Totals
```javascript
import { getTimeEntriesByDateRange } from './utils/keystoneApi';

async function getDailyTotal(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const entries = await getTimeEntriesByDateRange(userId, startOfDay, endOfDay);
  
  return entries.reduce((total, entry) => {
    if (entry.duration) {
      // Parse duration and add to total
      const [hours, minutes] = entry.duration.split(':');
      return total + (parseInt(hours) * 60 + parseInt(minutes));
    }
    return total;
  }, 0);
}
```

## 🔐 Authentication Integration

The API functions work with your existing auth system:

```javascript
// After login, store user ID and pass to functions
const userId = localStorage.getItem('userId'); // or from your auth context
const entries = await getUserTimeEntries(userId);
```

## 🧪 Testing the Integration

Test your integration with curl:

```bash
# Create a time entry
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createTimeEntry(data: { title: \"Test\", startTime: \"2026-01-18T10:00:00Z\", user: { connect: { id: \"USER_ID\" } } }) { id title startTime } }"
  }'

# Get time entries
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ timeEntries { id title startTime endTime } }"
  }'
```

## 📚 Full API Reference

All functions in `keystoneApi.js`:

**Time Entries:**
- `createTimeEntry(params)` - Create new entry
- `getUserTimeEntries(userId)` - Get all user entries
- `getTimeEntry(entryId)` - Get single entry
- `updateTimeEntry(entryId, updates)` - Update entry
- `deleteTimeEntry(entryId)` - Delete entry
- `getTimeEntriesByDateRange(userId, start, end)` - Get entries in date range
- `getTimeEntriesByProject(userId)` - Get entries grouped by project

**Users:**
- `createUser(params)` - Create user
- `getUser(userId)` - Get user details
- `getUserByEmail(email)` - Find user by email
- `updateUser(userId, updates)` - Update user

**Projects:**
- `getProjects()` - Get all projects
- `createProject(params)` - Create project
- `updateProject(projectId, updates)` - Update project
- `deleteProject(projectId)` - Delete project

## 🎯 Next Steps

1. ✅ Backend is running at `http://localhost:3000`
2. 📋 Admin UI available at `http://localhost:3000/`
3. 📡 GraphQL API at `http://localhost:3000/api/graphql`
4. 📦 Copy `keystoneApi.js` to your frontend
5. 🔌 Start using the functions in your components!

## 💡 Tips for Excel-like Experience

1. **Auto-save fields**: Use `onBlur` to save changes
2. **Optimistic updates**: Update UI immediately, sync in background
3. **Keyboard navigation**: Use Tab/Shift+Tab to move between fields
4. **Inline editing**: Double-click to edit, click outside to save
5. **Keyboard shortcuts**: Enter to save, Esc to cancel
6. **Batch operations**: Support copy/paste from Excel

## 🚨 Troubleshooting

**CORS errors?**
- Backend CORS is enabled by default
- Check that frontend uses `http://localhost:3000` for API calls

**Data not syncing?**
- Check browser console for errors
- Verify user ID is correct
- Ensure timestamps are in ISO format

**Performance issues?**
- Use `getTimeEntriesByDateRange` for large datasets
- Implement pagination for lists
- Debounce auto-save to reduce requests

## 📞 Support

Check the detailed guide in `FRONTEND_INTEGRATION.md` for:
- Full GraphQL schema reference
- Example React components
- Advanced patterns
- Database schema details
