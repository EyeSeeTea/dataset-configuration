SELECT DISTINCT project_co.uid   AS project_uid,
                project_co.name  AS project_name
FROM dataelementcategoryoption core_co
JOIN categories_categoryoptions cat_core
  ON cat_core.categoryoptionid = core_co.categoryoptionid
JOIN dataelementcategory core_cat
  ON core_cat.categoryid = cat_core.categoryid
 AND core_cat.name = 'Phase of Emergency'
JOIN categoryoptioncombos_categoryoptions cocco
  ON cocco.categoryoptionid = core_co.categoryoptionid
JOIN categorycombos_optioncombos ccoc
  ON ccoc.categoryoptioncomboid = cocco.categoryoptioncomboid
JOIN categorycombo cc
  ON cc.categorycomboid = ccoc.categorycomboid
 AND cc.uid = 'GmXXE8fiCK5'
JOIN datavalue dv
  ON dv.attributeoptioncomboid = cocco.categoryoptioncomboid
 AND dv.value IS NOT NULL
 AND dv.value != ''
 AND dv.deleted = false
JOIN categoryoptioncombos_categoryoptions cocco_proj
  ON cocco_proj.categoryoptioncomboid = cocco.categoryoptioncomboid
JOIN dataelementcategoryoption project_co
  ON project_co.categoryoptionid = cocco_proj.categoryoptionid
JOIN categories_categoryoptions cat_proj
  ON cat_proj.categoryoptionid = project_co.categoryoptionid
JOIN dataelementcategory proj_cat
  ON proj_cat.categoryid = cat_proj.categoryid
 AND proj_cat.name = 'Project'
WHERE core_co.name LIKE '%[DEPRECATED]%'
