# Requirement Block Sync (TEST → DEV / PROD / LOCAL)

This document describes how to **export and reapply a `requirement_block` and its associated `requirements`** from **TEST** {SOURCE} into another environment (**DEV / PROD / LOCAL**) {TARGET} in a **repeatable and safe way**.

This process is intended for **infrequent, controlled updates** to form definitions maintained by admins in TEST.

---

## Overview

- **TEST** is the **source of truth**
- **DEV / PROD / LOCAL** may or may not already contain the `requirement_block`
- Identity is determined by **`sku`**
- Existing requirements on the target are **always deleted and replaced**
- UUIDs are resolved dynamically on the target — **no manual editing**

---

## High-Level Flow

1. Run the **generation script** on **TEST**
2. Copy the generated SQL (`DO $$ … $$;`)
3. Run that SQL on **DEV / PROD / LOCAL**
4. Done

The script is **safe to re-run** and guarantees the target matches TEST.

---

## Important Notes

- The `requirement_block` **may or may not exist on the target** they are the containers that hold the `requirements`
- `requirements` are treated as **disposable** as they contain that logic that changes.
- `sku` is used as the **stable identifier**
- UUIDs are an **implementation detail**

---

## Step 1 — Generate the Apply Script (Run on TEST)

> Update the `sku` value.

```sql
WITH rb AS (
  SELECT *
  FROM requirement_blocks
  WHERE sku = 'portal_access_for_employees'
),
reqs AS (
  SELECT *
  FROM requirements
  WHERE requirement_block_id = (SELECT id FROM rb)
  ORDER BY position
)
SELECT string_agg(line, E'\n') AS generated_script
FROM (

  /* =======================
     HEADER + BLOCK LOGIC
     ======================= */
  SELECT format($sql$
DO $$
DECLARE
  v_requirement_block_id uuid;
BEGIN
  SELECT id
  INTO v_requirement_block_id
  FROM requirement_blocks
  WHERE sku = %L;

  IF v_requirement_block_id IS NULL THEN
    INSERT INTO requirement_blocks (
      id,
      name,
      sign_off_role,
      reviewer_role,
      custom_validations,
      created_at,
      updated_at,
      description,
      sku,
      display_name,
      display_description,
      first_nations,
      discarded_at,
      visibility
    ) VALUES (
      %L::uuid,
      %L,
      %s,
      %s,
      %L,
      now(),
      now(),
      %L,
      %L,
      %L,
      %L,
      %L,
      %s,
      %s
    )
    RETURNING id INTO v_requirement_block_id;
  END IF;

  DELETE FROM requirements
  WHERE requirement_block_id = v_requirement_block_id;

  INSERT INTO requirements (
    id,
    requirement_code,
    "label",
    input_type,
    input_options,
    hint,
    required,
    related_content,
    required_for_in_person_hint,
    required_for_multiple_owners,
    created_at,
    updated_at,
    requirement_block_id,
    "position",
    elective
  ) VALUES
$sql$,
    rb.sku,
    rb.id,
    rb.name,
    rb.sign_off_role,
    rb.reviewer_role,
    rb.custom_validations::text,
    rb.created_at,
    rb.updated_at,
    rb.description,
    rb.sku,
    rb.display_name,
    rb.display_description,
    rb.first_nations,
    COALESCE(rb.discarded_at::text, 'NULL'),
    rb.visibility
  ) AS line
  FROM rb

  UNION ALL

  /* =======================
     REQUIREMENTS
     ======================= */
  SELECT format(
    '    (%L::uuid, %L, %L, %s, %L, %L, %L, %L, %L, %L, now(), now(), v_requirement_block_id, %s, %L)%s',
    r.id,
    r.requirement_code,
    r.label,
    r.input_type,
    r.input_options::text,
    r.hint,
    r.required,
    r.related_content,
    r.required_for_in_person_hint,
    r.required_for_multiple_owners,
    r.created_at,
    r.updated_at,
    r.position,
    r.elective,
    CASE
      WHEN r.position = (SELECT max(position) FROM reqs)
      THEN E'\n'
      ELSE E',\n'
    END
  ) AS line
  FROM reqs r

  UNION ALL

  /* =======================
     FOOTER
     ======================= */
  SELECT E';
END $$;
' AS line

) parts;
```

---

## Step 2 — Apply the Script (Run on DEV / PROD / LOCAL)

1. Copy the `generated_script` output from TEST
2. Paste it into your SQL client connected to DEV / PROD / LOCAL
3. Execute it as-is

### What the script does on the target

- Looks up the `requirement_block` by `sku`
- Inserts it if missing
- Deletes **any existing requirements** for that block
- Re-inserts the authoritative `requirements` from TEST linked to the `requirement_block`

---

## NOTES

> **TEST emits truth** > **Targets reconcile state**

This is not migrating data — this is **replaying form definitions**.

---

## When to Use This

- Admin updates form structure in TEST
- New or changed requirements need to be promoted
- Environment drift needs to be corrected
- You want a human-reviewed, auditable process
