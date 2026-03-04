# Requirement Block Sync (SOURCE → TARGET)

This document describes how to **export and reapply a `requirement_block` and its associated `requirements`** from **SOURCE** into another environment **TARGET** in a **repeatable and safe way**.

This process is intended for **infrequent, controlled updates** to form definitions maintained by admins in **SOURCE**.

---

## Overview

- **SOURCE** is the **source of truth**
- **TARGET** may or may not already contain the `requirement_block`
- Requirement blocks are selected by **template id**, then applied by **`sku`**
- Existing requirements on the target are **always deleted and replaced**
- UUIDs are resolved dynamically on the target — **no manual editing**

---

## High-Level Flow

1. Run the **generation script** on **SOURCE**
2. Copy the generated SQL (`DO $$ … $$;`)
3. Run that SQL on **TARGET**
4. Done

The script is **safe to re-run** and guarantees the target matches SOURCE.

---

## Important Notes

- The `requirement_block` **may or may not exist on the target** they are the containers that hold the `requirements`
- `requirements` are treated as **disposable** as they contain that logic that changes.
- Each generated script still uses `sku` as the **stable identifier** on TARGET
- UUIDs are an **implementation detail**

---

## Step 1 — Generate the Apply Script (Run on SOURCE)

> Update the `requirement_template_id` value. This will generate one script per block in that template.

```sql
WITH params AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS requirement_template_id
),
template_blocks AS (
  SELECT DISTINCT rb.id AS requirement_block_id, rb.sku
  FROM requirement_template_sections rts
  JOIN template_section_blocks tsb
    ON tsb.requirement_template_section_id = rts.id
  JOIN requirement_blocks rb
    ON rb.id = tsb.requirement_block_id
  JOIN params p
    ON rts.requirement_template_id = p.requirement_template_id
),
rb AS (
  SELECT rb.*
  FROM requirement_blocks rb
  JOIN template_blocks tb
    ON tb.requirement_block_id = rb.id
),
reqs AS (
  SELECT r.*
  FROM requirements r
  WHERE r.requirement_block_id IN (SELECT id FROM rb)
)
SELECT rb.sku,
       string_agg(parts.line, E'\n' ORDER BY parts.sort_key) AS generated_script
FROM (
  -- HEADER
  SELECT rb.id AS requirement_block_id,
         1 AS sort_key,
         format($sql$
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
      %L,
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
    rb.description,
    rb.sku,
    rb.display_name,
    rb.display_description,
    rb.first_nations,
    null,
    rb.visibility
  ) AS line
  FROM rb

  UNION ALL

  -- REQUIREMENTS
  SELECT r.requirement_block_id AS requirement_block_id,
         2 + r.position AS sort_key,
         format(
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
           r.position,
           r.elective,
           CASE
             WHEN r.position = (
               SELECT max(position) FROM reqs r2
               WHERE r2.requirement_block_id = r.requirement_block_id
             )
             THEN E'\n'
             ELSE E',\n'
           END
         ) AS line
  FROM reqs r

  UNION ALL

  -- FOOTER
  SELECT rb.id AS requirement_block_id,
         1000000 AS sort_key,
         E';
END $$;
' AS line
  FROM rb
) parts
JOIN rb ON rb.id = parts.requirement_block_id
GROUP BY rb.sku
ORDER BY rb.sku;
```

---

## Step 2 — Apply the Script (Run on TARGET)

1. Copy the `generated_script` output from SOURCE
2. Paste it into your SQL client connected to TARGET
3. Execute it as-is

### What the script does on the target

- Looks up each `requirement_block` by `sku`
- Inserts it if missing
- Deletes **any existing requirements** for that block
- Re-inserts the authoritative `requirements` from SOURCE linked to the `requirement_block`

---

## DBeaver Notes

- `\set` is a psql-only meta-command and will error in DBeaver.
- Use the `params` CTE shown above to set the `requirement_template_id` inline.

---

## NOTES

> **SOURCE emits truth** > **Targets reconcile state**

This is not migrating data — this is **replaying form definitions**.

---

## When to Use This

- Admin updates form structure in SOURCE
- New or changed requirements need to be promoted
- Environment drift needs to be corrected
- You want a human-reviewed, auditable process
