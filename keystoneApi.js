/**
 * Keystone GraphQL API Utilities & REST Adapter
 * Use these functions to interact with the TimeKeeper backend
 * Automatically maps between REST (work orders) and GraphQL (time entries)
 */

const GRAPHQL_ENDPOINT = 
  process.env.REACT_APP_GRAPHQL_ENDPOINT || 
  process.env.VITE_GRAPHQL_ENDPOINT ||
  'http://localhost:3000/api/graphql';

/**
 * REST API URL for /api/workorders endpoint
 * Maps REST work order format to GraphQL time entries
 */
export const REST_API_URL = 'http://localhost:3000/api/workorders';

/**
 * Get all work orders (REST endpoint)
 * This endpoint is provided by the Keystone server for compatibility
 */
export async function getWorkOrders() {
  try {
    const response = await fetch(REST_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch work orders:', error);
    throw error;
  }
}

/**
 * Create or update a work order (REST endpoint)
 */
export async function saveWorkOrder(workOrder) {
  try {
    const response = await fetch(REST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workOrder),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to save work order:', error);
    throw error;
  }
}

/**
 * Delete a work order (REST endpoint)
 */
export async function deleteWorkOrder(workOrderId) {
  try {
    const response = await fetch(`${REST_API_URL}/${workOrderId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to delete work order:', error);
    throw error;
  }
}

// ============================================================================
// GraphQL Functions (for advanced usage)
// ============================================================================

/**
 * Make a GraphQL request to the backend
 * @param {string} query - GraphQL query or mutation
 * @param {object} variables - Query variables
 * @returns {Promise} Response data
 */
export async function graphqlRequest(query, variables = {}) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL request failed');
    }

    return data.data;
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw error;
  }
}

// ============================================================================
// TIME ENTRY OPERATIONS
// ============================================================================

/**
 * Create a new time entry
 * @param {object} params - Entry data
 * @returns {Promise} Created entry with id
 */
export async function createTimeEntry({
  title,
  startTime,
  endTime = null,
  project = '',
  description = '',
  userId,
}) {
  const query = `
    mutation CreateTimeEntry(
      $title: String!
      $startTime: DateTime!
      $endTime: DateTime
      $project: String
      $description: String
      $userId: ID!
    ) {
      createTimeEntry(data: {
        title: $title
        startTime: $startTime
        endTime: $endTime
        project: $project
        description: $description
        user: { connect: { id: $userId } }
      }) {
        id
        title
        startTime
        endTime
        duration
        project
        description
        user {
          id
          name
          email
        }
        createdAt
      }
    }
  `;

  const variables = {
    title,
    startTime: new Date(startTime).toISOString(),
    endTime: endTime ? new Date(endTime).toISOString() : null,
    project,
    description,
    userId,
  };

  const result = await graphqlRequest(query, variables);
  return result.createTimeEntry;
}

/**
 * Get all time entries for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of time entries
 */
export async function getUserTimeEntries(userId) {
  const query = `
    query GetUserTimeEntries($userId: String!) {
      timeEntries(where: { user: { id: { equals: $userId } } }) {
        id
        title
        description
        startTime
        endTime
        duration
        project
        user {
          id
          name
          email
        }
        createdAt
      }
    }
  `;

  const variables = { userId };
  const result = await graphqlRequest(query, variables);
  return result.timeEntries || [];
}

/**
 * Get a single time entry by ID
 * @param {string} entryId - Entry ID
 * @returns {Promise} Time entry object
 */
export async function getTimeEntry(entryId) {
  const query = `
    query GetTimeEntry($id: ID!) {
      timeEntry(where: { id: $id }) {
        id
        title
        description
        startTime
        endTime
        duration
        project
        user {
          id
          name
          email
        }
        createdAt
      }
    }
  `;

  const variables = { id: entryId };
  const result = await graphqlRequest(query, variables);
  return result.timeEntry;
}

/**
 * Update a time entry
 * @param {string} entryId - Entry ID
 * @param {object} updates - Fields to update
 * @returns {Promise} Updated entry
 */
export async function updateTimeEntry(entryId, updates) {
  const { title, endTime, project, description, startTime } = updates;
  
  const query = `
    mutation UpdateTimeEntry(
      $id: ID!
      $title: String
      $endTime: DateTime
      $project: String
      $description: String
      $startTime: DateTime
    ) {
      updateTimeEntry(
        where: { id: $id }
        data: {
          title: $title
          endTime: $endTime
          project: $project
          description: $description
          startTime: $startTime
        }
      ) {
        id
        title
        startTime
        endTime
        duration
        project
        description
        createdAt
      }
    }
  `;

  const variables = {
    id: entryId,
    title,
    endTime: endTime ? new Date(endTime).toISOString() : null,
    project,
    description,
    startTime: startTime ? new Date(startTime).toISOString() : null,
  };

  const result = await graphqlRequest(query, variables);
  return result.updateTimeEntry;
}

/**
 * Delete a time entry
 * @param {string} entryId - Entry ID
 * @returns {Promise} Deleted entry ID
 */
export async function deleteTimeEntry(entryId) {
  const query = `
    mutation DeleteTimeEntry($id: ID!) {
      deleteTimeEntry(where: { id: $id }) {
        id
      }
    }
  `;

  const variables = { id: entryId };
  const result = await graphqlRequest(query, variables);
  return result.deleteTimeEntry;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Create a new user
 * @param {object} params - User data
 * @returns {Promise} Created user
 */
export async function createUser({ name, email, password }) {
  const query = `
    mutation CreateUser($name: String!, $email: String!, $password: String!) {
      createUser(data: {
        name: $name
        email: $email
        password: $password
        isAdmin: false
      }) {
        id
        name
        email
        isAdmin
        createdAt
      }
    }
  `;

  const variables = { name, email, password };
  const result = await graphqlRequest(query, variables);
  return result.createUser;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise} User object
 */
export async function getUser(userId) {
  const query = `
    query GetUser($id: ID!) {
      user(where: { id: $id }) {
        id
        name
        email
        isAdmin
        createdAt
        entries {
          id
          title
          startTime
          endTime
        }
      }
    }
  `;

  const variables = { id: userId };
  const result = await graphqlRequest(query, variables);
  return result.user;
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise} User object or null
 */
export async function getUserByEmail(email) {
  const query = `
    query GetUserByEmail($email: String!) {
      users(where: { email: { equals: $email } }) {
        id
        name
        email
        isAdmin
        createdAt
      }
    }
  `;

  const variables = { email };
  const result = await graphqlRequest(query, variables);
  return result.users?.[0] || null;
}

/**
 * Update a user
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update
 * @returns {Promise} Updated user
 */
export async function updateUser(userId, updates) {
  const { name, email } = updates;

  const query = `
    mutation UpdateUser($id: ID!, $name: String, $email: String) {
      updateUser(
        where: { id: $id }
        data: { name: $name, email: $email }
      ) {
        id
        name
        email
        isAdmin
      }
    }
  `;

  const variables = { id: userId, name, email };
  const result = await graphqlRequest(query, variables);
  return result.updateUser;
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Get all projects
 * @returns {Promise} Array of projects
 */
export async function getProjects() {
  const query = `
    query GetProjects {
      projects {
        id
        name
        description
        status
        createdAt
      }
    }
  `;

  const result = await graphqlRequest(query);
  return result.projects || [];
}

/**
 * Create a new project
 * @param {object} params - Project data
 * @returns {Promise} Created project
 */
export async function createProject({ name, description = '', status = 'active' }) {
  const query = `
    mutation CreateProject($name: String!, $description: String, $status: String) {
      createProject(data: {
        name: $name
        description: $description
        status: $status
      }) {
        id
        name
        description
        status
        createdAt
      }
    }
  `;

  const variables = { name, description, status };
  const result = await graphqlRequest(query, variables);
  return result.createProject;
}

/**
 * Update a project
 * @param {string} projectId - Project ID
 * @param {object} updates - Fields to update
 * @returns {Promise} Updated project
 */
export async function updateProject(projectId, updates) {
  const { name, description, status } = updates;

  const query = `
    mutation UpdateProject($id: ID!, $name: String, $description: String, $status: String) {
      updateProject(
        where: { id: $id }
        data: { name: $name, description: $description, status: $status }
      ) {
        id
        name
        description
        status
      }
    }
  `;

  const variables = { id: projectId, name, description, status };
  const result = await graphqlRequest(query, variables);
  return result.updateProject;
}

/**
 * Delete a project
 * @param {string} projectId - Project ID
 * @returns {Promise} Deleted project ID
 */
export async function deleteProject(projectId) {
  const query = `
    mutation DeleteProject($id: ID!) {
      deleteProject(where: { id: $id }) {
        id
      }
    }
  `;

  const variables = { id: projectId };
  const result = await graphqlRequest(query, variables);
  return result.deleteProject;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get all time entries for a date range
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise} Array of time entries
 */
export async function getTimeEntriesByDateRange(userId, startDate, endDate) {
  const query = `
    query GetEntriesByDate($userId: String!, $start: DateTime!, $end: DateTime!) {
      timeEntries(
        where: {
          AND: [
            { user: { id: { equals: $userId } } }
            { startTime: { gte: $start } }
            { startTime: { lte: $end } }
          ]
        }
      ) {
        id
        title
        startTime
        endTime
        duration
        project
        createdAt
      }
    }
  `;

  const variables = {
    userId,
    start: new Date(startDate).toISOString(),
    end: new Date(endDate).toISOString(),
  };

  const result = await graphqlRequest(query, variables);
  return result.timeEntries || [];
}

/**
 * Get time entries grouped by project
 * @param {string} userId - User ID
 * @returns {Promise} Entries grouped by project
 */
export async function getTimeEntriesByProject(userId) {
  const entries = await getUserTimeEntries(userId);
  
  return entries.reduce((acc, entry) => {
    const project = entry.project || 'Unassigned';
    if (!acc[project]) acc[project] = [];
    acc[project].push(entry);
    return acc;
  }, {});
}

export default {
  graphqlRequest,
  // Time Entry
  createTimeEntry,
  getUserTimeEntries,
  getTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntriesByDateRange,
  getTimeEntriesByProject,
  // User
  createUser,
  getUser,
  getUserByEmail,
  updateUser,
  // Project
  getProjects,
  createProject,
  updateProject,
  deleteProject,
};
