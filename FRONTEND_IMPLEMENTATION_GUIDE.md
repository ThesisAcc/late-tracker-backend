# Frontend Implementation Guide: Manual Attendance Management

## Overview

New admin feature for manually creating/editing employee attendance records without importing Excel files. Useful for quick daily updates instead of full reimports.

## Backend API Endpoints

Base URL: `/api/admin/attendance`

All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>` header
- Admin role

### 1. Create or Update Attendance Record

**POST** `/api/admin/attendance`

Creates new record or updates existing one based on `employeeId + year + month` unique constraint.

**Request Body:**
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2026,
  "month": 10,
  "minutesLate": 45
}
```

**Validation:**
- `employeeId`: UUID format required
- `year`: Integer, 2020-2100
- `month`: Integer, 1-12
- `minutesLate`: Integer, >= 0

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2026,
  "month": 10,
  "minutesLate": 45,
  "importId": null,
  "createdAt": "2026-10-16T02:05:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid request (validation failed)
- `401`: Not authenticated
- `403`: Not admin
- `404`: Employee not found

---

### 2. Update Attendance Minutes

**PATCH** `/api/admin/attendance/:id`

Updates only the `minutesLate` field for existing record.

**URL Parameter:**
- `id`: Attendance record UUID

**Request Body:**
```json
{
  "minutesLate": 60
}
```

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2026,
  "month": 10,
  "minutesLate": 60,
  "importId": null,
  "createdAt": "2026-10-16T02:05:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid ID or minutes value
- `401`: Not authenticated
- `403`: Not admin
- `404`: Attendance record not found

---

### 3. Delete Attendance Record

**DELETE** `/api/admin/attendance/:id`

Removes attendance record completely.

**URL Parameter:**
- `id`: Attendance record UUID

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2026,
  "month": 10,
  "minutesLate": 60
}
```

**Error Responses:**
- `400`: Invalid ID
- `401`: Not authenticated
- `403`: Not admin
- `404`: Attendance record not found

---

### 4. Get Employee Year Attendance

**GET** `/api/admin/attendance/:employeeId/:year`

Fetches all 12 months for employee/year. Missing months filled with `minutesLate: 0` and `id: null`.

**URL Parameters:**
- `employeeId`: Employee UUID
- `year`: Calendar year (2020-2100)

**Response (200 OK):**
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "year": 2026,
  "months": [
    {
      "month": 1,
      "minutesLate": 30,
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "importId": "770e8400-e29b-41d4-a716-446655440002",
      "createdAt": "2026-01-05T10:00:00.000Z"
    },
    {
      "month": 2,
      "minutesLate": 0,
      "id": null,
      "importId": null,
      "createdAt": null
    },
    {
      "month": 3,
      "minutesLate": 45,
      "id": "660e8400-e29b-41d4-a716-446655440003",
      "importId": null,
      "createdAt": "2026-03-10T15:30:00.000Z"
    }
    // ... continues for all 12 months
  ]
}
```

**Error Responses:**
- `400`: Invalid parameters
- `401`: Not authenticated
- `403`: Not admin
- `404`: Employee not found

---

## Frontend Implementation Tasks

### UI Components Needed

1. **Attendance Management Page** (Admin only)
   - Employee selector dropdown
   - Year selector
   - 12-month grid/table showing:
     - Month name
     - Current minutes late
     - Edit button (inline or modal)
     - Source indicator (manual vs imported)

2. **Quick Add/Edit Modal**
   - Employee dropdown (autocomplete)
   - Month dropdown (1-12)
   - Year input
   - Minutes late input (number, min: 0)
   - Submit button

3. **Inline Edit Mode** (Optional)
   - Click-to-edit minutes directly in table
   - Save/Cancel buttons

### State Management

```typescript
interface AttendanceRecord {
  id: string | null;
  month: number;
  minutesLate: number;
  importId: string | null;
  createdAt: string | null;
}

interface EmployeeYearAttendance {
  employeeId: string;
  year: number;
  months: AttendanceRecord[];
}
```

### API Integration Functions

```typescript
// Create or update attendance
async function upsertAttendance(data: {
  employeeId: string;
  year: number;
  month: number;
  minutesLate: number;
}): Promise<AttendanceRecord> {
  const response = await fetch('/api/admin/attendance', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}

// Update existing record
async function updateAttendance(id: string, minutesLate: number): Promise<AttendanceRecord> {
  const response = await fetch(`/api/admin/attendance/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ minutesLate }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}

// Delete attendance record
async function deleteAttendance(id: string): Promise<void> {
  const response = await fetch(`/api/admin/attendance/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
}

// Get employee year attendance
async function getEmployeeYearAttendance(
  employeeId: string,
  year: number
): Promise<EmployeeYearAttendance> {
  const response = await fetch(`/api/admin/attendance/${employeeId}/${year}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

### User Flows

#### Flow 1: Quick Daily Update
1. Admin navigates to "Manual Attendance" page
2. Clicks "Add Late Record" button
3. Modal opens:
   - Select employee from dropdown
   - Select current month (default to today)
   - Select current year (default to 2026)
   - Input minutes late (e.g., 15)
4. Click "Save"
5. Success message shown
6. Dashboard updates immediately

#### Flow 2: Edit Employee Monthly Records
1. Admin navigates to "Manual Attendance" page
2. Select employee from dropdown
3. Select year (default current year)
4. Grid displays all 12 months with current values
5. Admin clicks "Edit" on October row
6. Updates minutes from 45 to 60
7. Clicks "Save"
8. Row updates, shows "Manually edited" badge

#### Flow 3: Bulk Monthly Entry
1. Admin selects employee + year
2. Grid shows all 12 months
3. Admin clicks each month to fill in values:
   - Jan: 30 minutes
   - Feb: 0 minutes
   - Mar: 45 minutes
   - (etc.)
4. Each edit auto-saves or batch saves at end
5. Visual indicator (✓) shows saved months

### UI/UX Considerations

**Visual Indicators:**
- **Manual records**: Badge or icon (e.g., "✎ Manual")
- **Imported records**: Badge (e.g., "📊 Imported")
- **Missing data**: Grayed out or "—" placeholder

**Validation:**
- Prevent negative minutes
- Show warning if minutes > 480 (8 hours)
- Confirm before deleting records with data

**Permissions:**
- Hide "Manual Attendance" menu from employees
- Show only to admin users

**Performance:**
- Cache employee list for dropdowns
- Debounce inline edits (500ms)
- Show loading states during save

### Error Handling

```typescript
try {
  await upsertAttendance(data);
  showSuccessToast('Attendance record saved');
} catch (error) {
  if (error.message.includes('Employee not found')) {
    showErrorToast('Selected employee does not exist');
  } else if (error.message.includes('Authentication required')) {
    redirectToLogin();
  } else {
    showErrorToast('Failed to save record. Please try again.');
  }
}
```

### Testing Checklist

- [ ] Create new attendance record for employee
- [ ] Update existing record (change minutes)
- [ ] Delete attendance record
- [ ] View all 12 months for employee/year
- [ ] Verify manual records show `importId: null`
- [ ] Verify imported records preserve `importId`
- [ ] Test validation (negative minutes rejected)
- [ ] Test with non-existent employee (404)
- [ ] Test without auth token (401)
- [ ] Test as non-admin user (403)

### Integration with Existing Features

**Dashboard Compatibility:**
- Employee dashboard shows manual + imported records combined
- Admin dashboard aggregates all records (no visual distinction needed)
- Rankings include manually entered data

**Import Flow:**
- Importing Excel can overwrite manual records if same employee/year/month
- Manual records lose `importId` when overwritten
- No cascade delete: deleting import doesn't delete manual records

---

## Example Use Cases

### Use Case 1: Late Today
**Scenario:** Employee arrives 15 minutes late today (October 16, 2026)

**Steps:**
1. Admin opens "Manual Attendance"
2. Clicks "Quick Add"
3. Selects employee: "Juan Dela Cruz"
4. Month: 10, Year: 2026
5. Minutes: 15
6. Saves

**Result:** October record created with 15 minutes late

---

### Use Case 2: Edit Previous Month
**Scenario:** HR realizes September data was incorrect (should be 30, not 45)

**Steps:**
1. Admin selects employee + year 2026
2. Finds September row showing 45 minutes
3. Clicks "Edit"
4. Changes to 30
5. Saves

**Result:** September record updated to 30 minutes

---

### Use Case 3: Clear Erroneous Entry
**Scenario:** Admin accidentally logged 100 minutes for wrong employee

**Steps:**
1. Admin finds the record in employee's year view
2. Clicks "Delete" button
3. Confirms deletion
4. Record removed

**Result:** Attendance record deleted, month shows 0

---

## Swagger/OpenAPI Access

Full API documentation available at:
- **Swagger UI:** `http://localhost:3000/api-docs` (after starting backend)
- **JSON Spec:** `http://localhost:3000/api-docs.json`

Look for the "Attendance" tag section.

---

## Notes

- All manual records have `importId: null`
- Upsert logic: same employee/year/month = update, else create
- Dashboard calculations include manual records automatically
- No migration needed for existing data (imports preserve their `importId`)

---

## Migration Status

**Database Change:** `AttendanceRecord.importId` is now **optional** (nullable).

**Migration:** Pending until database is reachable. Run this when ready:
```bash
npm run prisma:migrate
```

Migration will:
- Alter `import_id` column to allow NULL
- Preserve all existing data
- Existing imports keep their `importId` values
