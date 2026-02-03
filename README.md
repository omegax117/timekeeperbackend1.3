# TimeKeeper Keystone Database

A Keystone 6 CMS backend with MySQL database for the TimeKeeper application.

## Prerequisites

- Node.js 16+ installed
- MySQL 8.0+ running
- npm or yarn package manager

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure MySQL

Create a MySQL database:

```sql
CREATE DATABASE timekeeper;
CREATE USER 'timekeeper'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON timekeeper.* TO 'timekeeper'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL=mysql://timekeeper:your-secure-password@localhost:3306/timekeeper
SESSION_SECRET=your-random-session-secret-here
```

### 4. Initialize the Database

```bash
npm run setup
```

This will:
- Create the database schema
- Set up the default admin user
- Initialize all tables

### 5. Run Development Server

```bash
npm run dev
```

The Keystone admin interface will be available at `http://localhost:3000`

## Production Build

```bash
npm run build
npm start
```

## Database Schema

### User
- name: User's full name
- email: Unique email address
- password: Encrypted password
- isAdmin: Admin privilege flag
- createdAt: Account creation timestamp
- entries: Related time entries

### TimeEntry
- title: Entry title
- description: Detailed description
- startTime: Start timestamp
- endTime: End timestamp (nullable)
- duration: Calculated duration
- project: Associated project
- user: Reference to user
- createdAt: Entry creation timestamp

### Project
- name: Project name
- description: Project description
- status: Project status (active/archived)
- createdAt: Project creation timestamp

## Features

- Admin interface for managing users and time entries
- User authentication
- Time tracking system
- Project management
- MySQL database persistence
- RESTful API endpoints
- GraphQL API (via Keystone)

## Troubleshooting

### Connection Issues
- Verify MySQL is running: `mysql -u root -p`
- Check DATABASE_URL format
- Ensure database and user are created

### Permission Issues
- Reset permissions: `GRANT ALL PRIVILEGES ON timekeeper.* TO 'timekeeper'@'localhost';`
- Flush privileges: `FLUSH PRIVILEGES;`

## Support

For issues or questions, refer to:
- [Keystone 6 Documentation](https://keystonejs.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
