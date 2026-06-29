-- Change linkedIds from Json to String[]
ALTER TABLE "User" ALTER COLUMN "linkedIds" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "linkedIds" TYPE text[] USING (
  CASE
    WHEN "linkedIds" IS NULL THEN ARRAY[]::text[]
    WHEN jsonb_typeof("linkedIds"::jsonb) = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text("linkedIds"::jsonb))
    ELSE ARRAY[]::text[]
  END
);
ALTER TABLE "User" ALTER COLUMN "linkedIds" SET DEFAULT ARRAY[]::text[];
