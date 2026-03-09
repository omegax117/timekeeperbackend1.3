import { config, list } from '@keystone-6/core';
import { allowAll } from '@keystone-6/core/access';
import { text, timestamp, checkbox, relationship } from '@keystone-6/core/fields';
import { statelessSessions } from '@keystone-6/core/session';

// CORS configuration: allow configuring origins via env vars
const DEFAULT_CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000'];
const CORS_ALLOW_ALL = process.env.CORS_ALLOW_ALL === 'true';
const TRUST_X_FORWARDED = process.env.TRUST_X_FORWARDED === 'true';
const KEYSTONE_CORS = CORS_ALLOW_ALL || TRUST_X_FORWARDED
  ? { origin: true, credentials: true }
  : { origin: DEFAULT_CORS_ORIGINS, credentials: true };
const CORS_OPTIONS = CORS_ALLOW_ALL || TRUST_X_FORWARDED
  ? { origin: true, credentials: true }
  : { origin: DEFAULT_CORS_ORIGINS, credentials: true };

export default config({
  db: {
    provider: 'mysql',
    url: process.env.DATABASE_URL || 'mysql://root:Alpha-x14z@localhost:3306/timekeeper',
  },
  lists: {
    // Users list for TimeKeeper
    User: list({
      access: allowAll,
      fields: {
        name: text({ validation: { isRequired: true } }),
        email: text({ isIndexed: 'unique', validation: { isRequired: true } }),
        password: text({ isIndexed: true }),
        isAdmin: checkbox({ defaultValue: false }),
        createdAt: timestamp({ defaultValue: { kind: 'now' } }),
        entries: relationship({ ref: 'TimeEntry.user', many: true }),
      },
    }),

    // Time entries list
    TimeEntry: list({
      access: allowAll,
      fields: {
        title: text({ validation: { isRequired: true } }),
        description: text({ db: { isNullable: true } }),
        itemNumber: text({ db: { isNullable: true } }),
        shiftNumber: text({ db: { isNullable: true } }),
        blendType: text({ db: { isNullable: true } }),
        mmrKgs: text({ db: { isNullable: true } }),
        measKgs: text({ db: { isNullable: true } }),
        startTime: timestamp({ validation: { isRequired: true } }),
        endTime: timestamp({ db: { isNullable: true } }),
        duration: text({ db: { isNullable: true } }),
        project: text({ db: { isNullable: true } }),
        user: relationship({ ref: 'User.entries' }),
        createdAt: timestamp({ defaultValue: { kind: 'now' } }),
      },
    }),

    // Projects list
    Project: list({
      access: allowAll,
      fields: {
        name: text({ validation: { isRequired: true } }),
        description: text({ db: { isNullable: true } }),
        status: text({ defaultValue: 'active' }),
        createdAt: timestamp({ defaultValue: { kind: 'now' } }),
      },
    }),
  },
  session: statelessSessions({
    secret: process.env.SESSION_SECRET || 'this-is-a-secret-that-is-at-least-32-characters-long-!!',
  }),
  ui: {
    isAccessAllowed: () => true,
  },
  server: {
    cors: KEYSTONE_CORS,
    maxRequestSizeInBytes: 50 * 1024 * 1024,
    extendExpressApp: (app) => {
      const cors = require('cors');
      // If running behind port-forwarding/reverse-proxy, optionally trust X-Forwarded headers
      if (TRUST_X_FORWARDED) {
        app.use((req: any, _res: any, next: any) => {
          const xfHost = req.headers['x-forwarded-host'];
          const xfProto = req.headers['x-forwarded-proto'] || (req.headers['x-forwarded-port'] === '443' ? 'https' : 'http');
          if (xfHost) {
            const hostVal = Array.isArray(xfHost) ? xfHost[0] : xfHost;
            const originHeader = `${xfProto || 'http'}://${hostVal}`;
            if (!req.headers.origin || req.headers.origin !== originHeader) {
              req.headers.origin = originHeader;
            }
          }
          next();
        });
      }
      app.use(cors(CORS_OPTIONS));

      // Helper to parse JSON from request
      const parseJsonBody = async (req: any) => {
        return new Promise((resolve, reject) => {
          let data = '';
          req.setEncoding('utf8');
          req.on('data', chunk => {
            data += chunk;
          });
          req.on('end', () => {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch (err) {
              reject(err);
            }
          });
          req.on('error', reject);
        });
      };

      // REST API endpoint for work orders - GET
      app.get('/api/workorders', async (req, res) => {
        try {
          // Query timeEntries using GraphQL API
          const query = `
            query {
              timeEntries {
                id
                title
                description
                itemNumber
                shiftNumber
                blendType
                mmrKgs
                measKgs
                startTime
                endTime
                project
                user {
                  id
                  name
                }
              }
            }
          `;
          
          // Make POST request to GraphQL endpoint
          const response = await fetch('http://localhost:3000/api/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
          
          const result = await response.json();
          const timeEntries = result.data?.timeEntries || [];
          // Sort entries by startTime (date+time) so responses are ordered by date then start time
          timeEntries.sort((a: any, b: any) => {
            const ta = a?.startTime ? new Date(a.startTime).getTime() : (a?.createdAt ? new Date(a.createdAt).getTime() : 0);
            const tb = b?.startTime ? new Date(b.startTime).getTime() : (b?.createdAt ? new Date(b.createdAt).getTime() : 0);
            return ta - tb;
          });

          // Transform to work order format
          const workOrders = timeEntries.map((entry) => {
            const startDate = new Date(entry.startTime);
            const endDate = entry.endTime ? new Date(entry.endTime) : null;
            
            return {
              id: entry.id,
              date: startDate.toISOString().split('T')[0],
              shiftNumber: entry.shiftNumber || 1,
              workOrder: entry.project || 'GENERAL',
              itemNumber: entry.itemNumber || `IT-${entry.id.substring(0, 6)}`,
              blendType: entry.blendType || entry.project || 'TimeEntry',
              mmrKgs: entry.mmrKgs || 0,
              measKgs: entry.measKgs || 0,
              startTime: startDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              endTime: endDate
                ? endDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '',
              description: entry.title,
              comments: entry.description || '',
            };
          });
          
          res.json(workOrders);
        } catch (error) {
          console.error('Error in GET /api/workorders:', error);
          res.status(500).json({ error: error.message });
        }
      });

      // REST API endpoint for work orders - POST
      app.post('/api/workorders', async (req: any, res) => {
        try {
          console.log('POST /api/workorders - received request');
          
          let workOrder: any = {};
          
          try {
            workOrder = await parseJsonBody(req);
          } catch (err) {
            console.error('Failed to parse request body:', err);
            return res.status(400).json({ error: 'Invalid JSON in request body' });
          }
          
          console.log('Parsed workOrder:', workOrder);
          
          if (!workOrder || (typeof workOrder === 'object' && Object.keys(workOrder).length === 0)) {
            console.error('Empty request body');
            return res.status(400).json({ error: 'Empty request body' });
          }
          
          console.log('Processing work order:', workOrder);

          // Parse date and time fields
          const date = workOrder.date || new Date().toISOString().split('T')[0];
          const startTimeStr = workOrder.startTime || '00:00';
          const endTimeStr = workOrder.endTime || null;

          // Create ISO datetime strings
          const startTime = new Date(`${date}T${startTimeStr}:00`).toISOString();
          const endTime = endTimeStr ? new Date(`${date}T${endTimeStr}:00`).toISOString() : null;

          // Prepare mutation for creating/updating TimeEntry
          if (workOrder.id) {
            // UPDATE existing entry
            console.log('Updating entry with ID:', workOrder.id);
            const query = `
              mutation UpdateTimeEntry($id: ID!, $title: String, $description: String, $itemNumber: String, $shiftNumber: String, $blendType: String, $mmrKgs: String, $measKgs: String, $startTime: DateTime, $endTime: DateTime, $project: String) {
                updateTimeEntry(
                  where: { id: $id }
                  data: {
                    title: $title
                    description: $description
                    itemNumber: $itemNumber
                    shiftNumber: $shiftNumber
                    blendType: $blendType
                    mmrKgs: $mmrKgs
                    measKgs: $measKgs
                    startTime: $startTime
                    endTime: $endTime
                    project: $project
                  }
                ) {
                  id
                  title
                  description
                  itemNumber
                  shiftNumber
                  blendType
                  mmrKgs
                  measKgs
                  startTime
                  endTime
                  project
                }
              }
            `;

            const response = await fetch('http://localhost:3000/api/graphql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query,
                variables: {
                  id: workOrder.id,
                  title: workOrder.description || 'Work Order Entry',
                  description: workOrder.comments || '',
                  itemNumber: workOrder.itemNumber || '',
                  shiftNumber: workOrder.shiftNumber || '',
                  blendType: workOrder.blendType || '',
                  mmrKgs: String(workOrder.mmrKgs || ''),
                  measKgs: String(workOrder.measKgs || ''),
                  startTime,
                  endTime,
                  project: workOrder.workOrder || workOrder.blendType,
                },
              }),
            });

            const result = await response.json();
            if (result.errors) {
              throw new Error(result.errors[0].message);
            }

            const updated = result.data?.updateTimeEntry;
            const response_workorder = {
              id: updated.id,
              date: new Date(updated.startTime).toISOString().split('T')[0],
              shiftNumber: updated.shiftNumber || 1,
              workOrder: updated.project || 'GENERAL',
              itemNumber: updated.itemNumber || '',
              blendType: updated.blendType || '',
              mmrKgs: updated.mmrKgs || 0,
              measKgs: updated.measKgs || 0,
              description: updated.title,
              comments: updated.description || '',
              startTime: new Date(updated.startTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              endTime: updated.endTime
                ? new Date(updated.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '',
            };

            console.log('Updated successfully:', response_workorder);
            return res.status(200).json(response_workorder);
          } else {
            // CREATE new entry
            console.log('Creating new entry');
            const query = `
              mutation CreateTimeEntry($title: String!, $description: String, $itemNumber: String, $shiftNumber: String, $blendType: String, $mmrKgs: String, $measKgs: String, $startTime: DateTime!, $endTime: DateTime, $project: String, $userId: ID!) {
                createTimeEntry(
                  data: {
                    title: $title
                    description: $description
                    itemNumber: $itemNumber
                    shiftNumber: $shiftNumber
                    blendType: $blendType
                    mmrKgs: $mmrKgs
                    measKgs: $measKgs
                    startTime: $startTime
                    endTime: $endTime
                    project: $project
                    user: { connect: { id: $userId } }
                  }
                ) {
                  id
                  title
                  description
                  itemNumber
                  shiftNumber
                  blendType
                  mmrKgs
                  measKgs
                  startTime
                  endTime
                  project
                }
              }
            `;

            // Get first user ID or create a default one (TODO: get from session/auth)
            const usersQuery = `{ users(take: 1) { id } }`;
            const usersResponse = await fetch('http://localhost:3000/api/graphql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: usersQuery }),
            });
            const usersResult = await usersResponse.json();
            let userId = usersResult.data?.users?.[0]?.id;

            if (!userId) {
              // Create a default user if none exists
              console.log('No users found, creating default user');
              const createUserQuery = `
                mutation {
                  createUser(data: { name: "Guest", email: "guest@timekeeper.local" }) {
                    id
                  }
                }
              `;
              const createUserResponse = await fetch('http://localhost:3000/api/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: createUserQuery }),
              });
              const createUserResult = await createUserResponse.json();
              userId = createUserResult.data?.createUser?.id;
            }

            const response = await fetch('http://localhost:3000/api/graphql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query,
                variables: {
                  title: workOrder.description || 'Work Order Entry',
                  description: workOrder.comments || '',
                  itemNumber: workOrder.itemNumber || '',
                  shiftNumber: workOrder.shiftNumber || '',
                  blendType: workOrder.blendType || '',
                  mmrKgs: String(workOrder.mmrKgs || ''),
                  measKgs: String(workOrder.measKgs || ''),
                  startTime,
                  endTime,
                  project: workOrder.workOrder || workOrder.blendType,
                  userId,
                },
              }),
            });

            const result = await response.json();
            if (result.errors) {
              throw new Error(result.errors[0].message);
            }

            const created = result.data?.createTimeEntry;
            const response_workorder = {
              id: created.id,
              date: new Date(created.startTime).toISOString().split('T')[0],
              shiftNumber: created.shiftNumber || 1,
              workOrder: created.project || 'GENERAL',
              itemNumber: created.itemNumber || '',
              blendType: created.blendType || '',
              mmrKgs: created.mmrKgs || 0,
              measKgs: created.measKgs || 0,
              description: created.title,
              comments: created.description || '',
              startTime: new Date(created.startTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              endTime: created.endTime
                ? new Date(created.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '',
            };

            console.log('Created successfully:', response_workorder);
            return res.status(201).json(response_workorder);
          }
        } catch (error) {
          console.error('Error in POST /api/workorders:', error);
          res.status(500).json({ error: error.message });
        }
      });

      // REST API endpoint for work orders - DELETE
      app.delete('/api/workorders/:id', async (req, res) => {
        try {
          const id = req.params.id;

          if (!id) {
            return res.status(400).json({ error: 'Missing id parameter' });
          }

          const query = `
            mutation DeleteTimeEntry($id: ID!) {
              deleteTimeEntry(where: { id: $id }) {
                id
              }
            }
          `;

          const response = await fetch('http://localhost:3000/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id } }),
          });

          const result = await response.json();
          if (result.errors) {
            throw new Error(result.errors[0].message);
          }

          const deleted = result.data?.deleteTimeEntry;
          if (!deleted) {
            return res.status(404).json({ error: 'Not found' });
          }

          return res.status(200).json({ success: true, id: deleted.id });
        } catch (error) {
          console.error('Error in DELETE /api/workorders/:id', error);
          return res.status(500).json({ error: error.message });
        }
      });
    },
  },
});
