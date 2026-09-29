const prisma = require('../../lib/prisma');

// Returns all active employees whose name matches the given full name in any
// of the supported formats:
//   "First Last", "First Middle Last",
//   "Last, First", "Last, First Middle"
// Matching is case-insensitive and collapses extra whitespace.
// Returns an array - callers MUST handle the case where 0 or >1 rows match.
async function findActiveEmployeesWithUserByName(fullName) {
  const normalized = fullName.trim().replace(/\s+/g, ' ').toLowerCase();

  return prisma.$queryRaw`
    SELECT
      e.id,
      e.employee_code   AS "employeeCode",
      e.first_name      AS "firstName",
      e.middle_name     AS "middleName",
      e.last_name       AS "lastName",
      e.status,
      json_build_object(
        'id',           u.id,
        'role',         u.role,
        'status',       u.status,
        'passwordHash', u.password_hash
      ) AS "user"
    FROM employees e
    INNER JOIN users u ON u.employee_id = e.id
    WHERE e.status = 'ACTIVE'
      AND (
        LOWER(TRIM(CONCAT(e.first_name, ' ', e.last_name)))
          = ${normalized}
        OR LOWER(TRIM(CONCAT(e.first_name, ' ', COALESCE(e.middle_name || ' ', ''), e.last_name)))
          = ${normalized}
        OR LOWER(TRIM(CONCAT(e.last_name, ', ', e.first_name)))
          = ${normalized}
        OR LOWER(TRIM(CONCAT(e.last_name, ', ', e.first_name, ' ', COALESCE(e.middle_name, ''))))
          = ${normalized}
      )
  `;
}

module.exports = {
  findActiveEmployeesWithUserByName,
};
