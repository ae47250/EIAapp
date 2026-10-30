"""Source-based trade regressions, not an independent holdout."""
import copy,importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('c',Path(__file__).with_name('coverage-petroleum-trade-classification.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Trade(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.nodes={n['route']:n for n in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in c.ROUTES};cls.drafts={r:c.build(n) for r,n in cls.nodes.items()}
 def row(self,r,code):return next(x for x in self.drafts[r]['facets']['series'] if x['sourceDefinition']['id']==code)
 def test_all_product_gross_imports(self):
  x=self.row('petroleum/move/impcus','MTTIMUS2');self.assertEqual((x['classification'],x['activity'],x['subjectCode']),('whole product','imports','USA'));self.assertFalse(x['partnerRestricted'])
 def test_all_product_gross_exports(self):
  x=self.row('petroleum/move/expc','MTTEXUS1');self.assertEqual((x['classification'],x['activity']),('whole product','exports'));self.assertIn('territories',x['sourceScope'])
 def test_named_partner_not_subject_country(self):
  x=self.row('petroleum/move/wimpc','W_EPC0_IM0_NUS-NAG_MBBLD');self.assertEqual((x['subjectCode'],x['classification'],x['qualifierClassification']),('USA','subset','subset'));self.assertTrue(x['partnerRestricted'])
 def test_export_destination_is_partner(self):
  x=self.row('petroleum/move/expc','MAPEXBR2');self.assertEqual(x['subjectCode'],'USA');self.assertTrue(x['partnerRestricted']);self.assertEqual(x['activity'],'exports')
 def test_all_partner_requirement_exhaustive(self):
  for d in self.drafts.values():
   for x in d['facets']['series']:
    if x.get('partnerRestricted'):
     self.assertNotEqual(x['classification'],'whole product');self.assertNotEqual(x.get('qualifierClassification'),'whole product')
 def test_net_import_never_gross(self):
  for x in self.drafts['petroleum/move/neti']['facets']['series']:
   self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_weekly_net_balances_remain_out(self):
  xs=[x for x in self.drafts['petroleum/move/wkly']['facets']['series'] if 'Net Imports' in x['sourceDefinition']['name']];self.assertTrue(xs)
  for x in xs:self.assertEqual(x['classification'],'out of vocabulary')
 def test_spr_population_is_narrower(self):
  x=self.row('petroleum/move/wkly','WCSIMUS2');self.assertTrue(x['populationRestricted']);self.assertEqual(x['qualifierClassification'],'subset')
 def test_components_never_whole_petroleum(self):
  for code in ['EPC0','EPM0','EPM0F','EPOBG','EPP0']:
   x=c.product(c.PRODUCTS[code]);self.assertEqual(x['classification'],'subset')
 def test_gasoline_total_includes_blendstocks(self):
  self.assertEqual(c.product(c.PRODUCTS['EPM0'])['qualifierClassification'],'whole product')
  for code in ['EPM0F','EPOBG']:self.assertEqual(c.product(c.PRODUCTS[code])['qualifierClassification'],'subset')
 def test_biofuel_total_vs_component(self):
  a=c.product(c.PRODUCTS['EPOOR']);b=c.product(c.PRODUCTS['EPOORDB']);self.assertEqual((a['product'],a['classification']),('biofuels','whole product'));self.assertEqual(b['classification'],'subset')
 def test_residual_state_import_not_whole_petroleum(self):
  x=self.row('petroleum/move/res','MREIMCA2');self.assertEqual((x['product'],x['classification'],x['activity']),('petroleum','subset','imports'))
 def test_rail_domestic_not_imports(self):
  x=self.row('petroleum/move/railNA','ESM_EPC0_RAIL_NUS-R30_MBBL');self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_rail_canada_receipts_direction(self):
  x=self.row('petroleum/move/railNA','ESM_EPOOXE_RAIL_NCA-NUS_MBBL');self.assertEqual((x['classification'],x['activity'],x['subjectNativePlace']),('subset','exports','NUS'))
 def test_rail_us_receipts_direction(self):
  x=self.row('petroleum/move/railNA','ESM_EPLLPA_RAIL_NUS-NCA_MBBL');self.assertEqual((x['classification'],x['activity'],x['subjectNativePlace']),('subset','imports','NUS'))
 def test_no_rail_aggregate_as_whole_trade(self):
  for x in self.drafts['petroleum/move/railNA']['facets']['series']:self.assertNotEqual(x['classification'],'whole product');self.assertNotEqual(x.get('qualifierClassification'),'whole product')
 def test_weekly_exports_label_estimate(self):
  xs=[x for x in self.drafts['petroleum/move/wkly']['facets']['series'] if x.get('activity')=='exports'];self.assertTrue(xs)
  for x in xs:self.assertIn('EIA weekly export estimate',x['basisLabel'])
 def test_native_missing_place_not_repaired(self):
  x=self.row('petroleum/move/wkly','W_EPLLPZ_IM0_R45-Z00_MBBLD');self.assertFalse(x['coverageEligible']);self.assertEqual(x['nativePlace'],'R45-Z00');self.assertIn('absent',x['geographyValidity'])
 def test_contradictory_total_title_blocks_coverage(self):
  x=self.row('petroleum/move/impcus','M_EPL2_IM0_NUS-Z00_MBBLD');self.assertFalse(x['coverageEligible']);self.assertIn('Imports From U.S.',x['sourceDefinition']['name'])
 def test_unknown_codes_cannot_borrow_valid_names(self):
  rng=random.Random(20261029)
  for _ in range(100):
   d=copy.deepcopy(rng.choice(list(c.PRODUCTS.values())));d['id']='UNKNOWN_'+str(rng.randrange(10**12));self.assertEqual(c.product(d)['classification'],'pending')
  d=copy.deepcopy(c.PROCESSES['IM0']);d['name']='Net Imports';self.assertEqual(c.process(d)['classification'],'pending')
 def test_total_vs_daily_rate_preserved(self):
  a=self.row('petroleum/move/impcus','MTTIMUS1');b=self.row('petroleum/move/impcus','MTTIMUS2');self.assertEqual(a['unit'],'Thousand Barrels');self.assertEqual(b['unit'],'Thousand Barrels per Day')
 def test_all_definitions_provenance_preserved(self):
  self.assertEqual(len(self.drafts),9);self.assertEqual(sum(len(x['facets']['series']) for x in self.drafts.values()),23074)
  for route,d in self.drafts.items():
   self.assertTrue(d['complete']);inv=c.i.inventory(route)
   for fid,rows in d['facets'].items():
    self.assertEqual(len(rows),len(inv[fid]))
    for a,b in zip(rows,inv[fid]):self.assertEqual((a['sourceDefinition'],a['frequencies'],a['calls']),(b['definition'],b['frequencies'],b['calls']));self.assertEqual(a['publicationStatus'],'unverified')
if __name__=='__main__':unittest.main()
