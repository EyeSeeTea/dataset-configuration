-- ============================================================================
-- DHIS2 Category Combo Migration Script - Project-Target/Actual
-- ============================================================================
-- FROM: XD0Qk3oO7nE (Project-Target/Actual)
--       Categories: MRwzyV0kXv9 (Project) x sHta2dMEOLO (ActualTargets)
--
-- TO:   MF8jD5Bx26t (Project-Target-Actual-Old)
--       Categories: WIWj6TauYO8 (Old_Project) x sHta2dMEOLO (ActualTargets)
--
-- What this script does:
--   1. Assigns 2 categories to the destination categoryCombo
--   2. Identifies COCs to move: all COCs in XD0Qk3oO7nE whose project is in Old_Project
--   3. Removes duplicate empty COCs from MF8jD5Bx26t (preexisting, no dataValues)
--   4. Moves the original COCs from XD0Qk3oO7nE -> MF8jD5Bx26t
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Assign 2 categories to destination categoryCombo MF8jD5Bx26t
-- sort_order starts at 1 (DHIS2 convention)
-- ============================================================================

INSERT INTO categorycombos_categories (categorycomboid, categoryid, sort_order)
VALUES
  ((SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t'),
   (SELECT categoryid FROM dataelementcategory WHERE uid = 'WIWj6TauYO8'), 1),
  ((SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t'),
   (SELECT categoryid FROM dataelementcategory WHERE uid = 'sHta2dMEOLO'), 2)
ON CONFLICT DO NOTHING;

SELECT 'STEP 1 - Categories assigned to destination combo' AS step,
       COUNT(*) AS categories_count
FROM categorycombos_categories
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t');
-- Expected: 2

-- ============================================================================
-- STEP 2: Identify COCs to move from XD0Qk3oO7nE
-- All COCs whose project is in Old_Project (WIWj6TauYO8)
-- ============================================================================

CREATE TEMP TABLE cocs_to_move AS
SELECT DISTINCT ccoc.categoryoptioncomboid
FROM categorycombos_optioncombos ccoc
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'XD0Qk3oO7nE'
JOIN categoryoptioncombos_categoryoptions cocco_proj
  ON cocco_proj.categoryoptioncomboid = ccoc.categoryoptioncomboid
JOIN categories_categoryoptions cat_old
  ON cat_old.categoryoptionid = cocco_proj.categoryoptionid
JOIN dataelementcategory old_cat
  ON old_cat.categoryid = cat_old.categoryid
 AND old_cat.uid = 'WIWj6TauYO8';

SELECT 'STEP 2 - COCs to move identified' AS step, COUNT(*) AS total FROM cocs_to_move;

-- ============================================================================
-- STEP 3: Identify and remove duplicate empty COCs from MF8jD5Bx26t
-- These are preexisting COCs with the same options but no dataValues
-- ============================================================================

CREATE TEMP TABLE duplicate_cocs_to_remove AS
SELECT DISTINCT ccoc2.categoryoptioncomboid
FROM cocs_to_move ctm
-- Original COC in XD0Qk3oO7nE
JOIN categoryoptioncombos_categoryoptions co1_proj
  ON co1_proj.categoryoptioncomboid = ctm.categoryoptioncomboid
JOIN categories_categoryoptions cat_old
  ON cat_old.categoryoptionid = co1_proj.categoryoptionid
JOIN dataelementcategory old_cat
  ON old_cat.categoryid = cat_old.categoryid
 AND old_cat.uid = 'WIWj6TauYO8'
JOIN categoryoptioncombos_categoryoptions co1_at
  ON co1_at.categoryoptioncomboid = ctm.categoryoptioncomboid
JOIN categories_categoryoptions cat_at
  ON cat_at.categoryoptionid = co1_at.categoryoptionid
JOIN dataelementcategory at_cat
  ON at_cat.categoryid = cat_at.categoryid
 AND at_cat.uid = 'sHta2dMEOLO'
-- Matching duplicate in MF8jD5Bx26t (same project + same actual/target)
JOIN categorycombos_optioncombos ccoc2
  ON ccoc2.categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t')
 AND ccoc2.categoryoptioncomboid != ctm.categoryoptioncomboid
JOIN categoryoptioncombos_categoryoptions co2_proj
  ON co2_proj.categoryoptioncomboid = ccoc2.categoryoptioncomboid
 AND co2_proj.categoryoptionid = co1_proj.categoryoptionid
JOIN categoryoptioncombos_categoryoptions co2_at
  ON co2_at.categoryoptioncomboid = ccoc2.categoryoptioncomboid
 AND co2_at.categoryoptionid = co1_at.categoryoptionid;

SELECT 'STEP 3a - Duplicate empty COCs identified' AS step,
       COUNT(*) AS total FROM duplicate_cocs_to_remove;

-- Verify none of the duplicates have dataValues
SELECT 'STEP 3b - DataValues in duplicates (MUST be 0)' AS step,
       COUNT(*) AS total
FROM datavalue dv
WHERE dv.attributeoptioncomboid IN (SELECT categoryoptioncomboid FROM duplicate_cocs_to_remove)
  AND dv.deleted = false;

-- Remove duplicates from bridge table
DELETE FROM categorycombos_optioncombos
WHERE categoryoptioncomboid IN (SELECT categoryoptioncomboid FROM duplicate_cocs_to_remove)
  AND categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t');

SELECT 'STEP 3c - Duplicate COCs removed from MF8jD5Bx26t' AS step,
       COUNT(*) AS remaining
FROM categorycombos_optioncombos
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t');

-- ============================================================================
-- STEP 4: Move COCs - update bridge table categorycombos_optioncombos
-- ============================================================================

UPDATE categorycombos_optioncombos
SET categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t')
WHERE categoryoptioncomboid IN (SELECT categoryoptioncomboid FROM cocs_to_move);

SELECT 'STEP 4 - COCs moved to destination combo' AS step, COUNT(*) AS total
FROM categorycombos_optioncombos
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- VERIFY 1 - Categories assigned to destination combo
SELECT 'VERIFY 1 - Categories in MF8jD5Bx26t' AS check_name,
       cat.uid, cat.name, cc_cat.sort_order
FROM categorycombos_categories cc_cat
JOIN dataelementcategory cat ON cat.categoryid = cc_cat.categoryid
WHERE cc_cat.categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t')
ORDER BY cc_cat.sort_order;
-- Expected: 2 rows (WIWj6TauYO8, sHta2dMEOLO)

-- VERIFY 2 - No old_project COCs remaining in XD0Qk3oO7nE
SELECT 'VERIFY 2 - Old project COCs remaining in XD0Qk3oO7nE (should be 0)' AS check_name,
       COUNT(*) AS total
FROM categorycombos_optioncombos ccoc
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'XD0Qk3oO7nE'
JOIN categoryoptioncombos_categoryoptions cocco_proj
  ON cocco_proj.categoryoptioncomboid = ccoc.categoryoptioncomboid
JOIN categories_categoryoptions cat_old
  ON cat_old.categoryoptionid = cocco_proj.categoryoptionid
JOIN dataelementcategory old_cat
  ON old_cat.categoryid = cat_old.categoryid
 AND old_cat.uid = 'WIWj6TauYO8';
-- Expected: 0

-- VERIFY 3 - Total COCs in MF8jD5Bx26t
SELECT 'VERIFY 3 - Total COCs in MF8jD5Bx26t' AS check_name,
       COUNT(*) AS total
FROM categorycombos_optioncombos
WHERE categorycomboid = (SELECT categorycomboid FROM categorycombo WHERE uid = 'MF8jD5Bx26t');

-- VERIFY 4 - Sample moved COC structure
SELECT 'VERIFY 4 - Sample moved COC structure' AS check_name,
       coc.uid AS coc_uid,
       string_agg(opt.name, ' | ' ORDER BY opt.name) AS options
FROM categorycombos_optioncombos ccoc
JOIN categorycombo cc ON cc.categorycomboid = ccoc.categorycomboid AND cc.uid = 'MF8jD5Bx26t'
JOIN categoryoptioncombo coc ON coc.categoryoptioncomboid = ccoc.categoryoptioncomboid
JOIN categoryoptioncombos_categoryoptions cocco ON cocco.categoryoptioncomboid = coc.categoryoptioncomboid
JOIN dataelementcategoryoption opt ON opt.categoryoptionid = cocco.categoryoptionid
GROUP BY coc.uid
LIMIT 5;

-- VERIFY 5 - DataValues in MF8jD5Bx26t
SELECT 'VERIFY 5 - DataValues in MF8jD5Bx26t (should be > 0)' AS check_name,
       COUNT(*) AS total
FROM datavalue dv
JOIN categorycombos_optioncombos ccoc
  ON ccoc.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'MF8jD5Bx26t'
WHERE dv.deleted = false;

SELECT 'VERIFY 6 - Old project DataValues in XD0Qk3oO7nE (must be 0)' AS check_name,
       COUNT(*) AS total
FROM datavalue dv
JOIN categorycombos_optioncombos ccoc
  ON ccoc.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'XD0Qk3oO7nE'
JOIN categoryoptioncombos_categoryoptions cocco_proj
  ON cocco_proj.categoryoptioncomboid = dv.attributeoptioncomboid
JOIN categories_categoryoptions cat_old
  ON cat_old.categoryoptionid = cocco_proj.categoryoptionid
JOIN dataelementcategory old_cat
  ON old_cat.categoryid = cat_old.categoryid
 AND old_cat.uid = 'WIWj6TauYO8';
-- Expected: 0

-- VERIFY 7 - No duplicate COCs in MF8jD5Bx26t
SELECT 'VERIFY 7 - No duplicates in MF8jD5Bx26t' AS check_name,
       COUNT(*) AS total
FROM (
  SELECT string_agg(cocco.categoryoptionid::text, ',' ORDER BY cocco.categoryoptionid) AS combo_key
  FROM categorycombos_optioncombos ccoc
  JOIN categorycombo cc ON cc.categorycomboid = ccoc.categorycomboid AND cc.uid = 'MF8jD5Bx26t'
  JOIN categoryoptioncombos_categoryoptions cocco ON cocco.categoryoptioncomboid = ccoc.categoryoptioncomboid
  GROUP BY ccoc.categoryoptioncomboid
) sub
GROUP BY combo_key
HAVING COUNT(*) > 1;
-- Expected: 0


COMMIT;
-- ROLLBACK;

DROP TABLE IF EXISTS cocs_to_move;
DROP TABLE IF EXISTS duplicate_cocs_to_remove;
