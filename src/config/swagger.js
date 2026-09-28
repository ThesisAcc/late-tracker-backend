const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Office Late Checker API',
    version: '0.1.0',
    description: 'API for employee accounts and attendance lateness tracking.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Authentication', description: 'User authentication' },
    { name: 'Employees', description: 'Admin employee management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'ValidationError' },
          message: { type: 'string', example: 'Request validation failed' },
          details: { type: 'object', additionalProperties: true },
        },
        required: ['error', 'message'],
      },
      LoginRequest: {
        type: 'object',
        required: ['employeeCode', 'pin'],
        properties: {
          employeeCode: { type: 'string', pattern: '^EMP-\\d+$', example: 'EMP-1000' },
          pin: { type: 'string', pattern: '^\\d{4}$', example: '1234' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: { $ref: '#/components/schemas/User' },
        },
        required: ['token', 'user'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['ADMIN', 'EMPLOYEE'] },
          status: { type: 'string', enum: ['ACTIVE', 'DISABLED'] },
          employee: { $ref: '#/components/schemas/EmployeeSummary' },
        },
        required: ['id', 'role'],
      },
      EmployeeSummary: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeCode: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          employeeCode: { type: 'string', example: 'EMP-001' },
          firstName: { type: 'string', example: 'Jane' },
          middleName: { type: 'string', nullable: true, example: 'Marie' },
          lastName: { type: 'string', example: 'Doe' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/EmployeeUser' },
        },
        required: ['id', 'employeeCode', 'firstName', 'lastName', 'status'],
      },
      EmployeeUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['ADMIN', 'EMPLOYEE'] },
          status: { type: 'string', enum: ['ACTIVE', 'DISABLED'] },
        },
      },
      CreateEmployeeRequest: {
        type: 'object',
        required: ['employeeCode', 'firstName', 'lastName'],
        properties: {
          employeeCode: { type: 'string', pattern: '^EMP-\\d+$', example: 'EMP-1001' },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          middleName: { type: 'string', nullable: true, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          pin: { type: 'string', pattern: '^\\d{4}$', example: '1234' },
        },
      },
      UpdateEmployeeRequest: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          middleName: { type: 'string', nullable: true, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        },
        minProperties: 1,
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check service and database health',
        responses: {
          200: {
            description: 'Database is reachable',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          503: {
            description: 'Database is unreachable',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate with employee code and PIN',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: {
            description: 'Authentication succeeded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Too many login attempts' },
        },
      },
    },
    '/api/admin/employees': {
      parameters: [],
      get: {
        tags: ['Employees'],
        summary: 'List employees',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Employees returned',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Employee' } } } },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Admin role required' },
        },
      },
      post: {
        tags: ['Employees'],
        summary: 'Create an employee and login account',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmployeeRequest' } } },
        },
        responses: {
          201: {
            description: 'Employee created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } },
          },
          400: { description: 'Invalid request' },
          401: { description: 'Authentication required' },
          403: { description: 'Admin role required' },
          409: { description: 'Employee code already exists' },
        },
      },
    },
    '/api/admin/employees/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Employee UUID',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Employees'],
        summary: 'Get an employee',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Employee returned',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } },
          },
          401: { description: 'Authentication required' },
          403: { description: 'Admin role required' },
          404: { description: 'Employee not found' },
        },
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update an employee',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' } } },
        },
        responses: {
          200: {
            description: 'Employee updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } },
          },
          400: { description: 'Invalid request' },
          401: { description: 'Authentication required' },
          403: { description: 'Admin role required' },
          404: { description: 'Employee not found' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
