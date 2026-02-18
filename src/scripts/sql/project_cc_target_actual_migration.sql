-- ============================================================================
-- DHIS2 Category Combo Migration Script
-- ============================================================================
-- FROM: GmXXE8fiCK5 (Project-CC-Target/Actual)
--       Categories: MRwzyV0kXv9 (Project) x ouNRBWIbnxY (Phase of Emergency) x sHta2dMEOLO (ActualTargets)
--
-- TO:   hTqaMzEox3l (ProjectTargetActual_Old)
--       Categories: WIWj6TauYO8 (Old_Project) x Ce6Bdp9vVog (CoreCompetencies_Deprecated) x sHta2dMEOLO (ActualTargets)
--
-- What this script does:
--   1. Identifies "old projects" = projects with dataValues in deprecated Phase of Emergency options
--   2. Moves those project categoryOptions from Project -> Old_Project category
--   3. Assigns 3 categories to the destination categoryCombo (old_project, cc_deprecated and ActualTargets)
--   4. Moves the affected categoryOptionCombos from GmXXE8fiCK5 -> hTqaMzEox3l
--
-- datavalue table is NOT updated - the COC IDs stay the same, only their
-- categoryCombo changes via the bridge table.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create temp table with the "old project" IDs
-- ============================================================================

CREATE TEMP TABLE old_projects AS
SELECT DISTINCT project_co.categoryoptionid,
                project_co.uid,
                project_co.name
FROM datavalue dv
-- The COC of the dataValue
JOIN categoryoptioncombos_categoryoptions cocco_phase
  ON cocco_phase.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN dataelementcategoryoption phase_co
  ON phase_co.categoryoptionid = cocco_phase.categoryoptionid
 AND phase_co.name LIKE '%[DEPRECATED]%'
JOIN categories_categoryoptions cat_phase
  ON cat_phase.categoryoptionid = phase_co.categoryoptionid
JOIN dataelementcategory phase_cat
  ON phase_cat.categoryid = cat_phase.categoryid
 AND phase_cat.uid = 'ouNRBWIbnxY'
-- From the SAME COC, extract the project
JOIN categoryoptioncombos_categoryoptions cocco_proj
  ON cocco_proj.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN dataelementcategoryoption project_co
  ON project_co.categoryoptionid = cocco_proj.categoryoptionid
JOIN categories_categoryoptions cat_proj
  ON cat_proj.categoryoptionid = project_co.categoryoptionid
JOIN dataelementcategory proj_cat
  ON proj_cat.categoryid = cat_proj.categoryid
 AND proj_cat.uid = 'MRwzyV0kXv9'
-- Ensure the COC belongs to the correct combo
JOIN categorycombos_optioncombos ccoc
  ON ccoc.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'GmXXE8fiCK5'
WHERE dv.deleted = false;

SELECT 'STEP 1 - Old projects identified' AS step, COUNT(*) AS total FROM old_projects;

-- How many old_projects are NEW (not already in Old_Project)
SELECT 'VERIFY 1a - Old projects NEW in Old_Project' AS check_name,
       COUNT(*) AS total
FROM old_projects op
WHERE NOT EXISTS (
  SELECT 1 FROM categories_categoryoptions existing
  WHERE existing.categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8')
    AND existing.categoryoptionid = op.categoryoptionid
);

-- How many old_projects already exist in Old_Project
SELECT 'VERIFY 1b - Old projects ALREADY in Old_Project' AS check_name,
       COUNT(*) AS total
FROM old_projects op
WHERE EXISTS (
  SELECT 1 FROM categories_categoryoptions existing
  WHERE existing.categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8')
    AND existing.categoryoptionid = op.categoryoptionid
);

-- ============================================================================
-- STEP 2a: Add old projects to Old_Project category (WIWj6TauYO8)
-- ============================================================================

INSERT INTO categories_categoryoptions (categoryid, categoryoptionid, sort_order)
SELECT
  (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8'),
  op.categoryoptionid,
  COALESCE(
    (SELECT MAX(sort_order) FROM categories_categoryoptions
     WHERE categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8')),
    0
  ) + row_number() OVER (ORDER BY op.categoryoptionid)
FROM old_projects op
WHERE NOT EXISTS (
  SELECT 1 FROM categories_categoryoptions existing
  WHERE existing.categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8')
    AND existing.categoryoptionid = op.categoryoptionid
);

SELECT 'STEP 2a - Old projects added to Old_Project category' AS step,
       COUNT(*) AS total
FROM categories_categoryoptions
WHERE categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8');

-- ============================================================================
-- STEP 2b: Remove old projects from Project category (MRwzyV0kXv9)
-- ============================================================================

DELETE FROM categories_categoryoptions
WHERE categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'MRwzyV0kXv9')
  AND categoryoptionid IN (SELECT categoryoptionid FROM old_projects);

SELECT 'STEP 2b - Old projects removed from Project category' AS step,
       COUNT(*) AS remaining
FROM categories_categoryoptions
WHERE categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'MRwzyV0kXv9');

-- ============================================================================
-- STEP 3: Assign 3 categories to destination categoryCombo hTqaMzEox3l
-- sort_order starts at 1 (DHIS2 convention)
-- ============================================================================

INSERT INTO categorycombos_categories (categorycomboid, categoryid, sort_order)
VALUES
  ((SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l'),
   (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8'), 1),
  ((SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l'),
   (SELECT categoryid FROM dataelementcategory WHERE uid = 'Ce6Bdp9vVog'), 2),
  ((SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l'),
   (SELECT categoryid FROM dataelementcategory WHERE uid = 'sHta2dMEOLO'), 3)
ON CONFLICT DO NOTHING;

SELECT 'STEP 3 - Categories assigned to destination combo' AS step,
       COUNT(*) AS categories_count
FROM categorycombos_categories
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l');

-- ============================================================================
-- STEP 4: Identify COCs to move
-- ============================================================================

CREATE TEMP TABLE cocs_to_move AS
SELECT DISTINCT ccoc.categoryoptioncomboid
FROM categorycombos_optioncombos ccoc
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'GmXXE8fiCK5'
-- COC contains a deprecated Phase of Emergency
JOIN categoryoptioncombos_categoryoptions cocco_dep
  ON cocco_dep.categoryoptioncomboid = ccoc.categoryoptioncomboid
JOIN dataelementcategoryoption dep_opt
  ON dep_opt.categoryoptionid = cocco_dep.categoryoptionid
 AND dep_opt.name LIKE '%[DEPRECATED]%'
JOIN categories_categoryoptions cat_dep
  ON cat_dep.categoryoptionid = dep_opt.categoryoptionid
JOIN dataelementcategory dep_cat
  ON dep_cat.categoryid = cat_dep.categoryid
 AND dep_cat.uid = 'ouNRBWIbnxY'
-- Only COCs that have dataValues
JOIN datavalue dv
  ON dv.attributeoptioncomboid = ccoc.categoryoptioncomboid
 AND dv.deleted = false;

SELECT 'STEP 4 - COCs to move identified' AS step, COUNT(*) AS total FROM cocs_to_move;

-- ============================================================================
-- STEP 5: Move COCs - update bridge table categorycombos_optioncombos
-- ============================================================================

UPDATE categorycombos_optioncombos
SET categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l')
WHERE categoryoptioncomboid IN (SELECT categoryoptioncomboid FROM cocs_to_move);

SELECT 'STEP 5 - COCs moved to destination combo' AS step, COUNT(*) AS total
FROM categorycombos_optioncombos
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'VERIFY 1 - Deprecated COCs remaining in GmXXE8fiCK5 (should be 0)' AS check_name,
       COUNT(*) AS total
FROM categorycombos_optioncombos ccoc
JOIN categorycombo cc ON cc.categorycomboid = ccoc.categorycomboid AND cc.uid = 'GmXXE8fiCK5'
JOIN categoryoptioncombos_categoryoptions cocco ON cocco.categoryoptioncomboid = ccoc.categoryoptioncomboid
JOIN dataelementcategoryoption opt ON opt.categoryoptionid = cocco.categoryoptionid AND opt.name LIKE '%[DEPRECATED]%';

SELECT 'VERIFY 2 - Total COCs in hTqaMzEox3l' AS check_name,
       COUNT(*) AS total
FROM categorycombos_optioncombos
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'hTqaMzEox3l');

SELECT 'VERIFY 3 - CategoryOptions in Old_Project (WIWj6TauYO8)' AS check_name,
       COUNT(*) AS total
FROM categories_categoryoptions
WHERE categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8');

SELECT 'VERIFY 4 - CategoryOptions remaining in Project (MRwzyV0kXv9)' AS check_name,
       COUNT(*) AS total
FROM categories_categoryoptions
WHERE categoryid = (SELECT categoryid FROM dataelementcategory WHERE uid = 'MRwzyV0kXv9');

SELECT 'VERIFY 5 - Sample moved COC structure (only first 5 rows)' AS check_name,
       coc.uid AS coc_uid,
       string_agg(opt.name, ' | ' ORDER BY opt.name) AS options
FROM categorycombos_optioncombos ccoc
JOIN categorycombo cc ON cc.categorycomboid = ccoc.categorycomboid AND cc.uid = 'hTqaMzEox3l'
JOIN categoryoptioncombo coc ON coc.categoryoptioncomboid = ccoc.categoryoptioncomboid
JOIN categoryoptioncombos_categoryoptions cocco ON cocco.categoryoptioncomboid = coc.categoryoptioncomboid
JOIN dataelementcategoryoption opt ON opt.categoryoptionid = cocco.categoryoptionid
GROUP BY coc.uid
LIMIT 5;

-- VERIFY 6 - DataValues associated to the new combo (should be > 0)
SELECT 'VERIFY 6 - DataValues in hTqaMzEox3l (should be > 0)' AS check_name,
       COUNT(*) AS total
FROM datavalue dv
JOIN categorycombos_optioncombos ccoc
  ON ccoc.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'hTqaMzEox3l'
WHERE dv.deleted = false;

-- VERIFY 7 - DataValues with deprecated in old combo (should be 0)
SELECT 'VERIFY 7 - Deprecated DataValues in GmXXE8fiCK5 (should be 0)' AS check_name,
       COUNT(*) AS total
FROM datavalue dv
JOIN categorycombos_optioncombos ccoc
  ON ccoc.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'GmXXE8fiCK5'
JOIN categoryoptioncombos_categoryoptions cocco
  ON cocco.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN dataelementcategoryoption opt
  ON opt.categoryoptionid = cocco.categoryoptionid
 AND opt.name LIKE '%[DEPRECATED]%'
WHERE dv.deleted = false;

COMMIT;
-- ROLLBACK;

DROP TABLE IF EXISTS old_projects;
DROP TABLE IF EXISTS cocs_to_move;
