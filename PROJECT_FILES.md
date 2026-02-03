# Backend1.3 Project Files

## Configuration Files
- **keystone.ts** - Main Keystone configuration with MySQL connection, session management, and list definitions
- **next.config.js** - Next.js configuration for the admin UI
- **package.json** - Project dependencies and npm scripts
- **.env** - Environment variables (DATABASE_URL, SESSION_SECRET)
- **.env.example** - Template for environment variables
- **.gitignore** - Git ignore rules
- **tsconfig.json** - TypeScript configuration

## Generated Files (Auto-created by Keystone)
- **schema.prisma** - Prisma database schema
- **schema.graphql** - Auto-generated GraphQL schema
- **.keystone/** - Build output directory

## Documentation
- **README.md** - Project overview and setup instructions
- **QUICK_START.md** - 5-minute integration guide for frontend
- **FRONTEND_INTEGRATION.md** - Detailed integration documentation with examples
- **SETUP_COMPLETE.md** - Complete setup summary

## Frontend Integration
- **keystoneApi.js** - GraphQL utilities for frontend React components
  - All CRUD operations for TimeEntry, User, Project
  - Helper functions for date ranges, grouping, batch operations
  - Ready to copy to frontend's src/utils/ directory

## Running the Project

### Development
```bash
cd d:\TimeKeeper\Backend1.3
npx keystone dev
```

Access:
- Admin UI: http://localhost:3000/
- GraphQL API: http://localhost:3000/api/graphql

### Production Build
```bash
npm run build
npm start
```

## Database Schema

### User
- id (String, unique)
- name (String, required)
- email (String, unique, required)
- password (String)
- isAdmin (Boolean, default: false)
- entries (Relationship to TimeEntry)
- createdAt (DateTime, auto)

### TimeEntry
- id (String, unique)
- title (String, required)
- description (String, optional)
- startTime (DateTime, required)
- endTime (DateTime, optional)
- duration (String, calculated)
- project (String, optional)
- user (Relationship to User, required)
- createdAt (DateTime, auto)

### Project
- id (String, unique)
- name (String, required)
- description (String, optional)
- status (String, default: 'active')
- createdAt (DateTime, auto)

## Key Features

✅ MySQL database with Prisma ORM
✅ GraphQL API with auto-generated schema
✅ Admin UI for manual data management
✅ CORS enabled for frontend
✅ TypeScript for type safety
✅ Stateless session management
✅ Ready-to-use frontend utilities

## Integration Points

### GraphQL Endpoint
```
POST http://localhost:3000/api/graphql
Content-Type: application/json

{
  "query": "...",
  "variables": {...}
}
```

### Frontend API File
Copy `keystoneApi.js` to your frontend and use:
```javascript
import { 
  createTimeEntry, 
  getUserTimeEntries, 
  updateTimeEntry 
} from './utils/keystoneApi';
```

## Dependencies

### Main
- @keystone-6/core@5.8.0
- mysql2@3.6.5

### Dev
- typescript@5.0.0

## Environment Setup

Required:
- Node.js 16+ (tested with v22.14.0)
- MySQL 8.0+ running
- Database: `keystone_db` created

Variables (.env):
```
DATABASE_URL=mysql://root:Alpha-x14z@localhost:3306/keystone_db
SESSION_SECRET=this-is-a-secret-that-is-at-least-32-characters-long
NODE_ENV=development
```

## npm Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## Troubleshooting

### Port 3000 already in use
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill it
```

### Database connection error
```bash
mysql -u root -p
CREATE DATABASE keystone_db;
SHOW DATABASES;
```

### Module not found errors
```bash
npm install
npm install typescript
```

## Notes

- All timestamps use ISO 8601 format
- Passwords are hashed by Keystone
- Admin UI accessible without authentication (configured in keystone.ts)
- CORS enabled for all origins
- Max request size: 50MB

---

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Built**: January 18, 2026
