/**
 * REST API Integration for TimeKeeper
 * Maps REST endpoints to GraphQL operations
 * Provides compatibility with frontend expecting /api/workorders
 */

const GRAPHQL_ENDPOINT = 'http://localhost:3000/api/graphql';

/**
 * Make a GraphQL request
 */
async function graphqlRequest(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

/**
 * REST Handler for GET /api/workorders
 * Returns time entries in work order format
 */
export async function getWorkOrders(req, res) {
  try {
    const query = `{
      timeEntries {
        id
        title
        description
        startTime
        endTime
        duration
        project
        user { id name email }
        createdAt
      }
    }`;

    const result = await graphqlRequest(query);
    const timeEntries = result.timeEntries || [];

    // Transform TimeEntry to WorkOrder format for compatibility
    const workOrders = timeEntries.map((entry, index) => ({
      id: entry.id,
      date: new Date(entry.startTime).toISOString().split('T')[0],
      shiftNumber: 1,
      workOrder: entry.project || 'GENERAL',
      itemNumber: entry.itemNumber || `IT-${entry.id.substring(0, 6)}`,
      blendType: entry.project || 'TimeEntry',
      mmrKgs: 0,
      measKgs: 0,
      startTime: new Date(entry.startTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      endTime: entry.endTime ? new Date(entry.endTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : '',
      description: entry.title,
      comments: entry.description || '',
    }));

    res.status(200).json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * REST Handler for POST /api/workorders
 * Creates or updates a time entry from work order data
 */
export async function postWorkOrder(req, res) {
  try {
    const workOrder = req.body;

    // Convert WorkOrder format to TimeEntry format
    const timeEntryData = {
      title: workOrder.description,
      description: workOrder.comments,
      project: workOrder.workOrder,
      itemNumber: workOrder.itemNumber,
      startTime: new Date(`${workOrder.date}T${workOrder.startTime}`).toISOString(),
      endTime: workOrder.endTime ? new Date(`${workOrder.date}T${workOrder.endTime}`).toISOString() : null,
    };

    if (workOrder.id && workOrder.id !== 'new') {
      // Update existing entry
      const query = `
        mutation UpdateTimeEntry($id: ID!, $data: TimeEntryUpdateInput!) {
          updateTimeEntry(where: { id: $id }, data: $data) {
            id
            title
            startTime
            endTime
            project
          }
        }
      `;

      const result = await graphqlRequest(query, {
        id: workOrder.id,
        data: timeEntryData,
      });

      res.status(200).json(result.updateTimeEntry);
    } else {
      // Create new entry (TODO: need user ID from session/auth)
      const query = `
        mutation CreateTimeEntry($data: TimeEntryCreateInput!) {
          createTimeEntry(data: $data) {
            id
            title
            startTime
            endTime
            project
          }
        }
      `;

      const result = await graphqlRequest(query, {
        data: {
          ...timeEntryData,
          user: { connect: { id: 'placeholder-user-id' } }, // TODO: Get from auth
        },
      });

      res.status(201).json(result.createTimeEntry);
    }
  } catch (error) {
    console.error('Error saving work order:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * REST Handler for DELETE /api/workorders/:id
 * Deletes a time entry
 */
export async function deleteWorkOrder(req, res) {
  try {
    const { id } = req.params;

    const query = `
      mutation DeleteTimeEntry($id: ID!) {
        deleteTimeEntry(where: { id: $id }) {
          id
        }
      }
    `;

    const result = await graphqlRequest(query, { id });

    res.status(200).json({ success: true, id: result.deleteTimeEntry.id });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: error.message });
  }
}
