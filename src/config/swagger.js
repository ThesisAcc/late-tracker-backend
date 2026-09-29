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
    { name: 'Dashboard', description: 'Employee personal attendance dashboard' },
    { name: 'Admin Dashboard', description: 'Admin company-wide attendance dashboard and rankings' },
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
          error: {
            type: 'string',
            enum: [
              'ValidationError',
              'ConflictError',
              'NotFoundError',
              'InternalError',
              'Error',
            ],
          },
          message: { type: 'string', example: 'Request validation failed' },
          details: { type: 'object', additionalProperties: true },
        },
        required: ['error', 'message'],
      },
      LoginRequest: {
        type: 'object',
        required: ['fullName', 'pin'],
        properties: {
          fullName: { type: 'string', minLength: 1, maxLength: 200, example: 'Maria Santos' },
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
      CreatedEmployee: {
        description:
          'Employee as returned by create. generatedPin is present only when the request omitted pin, in which case the server generated one and this is the only time it is ever returned.',
        allOf: [{ $ref: '#/components/schemas/Employee' }],
        properties: {
          generatedPin: { type: 'string', pattern: '^\\d{4}$', example: '1234' },
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
      MonthlyLateRecord: {
        type: 'object',
        properties: {
          month: { type: 'integer', minimum: 1, maximum: 12, example: 1 },
          monthName: { type: 'string', example: 'January' },
          minutesLate: { type: 'integer', minimum: 0, example: 15 },
        },
        required: ['month', 'monthName', 'minutesLate'],
      },
      EmployeeDashboardResponse: {
        type: 'object',
        properties: {
          employee: { $ref: '#/components/schemas/EmployeeSummary' },
          year: { type: 'integer', example: 2026 },
          summary: {
            type: 'object',
            properties: {
              totalMinutesLate: { type: 'integer', example: 165 },
              averageMinutesLatePerMonth: { type: 'number', example: 13.75 },
              monthsWithLatenessCount: { type: 'integer', example: 5 },
              highestLateMonth: {
                type: 'object',
                nullable: true,
                properties: {
                  month: { type: 'integer', example: 3 },
                  monthName: { type: 'string', example: 'March' },
                  minutesLate: { type: 'integer', example: 45 },
                },
              },
            },
          },
          monthlyBreakdown: {
            type: 'array',
            items: { $ref: '#/components/schemas/MonthlyLateRecord' },
          },
        },
      },
      HighestLateEmployeeSummary: {
        type: 'object',
        nullable: true,
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          employeeCode: { type: 'string', example: 'EMP-1004' },
          fullName: { type: 'string', example: 'Pedro Garcia' },
          minutesLate: { type: 'integer', example: 205 },
          lateRatePercentage: { type: 'number', example: 14.44 },
          rank: { type: 'integer', example: 1 },
        },
      },
      AdminDashboardEmployee: {
        type: 'object',
        properties: {
          rank: { type: 'integer', example: 1 },
          employeeId: { type: 'string', format: 'uuid' },
          employeeCode: { type: 'string', example: 'EMP-1004' },
          firstName: { type: 'string', example: 'Pedro' },
          middleName: { type: 'string', nullable: true, example: 'Luis' },
          lastName: { type: 'string', example: 'Garcia' },
          fullName: { type: 'string', example: 'Pedro Luis Garcia' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          minutesLate: { type: 'integer', example: 205 },
          totalMinutesLate: { type: 'integer', example: 205 },
          lateRatePercentage: { type: 'number', example: 14.44 },
          monthsLateCount: { type: 'integer', example: 6 },
          monthlyBreakdown: {
            type: 'array',
            items: { $ref: '#/components/schemas/MonthlyLateRecord' },
          },
          highestLateMonth: {
            type: 'object',
            nullable: true,
            properties: {
              month: { type: 'integer', example: 3 },
              monthName: { type: 'string', example: 'March' },
              minutesLate: { type: 'integer', example: 70 },
            },
          },
        },
      },
      AdminDashboardResponse: {
        type: 'object',
        properties: {
          period: {
            type: 'object',
            properties: {
              year: { type: 'integer', example: 2026 },
              month: { type: 'integer', nullable: true, example: null },
              monthName: { type: 'string', nullable: true, example: null },
            },
          },
          companySummary: {
            type: 'object',
            properties: {
              totalEmployees: { type: 'integer', example: 15 },
              activeEmployees: { type: 'integer', example: 15 },
              totalCompanyLateMinutes: { type: 'integer', example: 1420 },
              averageLateMinutesPerEmployee: { type: 'number', example: 94.67 },
              employeesWithLateness: { type: 'integer', example: 12 },
              highestLateEmployee: { $ref: '#/components/schemas/HighestLateEmployeeSummary' },
            },
          },
          employees: {
            type: 'array',
            items: { $ref: '#/components/schemas/AdminDashboardEmployee' },
          },
        },
      },
      AdminEmployeeDashboardResponse: {
        type: 'object',
        properties: {
          employee: { $ref: '#/components/schemas/EmployeeSummary' },
          year: { type: 'integer', example: 2026 },
          summary: {
            type: 'object',
            properties: {
              totalMinutesLate: { type: 'integer', example: 165 },
              averageMinutesLatePerMonth: { type: 'number', example: 13.75 },
              monthsWithLatenessCount: { type: 'integer', example: 5 },
              highestLateMonth: {
                type: 'object',
                nullable: true,
                properties: {
                  month: { type: 'integer', example: 3 },
                  monthName: { type: 'string', example: 'March' },
                  minutesLate: { type: 'integer', example: 45 },
                },
              },
            },
          },
          monthlyBreakdown: {
            type: 'array',
            items: { $ref: '#/components/schemas/MonthlyLateRecord' },
          },
          companyComparison: {
            type: 'object',
            properties: {
              rank: { type: 'integer', nullable: true, example: 2 },
              totalEmployees: { type: 'integer', example: 15 },
              lateRatePercentage: { type: 'number', example: 11.62 },
              companyTotalLateMinutes: { type: 'integer', example: 1420 },
            },
          },
        },
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
        summary: 'Authenticate with full name and PIN',
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
          401: {
            description:
              'Invalid credentials. Also returned for an unknown name, an ambiguous name match, an inactive employee and a disabled account, so the response cannot be used to discover valid employee names.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
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
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatedEmployee' } } },
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
          400: { description: 'Invalid employee id' },
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
    '/api/dashboard/my-stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get monthly lateness statistics for the authenticated employee',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'year',
            in: 'query',
            required: false,
            description: 'Calendar year (defaults to current year)',
            schema: { type: 'integer', minimum: 2000, maximum: 2100, example: 2026 },
          },
        ],
        responses: {
          200: {
            description: 'Employee personal dashboard statistics',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeDashboardResponse' } } },
          },
          400: { description: 'Invalid query parameters' },
          401: { description: 'Authentication required' },
          404: { description: 'Employee record not found' },
        },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin Dashboard'],
        summary: 'Get company-wide attendance overview, employee lateness rankings, and highest tardiness rate',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'year',
            in: 'query',
            required: false,
            description: 'Calendar year (defaults to current year)',
            schema: { type: 'integer', minimum: 2000, maximum: 2100, example: 2026 },
          },
          {
            name: 'month',
            in: 'query',
            required: false,
            description: 'Specific month number (1 to 12). If omitted, aggregates the entire year',
            schema: { type: 'integer', minimum: 1, maximum: 12, example: 3 },
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            description: 'Field to sort by',
            schema: {
              type: 'string',
              enum: ['totalMinutesLate', 'lateRatePercentage', 'lastName', 'firstName', 'employeeCode'],
              default: 'totalMinutesLate',
            },
          },
          {
            name: 'order',
            in: 'query',
            required: false,
            description: 'Sort direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            description: 'Filter employees by name or employee code',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Company-wide attendance dashboard and employee rankings',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminDashboardResponse' } } },
          },
          400: { description: 'Invalid query parameters' },
          401: { description: 'Authentication required' },
          403: { description: 'Admin role required' },
        },
      },
    },
    '/api/admin/dashboard/employees/{id}': {
      get: {
        tags: ['Admin Dashboard'],
        summary: 'Get attendance dashboard for a specific employee including company-wide ranking and comparison',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Employee UUID',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'year',
            in: 'query',
            required: false,
            description: 'Calendar year (defaults to current year)',
            schema: { type: 'integer', minimum: 2000, maximum: 2100, example: 2026 },
          },
        ],
        responses: {
          200: {
            description: 'Employee dashboard statistics with company comparison',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminEmployeeDashboardResponse' } } },
          },
          400: { description: 'Invalid parameter' },
          401: { description: 'Authentication required' },
          403: { description: 'Admin role required' },
          404: { description: 'Employee not found' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
