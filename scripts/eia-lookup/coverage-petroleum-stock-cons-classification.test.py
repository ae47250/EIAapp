"""Source-based regressions; expectations precede classifier in source review."""
import copy,importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('c',Path(__file__).with_name('coverage-petroleum-stock-cons-classification.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Correspondence(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.nodes={n['route']:n for n in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in c.ROUTES}
  cls.drafts={route:c.build(n) for route,n in cls.nodes.items()}
 def row(self,route,code):return next(x for x in self.drafts[route]['facets']['series'] if x['sourceDefinition']['id']==code)
 def test_petroleum_total_consumption(self):
  x=self.row('petroleum/cons/psup','MTTUPUS1');self.assertEqual((x['product'],x['activity'],x['classification']),('petroleum','consumption','whole product'));self.assertIn('approximation',x['basisLabel'])
 def test_weekly_total_headline(self):
  x=self.row('petroleum/cons/wpsup','WRPUPUS2');self.assertEqual(x['classification'],'whole product');self.assertIn('requested frequency',x['reason'])
 def test_finished_petroleum_not_all_petroleum(self):
  self.assertEqual(self.row('petroleum/cons/psup','MTPUPUS1')['classification'],'subset')
 def test_finished_gasoline_consumption_vs_storage(self):
  supplied=self.row('petroleum/cons/psup','MGFUPUS1');stock=self.row('petroleum/stoc/wstk','WGFSTUS1')
  self.assertEqual(supplied['qualifierClassification'],'whole product');self.assertEqual(stock['qualifierClassification'],'subset')
 def test_total_gasoline_stock_broader_than_finished(self):
  x=self.row('petroleum/stoc/wstk','WGTSTUS1');self.assertEqual((x['classification'],x['qualifierClassification']),('subset','whole product'))
 def test_inclusive_stock_vs_spr_exclusion(self):
  self.assertEqual(self.row('petroleum/stoc/wstk','WTTSTUS1')['classification'],'whole product');self.assertEqual(self.row('petroleum/stoc/wstk','WTESTUS1')['classification'],'subset')
 def test_spr_and_refinery_are_components(self):
  self.assertEqual(self.row('petroleum/stoc/wstk','WCSSTUS1')['qualifierClassification'],'subset');self.assertEqual(self.row('petroleum/stoc/typ','MTTRSUS1')['classification'],'subset')
 def test_stock_headline_scope_kept(self):
  x=self.row('petroleum/stoc/typ','MTTSTUS1');self.assertIn('January 2005',x['sourceScope']);self.assertIn('Northeast',x['sourceScope']);self.assertEqual(x['activity'],'storage')
 def test_biofuel_total_stock_vs_component(self):
  a=self.row('petroleum/stoc/typ','M_EPOOR_SAE_NUS_MBBL');b=self.row('petroleum/stoc/typ','M_EPOOR_SKR_NUS_MBBL')
  self.assertEqual((a['product'],a['classification']),('biofuels','whole product'));self.assertEqual(b['classification'],'subset')
 def test_biofuel_supplied_not_whole_consumption(self):
  x=self.row('petroleum/cons/psup','M_EPOOR_VPP_NUS_MBBL');self.assertEqual((x['product'],x['classification']),('biofuels','subset'));self.assertIn('blender inputs',x['reason'])
 def test_crude_direct_burn_is_labelled_narrower(self):
  rows=self.drafts['petroleum/cons/psup']['facets']['series'];x=next(x for x in rows if x.get('qualifier')=='crude oil');self.assertEqual(x['qualifierClassification'],'subset');self.assertIn('burned on leases',x['basisLabel'])
 def test_prime_supplier_all_grade_is_sales_not_consumption(self):
  x=self.row('petroleum/cons/prim','C100000001');self.assertEqual((x['activity'],x['qualifierClassification']),('sales','whole product'));self.assertEqual(x['sourceScope'],'Prime-supplier local-market sales')
 def test_grade_and_refiner_channel_not_whole_gasoline(self):
  a=self.row('petroleum/cons/prim','C010010001');b=self.row('petroleum/cons/refmg','A103600001');self.assertEqual(a['qualifierClassification'],'subset');self.assertEqual(b['qualifierClassification'],'subset')
 def test_native_consumption_label_does_not_override_sales(self):
  x=c.process(c.PROCESSES['VCS']);self.assertEqual((x['activity'],x['sector']),('sales','commercial'))
 def test_adjusted_sales_differ_from_survey(self):
  a=self.row('petroleum/cons/821dst','KD0VCSSDE1');b=self.row('petroleum/cons/821dsta','KD0VAASAL1');self.assertIn('Survey',a['sourceScope']);self.assertIn('Adjusted',b['sourceScope']);self.assertEqual(a['classification'],'subset');self.assertEqual(b['activity'],'sales')
 def test_military_farm_not_invented_complete_sectors(self):
  for code in ['VMI','VFM','VHF','VHN','VAF','VAM']:self.assertNotIn('sector',c.process(c.PROCESSES[code]))
 def test_natural_gas_liquids_not_natural_gas(self):
  x=self.row('petroleum/stoc/typ','MNGSNUS1');self.assertEqual((x['product'],x['classification']),('petroleum','subset'))
 def test_missing_units_retained_and_ineligible(self):
  rows=[x for d in self.drafts.values() for x in d['facets']['series'] if x.get('coverageEligible') is False];self.assertEqual(len(rows),4);self.assertEqual(len({x['sourceDefinition']['id'] for x in rows}),3)
  for x in rows:self.assertIsNone(x['unit']);self.assertTrue(x['sourceDefinition']['name'].endswith(' '))
 def test_rate_and_total_not_converted(self):
  a=self.row('petroleum/cons/psup','MTTUPUS1');b=self.row('petroleum/cons/psup','MTTUPUS2');self.assertEqual(a['unit'],'Thousand Barrels');self.assertEqual(b['unit'],'Thousand Barrels per Day')
 def test_unknown_and_changed_definitions_fail_closed(self):
  rng=random.Random(20261029)
  for _ in range(100):
   d=copy.deepcopy(rng.choice(list(c.PRODUCTS.values())));d['id']='UNREVIEWED_'+str(rng.randrange(10**12));self.assertEqual(c.product(d,'storage')['classification'],'pending')
  d=copy.deepcopy(c.PROCESSES['SAE']);d['name']='Stock change';self.assertEqual(c.process(d)['classification'],'pending')
 def test_native_unit_and_product_conflict_rejected(self):
  route='petroleum/stoc/typ';inv=c.i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']};d=copy.deepcopy(source['series']['M_EPOOR_SAE_NUS_MBBL'])
  d['name']=d['name'].replace('Thousand Barrels','Thousand Gallons');source['series'][d['id']]=d;self.assertEqual(c.series(d,route,source)['classification'],'pending')
  d['name']='U.S. Ending Stocks of Fuel Ethanol (Thousand Barrels)';source['series'][d['id']]=d;self.assertEqual(c.series(d,route,source)['classification'],'pending')
 def test_all_definitions_provenance_and_no_publication_claim(self):
  self.assertEqual(len(self.drafts),21);self.assertEqual(sum(len(d['facets']['series']) for d in self.drafts.values()),19393)
  for route,d in self.drafts.items():
   self.assertTrue(d['complete'])
   inv=c.i.inventory(route)
   for fid,rows in d['facets'].items():
    self.assertEqual(len(rows),len(inv[fid]))
    for a,b in zip(rows,inv[fid]):
     self.assertEqual((a['sourceDefinition'],a['frequencies'],a['calls']),(b['definition'],b['frequencies'],b['calls']));self.assertEqual(a['publicationStatus'],'unverified')
if __name__=='__main__':unittest.main()
