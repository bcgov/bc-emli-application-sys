# Requirement Template Sync (SOURCE → TARGET)

This document describes how to **export and reapply a full `requirement_template`** from **SOURCE** into another environment **TARGET** in a **repeatable and safe way**.

This process is intended for **infrequent, controlled updates** to admin-managed form definitions maintained in SOURCE.

---

## Overview

- **SOURCE** is the **source of truth**
- **TARGET** may or may not already contain the matching template
- Templates are selected by:
  - `Program` (by `slug`)
  - `SubmissionType`
  - optional `SubmissionVariant`
  - `UserGroupType`
  - `AudienceType`
- Target template row is **never deleted/recreated** when it already exists (it is updated in place)
- Template sections are reconciled in place by position (UUIDs on target are preserved where possible)
- Section-block mappings are rebuilt to match SOURCE
- Requirement blocks are reconciled by **`sku`**
- Existing requirements in each synced block are **always deleted and replaced**
- UUIDs are resolved dynamically on the target — **no manual editing**

---

## High-Level Flow

1. Run the **generation script** on **SOURCE**
2. Confirm exactly one SOURCE template matched your classification inputs
3. Copy the generated SQL (`DO $$ … $$;`)
4. Run that SQL on **TARGET**
5. Done

The apply script is **safe to re-run** and guarantees target state matches SOURCE for the selected template key.

---

## Important Notes

- The target `requirement_template` is resolved by `program.slug` + classification combination, not by template UUID.
- If `source_program_match_count = 0`, the specified program slug does not exist on SOURCE (do not proceed).
- If the template is missing on target, it is created.
- `requirement_template_sections` are reconciled in place; `template_section_blocks` are treated as disposable links.
- `requirements` are treated as **disposable logic**.
- `requirement_blocks` are upserted by `sku`.
- Source UUIDs are **not** assumed to exist on target.

---

## Step 1 — Generate the Apply Script (Run on SOURCE)

> Update the values in `params` (`program_slug`, `submission_type_name`, optional `submission_variant_name`, `user_group_type_name`, `audience_type_name`).

> The query returns `source_program_match_count`, `source_template_match_count`, and `generated_script`. Continue only if both counts are `1`.

Optional SOURCE preflight (explicitly throws if the program is missing):

```sql
DO $$
DECLARE
  v_program_id uuid;
BEGIN
  SELECT id
    INTO v_program_id
  FROM programs
  WHERE lower(slug) = lower('cleanbc-energy-savings-program')
  LIMIT 1;

  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Program slug % not found on SOURCE', 'cleanbc-energy-savings-program';
  END IF;
END $$;
```

```sql
WITH params AS (
  SELECT
    'cleanbc-energy-savings-program'::text AS program_slug,
    'Invoice'::text AS submission_type_name,
    'Heat pump (space heating)'::text AS submission_variant_name, -- set NULL for no variant
    'Contractor'::text AS user_group_type_name,
    'External'::text AS audience_type_name
),
source_program AS (
  SELECT p.id, p.slug
  FROM programs p
  JOIN params par
    ON lower(p.slug) = lower(par.program_slug)
),
program_guard AS (
  SELECT count(*) AS source_program_match_count
  FROM source_program
),
candidate_templates AS (
  SELECT
    rt.*,
    sp.slug AS program_slug,
    st.name AS submission_type_name,
    sv.name AS submission_variant_name,
    ugt.name AS user_group_type_name,
    at.name AS audience_type_name
  FROM requirement_templates rt
  JOIN source_program sp
    ON sp.id = rt.program_id
  JOIN permit_classifications st
    ON st.id = rt.submission_type_id
   AND st.type = 'SubmissionType'
  LEFT JOIN permit_classifications sv
    ON sv.id = rt.submission_variant_id
   AND sv.type = 'SubmissionVariant'
  JOIN permit_classifications ugt
    ON ugt.id = rt.user_group_type_id
   AND ugt.type = 'UserGroupType'
  JOIN permit_classifications at
    ON at.id = rt.audience_type_id
   AND at.type = 'AudienceType'
  JOIN params p
    ON lower(st.name) = lower(p.submission_type_name)
   AND (
     (p.submission_variant_name IS NULL AND rt.submission_variant_id IS NULL)
     OR lower(coalesce(sv.name, '')) = lower(coalesce(p.submission_variant_name, ''))
   )
   AND lower(ugt.name) = lower(p.user_group_type_name)
   AND lower(at.name) = lower(p.audience_type_name)
  WHERE rt.discarded_at IS NULL
),
template_guard AS (
  SELECT count(*) AS source_template_match_count
  FROM candidate_templates
),
template_row AS (
  SELECT ct.*
  FROM candidate_templates ct
  JOIN program_guard pg
    ON pg.source_program_match_count = 1
  JOIN template_guard g
    ON g.source_template_match_count = 1
),
sections AS (
  SELECT s.*
  FROM requirement_template_sections s
  JOIN template_row t
    ON t.id = s.requirement_template_id
),
section_blocks AS (
  SELECT
    tsb.*,
    rb.sku
  FROM template_section_blocks tsb
  JOIN sections s
    ON s.id = tsb.requirement_template_section_id
  JOIN requirement_blocks rb
    ON rb.id = tsb.requirement_block_id
),
blocks AS (
  SELECT DISTINCT rb.*
  FROM requirement_blocks rb
  JOIN section_blocks sb
    ON sb.requirement_block_id = rb.id
),
reqs AS (
  SELECT r.*
  FROM requirements r
  JOIN blocks b
    ON b.id = r.requirement_block_id
),
req_values AS (
  SELECT
    r.requirement_block_id,
    string_agg(
      format(
        '    (%L, %L, %s, %L::jsonb, %L, %L, %L, %L, %L, now(), now(), v_requirement_block_id, %s, %L)',
        r.requirement_code,
        r.label,
        coalesce(r.input_type::text, 'NULL'),
        r.input_options::text,
        r.hint,
        r.required,
        r.related_content,
        r.required_for_in_person_hint,
        r.required_for_multiple_owners,
        coalesce(r.position::text, 'NULL'),
        r.elective
      ),
      E',\n'
      ORDER BY r.position, r.created_at, r.id
    ) AS values_sql
  FROM reqs r
  GROUP BY r.requirement_block_id
),
parts AS (
  -- HEADER
  SELECT
    1 AS sort_major,
    1 AS sort_minor,
    format(
      $sql$
DO $$
DECLARE
  v_program_id uuid;
  v_submission_type_id uuid;
  v_submission_variant_id uuid;
  v_user_group_type_id uuid;
  v_audience_type_id uuid;
  v_requirement_template_id uuid;
  v_template_match_count integer;
  v_requirement_block_id uuid;
  v_target_section_id uuid;
  v_section_map jsonb := '{}'::jsonb;
BEGIN
  SELECT id
    INTO v_program_id
  FROM programs
  WHERE lower(slug) = lower(%L)
  LIMIT 1;

  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Program slug %% not found on target', %L;
  END IF;

  SELECT id
    INTO v_submission_type_id
  FROM permit_classifications
  WHERE type = 'SubmissionType'
    AND lower(name) = lower(%L)
  LIMIT 1;

  IF v_submission_type_id IS NULL THEN
    RAISE EXCEPTION 'SubmissionType %% not found on target', %L;
  END IF;

  SELECT id
    INTO v_user_group_type_id
  FROM permit_classifications
  WHERE type = 'UserGroupType'
    AND lower(name) = lower(%L)
  LIMIT 1;

  IF v_user_group_type_id IS NULL THEN
    RAISE EXCEPTION 'UserGroupType %% not found on target', %L;
  END IF;

  SELECT id
    INTO v_audience_type_id
  FROM permit_classifications
  WHERE type = 'AudienceType'
    AND lower(name) = lower(%L)
  LIMIT 1;

  IF v_audience_type_id IS NULL THEN
    RAISE EXCEPTION 'AudienceType %% not found on target', %L;
  END IF;

%s

  SELECT count(*)
    INTO v_template_match_count
  FROM requirement_templates rt
  WHERE rt.discarded_at IS NULL
    AND rt.program_id = v_program_id
    AND rt.submission_type_id = v_submission_type_id
    AND rt.user_group_type_id = v_user_group_type_id
    AND rt.audience_type_id = v_audience_type_id
    AND (
      (v_submission_variant_id IS NULL AND rt.submission_variant_id IS NULL)
      OR rt.submission_variant_id = v_submission_variant_id
    );

  IF v_template_match_count = 1 THEN
    SELECT id
      INTO v_requirement_template_id
    FROM requirement_templates rt
    WHERE rt.discarded_at IS NULL
      AND rt.program_id = v_program_id
      AND rt.submission_type_id = v_submission_type_id
      AND rt.user_group_type_id = v_user_group_type_id
      AND rt.audience_type_id = v_audience_type_id
      AND (
        (v_submission_variant_id IS NULL AND rt.submission_variant_id IS NULL)
        OR rt.submission_variant_id = v_submission_variant_id
      )
    LIMIT 1;
  END IF;

  IF v_template_match_count > 1 THEN
    RAISE EXCEPTION 'More than one requirement_template matched on target for (Program=%%, SubmissionType=%%, SubmissionVariant=%%, UserGroupType=%%, AudienceType=%%)',
      %L,
      %L,
      %L,
      %L,
      %L;
  END IF;

  IF v_requirement_template_id IS NULL THEN
    INSERT INTO requirement_templates (
      type,
      description,
      first_nations,
      nickname,
      public,
      program_id,
      submission_type_id,
      submission_variant_id,
      user_group_type_id,
      audience_type_id,
      created_at,
      updated_at
    ) VALUES (
      %L,
      %L,
      %L,
      %L,
      %L,
      v_program_id,
      v_submission_type_id,
      v_submission_variant_id,
      v_user_group_type_id,
      v_audience_type_id,
      now(),
      now()
    )
    RETURNING id INTO v_requirement_template_id;
  ELSE
    UPDATE requirement_templates
    SET type = %L,
        description = %L,
        first_nations = %L,
        nickname = %L,
        public = %L,
        program_id = v_program_id,
        updated_at = now()
    WHERE id = v_requirement_template_id;
  END IF;

$sql$,
  t.program_slug,
  t.program_slug,
      t.submission_type_name,
      t.submission_type_name,
      t.user_group_type_name,
      t.user_group_type_name,
      t.audience_type_name,
      t.audience_type_name,
      CASE
        WHEN t.submission_variant_name IS NULL THEN
          E'  v_submission_variant_id := NULL;\n'
        ELSE
          format(
            $inner$
  SELECT id
    INTO v_submission_variant_id
  FROM permit_classifications
  WHERE type = 'SubmissionVariant'
    AND parent_id = v_submission_type_id
    AND lower(name) = lower(%L)
  LIMIT 1;

  IF v_submission_variant_id IS NULL THEN
    RAISE EXCEPTION 'SubmissionVariant %% (under SubmissionType %%) not found on target', %L, %L;
  END IF;
$inner$,
            t.submission_variant_name,
            t.submission_variant_name,
            t.submission_type_name
          )
      END,
      t.program_slug,
      t.submission_type_name,
      coalesce(t.submission_variant_name, '<none>'),
      t.user_group_type_name,
      t.audience_type_name,
      t.type,
      t.description,
      t.first_nations,
      t.nickname,
      t.public,
      t.type,
      t.description,
      t.first_nations,
      t.nickname,
      t.public
    ) AS line
  FROM template_row t

  UNION ALL

  -- BLOCKS + REQUIREMENTS
  SELECT
    2 AS sort_major,
    row_number() OVER (ORDER BY b.sku) AS sort_minor,
    format(
      $sql$
  -- Block: %s
  SELECT id
    INTO v_requirement_block_id
  FROM requirement_blocks
  WHERE sku = %L;

  IF v_requirement_block_id IS NULL THEN
    INSERT INTO requirement_blocks (
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
      %L,
      %s,
      %s,
      %L::jsonb,
      now(),
      now(),
      %L,
      %L,
      %L,
      %L,
      %L,
      NULL,
      %s
    )
    RETURNING id INTO v_requirement_block_id;
  ELSE
    UPDATE requirement_blocks
    SET name = %L,
        sign_off_role = %s,
        reviewer_role = %s,
        custom_validations = %L::jsonb,
        description = %L,
        display_name = %L,
        display_description = %L,
        first_nations = %L,
        discarded_at = NULL,
        visibility = %s,
        updated_at = now()
    WHERE id = v_requirement_block_id;
  END IF;

  DELETE FROM requirements
  WHERE requirement_block_id = v_requirement_block_id;
%s
$sql$,
      b.sku,
      b.sku,
      b.name,
      coalesce(b.sign_off_role::text, 'NULL'),
      coalesce(b.reviewer_role::text, 'NULL'),
      b.custom_validations::text,
      b.description,
      b.sku,
      b.display_name,
      b.display_description,
      b.first_nations,
      coalesce(b.visibility::text, 'NULL'),
      b.name,
      coalesce(b.sign_off_role::text, 'NULL'),
      coalesce(b.reviewer_role::text, 'NULL'),
      b.custom_validations::text,
      b.description,
      b.display_name,
      b.display_description,
      b.first_nations,
      coalesce(b.visibility::text, 'NULL'),
      CASE
        WHEN rv.values_sql IS NULL THEN ''
        ELSE format(
          E'\n  INSERT INTO requirements (\n    requirement_code,\n    "label",\n    input_type,\n    input_options,\n    hint,\n    required,\n    related_content,\n    required_for_in_person_hint,\n    required_for_multiple_owners,\n    created_at,\n    updated_at,\n    requirement_block_id,\n    "position",\n    elective\n  ) VALUES\n%s\n  ;\n',
          rv.values_sql
        )
      END
    ) AS line
  FROM blocks b
  LEFT JOIN req_values rv
    ON rv.requirement_block_id = b.id

  UNION ALL

  -- SECTIONS
  SELECT
    3 AS sort_major,
    row_number() OVER (ORDER BY s.position, s.created_at, s.id) AS sort_minor,
    format(
      $sql$
  SELECT id
    INTO v_target_section_id
  FROM requirement_template_sections
  WHERE requirement_template_id = v_requirement_template_id
    AND position IS NOT DISTINCT FROM %s
  ORDER BY created_at, id
  LIMIT 1;

  IF v_target_section_id IS NULL THEN
    INSERT INTO requirement_template_sections (
      name,
      requirement_template_id,
      position,
      created_at,
      updated_at,
      copied_from_id
    ) VALUES (
      %L,
      v_requirement_template_id,
      %s,
      now(),
      now(),
      NULL
    )
    RETURNING id INTO v_target_section_id;
  ELSE
    UPDATE requirement_template_sections
    SET name = %L,
        updated_at = now()
    WHERE id = v_target_section_id;
  END IF;

  v_section_map := jsonb_set(
    v_section_map,
    ARRAY[%L],
    to_jsonb(v_target_section_id),
    true
  );
$sql$,
      coalesce(s.position::text, 'NULL'),
      s.name,
      coalesce(s.position::text, 'NULL'),
      s.name,
      s.id::text
    ) AS line
  FROM sections s

  UNION ALL

  -- CLEAR LINKS FOR KEPT/UPSERTED SECTIONS
  SELECT
    4 AS sort_major,
    1 AS sort_minor,
    E'  DELETE FROM template_section_blocks\n  WHERE requirement_template_section_id IN (\n    SELECT (kv.value #>> ''{}'')::uuid\n    FROM jsonb_each(v_section_map) AS kv\n  );\n' AS line
  FROM template_row

  UNION ALL

  -- SECTION BLOCK LINKS
  SELECT
    5 AS sort_major,
    row_number() OVER (
      ORDER BY sb.requirement_template_section_id, sb.position, sb.id
    ) AS sort_minor,
    format(
      $sql$
  INSERT INTO template_section_blocks (
    requirement_template_section_id,
    requirement_block_id,
    position,
    created_at,
    updated_at
  ) VALUES (
    (v_section_map ->> %L)::uuid,
    (SELECT id FROM requirement_blocks WHERE sku = %L),
    %s,
    now(),
    now()
  );
$sql$,
      sb.requirement_template_section_id::text,
      sb.sku,
      coalesce(sb.position::text, 'NULL')
    ) AS line
  FROM section_blocks sb

  UNION ALL

  -- REMOVE OBSOLETE SECTIONS (NOT PRESENT IN SOURCE MAP)
  SELECT
    6 AS sort_major,
    1 AS sort_minor,
    E'  DELETE FROM template_section_blocks\n  WHERE requirement_template_section_id IN (\n    SELECT s.id\n    FROM requirement_template_sections s\n    WHERE s.requirement_template_id = v_requirement_template_id\n      AND NOT EXISTS (\n        SELECT 1\n        FROM jsonb_each(v_section_map) AS kv\n        WHERE (kv.value #>> ''{}'')::uuid = s.id\n      )\n  );\n\n  DELETE FROM requirement_template_sections s\n  WHERE s.requirement_template_id = v_requirement_template_id\n    AND NOT EXISTS (\n      SELECT 1\n      FROM jsonb_each(v_section_map) AS kv\n      WHERE (kv.value #>> ''{}'')::uuid = s.id\n    );\n' AS line
  FROM template_row

  UNION ALL

  -- FOOTER
  SELECT
    7 AS sort_major,
    1 AS sort_minor,
    E'END $$;\n' AS line
  FROM template_row
)
SELECT
  pg.source_program_match_count,
  g.source_template_match_count,
  string_agg(parts.line, E'\n' ORDER BY parts.sort_major, parts.sort_minor) AS generated_script
FROM program_guard pg
JOIN template_guard g ON true
LEFT JOIN parts ON true
GROUP BY pg.source_program_match_count, g.source_template_match_count;
```

---

## Step 2 — Apply the Script (Run on TARGET)

1. Copy the `generated_script` output from SOURCE.
2. Paste it into your SQL client connected to TARGET.
3. Execute it as-is.

### What the script does on the target

- Resolves target `program_id` by `program.slug` (raises an error if missing).
- Resolves target classification IDs by name for `SubmissionType`, optional `SubmissionVariant`, `UserGroupType`, `AudienceType`.
- Finds the matching target template by `program.slug` + classification combination.
- Creates the template if missing; otherwise updates template metadata in place (keeps target template UUID).
- Upserts sections by `position` (preserves existing section UUIDs where positions match).
- Rebuilds section-block mappings for the synchronized sections.
- Removes obsolete target sections that are no longer present in SOURCE for that template.
- Upserts referenced blocks by `sku`.
- Deletes/rebuilds requirements for each synced block.

---

## DBeaver Notes

- `\set` is a psql-only meta-command and will error in DBeaver.
- Use the `params` CTE shown above to set classification values inline.

---

## NOTES

> **SOURCE emits truth** > **Targets reconcile state**

This is not migrating submissions — this is **replaying template form definitions**.
**Templates still need to be published within the UI**, select the Draft template, and publish for the changes to take effect on the application.

---

## When to Use This

- Admin updates form structure in SOURCE.
- New or changed sections/blocks/requirements need to be promoted.
- Environment drift needs to be corrected.
- You want a human-reviewed, auditable process.
