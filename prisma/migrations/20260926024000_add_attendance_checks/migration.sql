ALTER TABLE "attendance_records"
  ADD CONSTRAINT "minutes_late_non_negative" CHECK ("minutes_late" >= 0),
  ADD CONSTRAINT "month_valid_range" CHECK ("month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "year_sane_range" CHECK ("year" BETWEEN 2000 AND 2100);
