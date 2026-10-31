"""Source-based manufacturing/component regressions; not independent holdouts."""
import copy,importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('c',Path(__file__).with_name('coverage-petroleum-components-classification.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Components(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.nodes={n['route']:n for n in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in c.ROUTES};cls.drafts={r:c.build(n) for r,n in cls.nodes.items()}
 def row(self,r,code):return next(x for x in self.drafts[r]['facets']['series'] if x['sourceDefinition']['id']==code)
 def test_biodiesel_output_is_component(self):
  x=self.row('petroleum/sum/b100','M_EPOOBD_YNPB_NUS_MMGL');self.assertEqual((x['classification'],x['product'],x['activity']),('subset','biofuels','production'));self.assertIn('December 2020',x['sourcePeriodNote'])
 def test_biodiesel_count_not_customers_or_capacity(self):
  x=self.row('petroleum/sum/b100','M_EPOOBD_8BDPC0_SAZ_C');self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_stock_level_vs_change(self):
  a=self.row('petroleum/sum/b100','M_EPOOBD_SAE_NUS_MMGL');b=self.row('petroleum/sum/b100','M_EPOOBD_SCG_NUS_MMGL');self.assertEqual(a['activity'],'storage');self.assertEqual(b['classification'],'out of vocabulary')
 def test_neat_and_blended_sales_keep_source(self):
  a=self.row('petroleum/sum/b100','M_EPOOBD_VBP_NUS_MMGL');b=self.row('petroleum/sum/b100','M_EPOOBD_VBPIB_NUS_MMGL');self.assertEqual(a['activity'],'sales');self.assertEqual(b['activity'],'sales');self.assertNotEqual(a['basisLabel'],b['basisLabel'])
 def test_capacity_not_monthly_output(self):
  x=self.row('petroleum/pnp/capbio','M_EPOORDB_8BDPC_NUS_MMGL');self.assertEqual((x['activity'],x['classification']),('capacity','subset'));self.assertIn('per year',x['unitBasis']);self.assertEqual(x['unit'],'Million Gallons')
 def test_no_capacity_component_sum(self):
  for x in self.drafts['petroleum/pnp/capbio']['facets']['series']:self.assertEqual(x['classification'],'subset')
 def test_raw_feedstock_not_biofuel_output(self):
  for x in self.drafts['petroleum/pnp/feedbiofuel']['facets']['series']:self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_gas_plant_liquids_not_gas(self):
  for x in self.drafts['petroleum/pnp/gp']['facets']['series']:self.assertEqual((x['product'],x['activity'],x['classification']),('petroleum','production','subset'))
 def test_oxygenate_does_not_mean_biofuel(self):
  rows=self.drafts['petroleum/pnp/oxy']['facets']['series']
  for x in rows:self.assertEqual(x['product'],'biofuels' if x['nativeProduct']=='EPOOXE' else 'petroleum');self.assertEqual(x['classification'],'subset')
 def test_ethanol_not_whole_biofuels(self):
  x=self.row('petroleum/pnp/wprode','W_EPOOXE_YOP_NUS_MBBLD');self.assertEqual((x['product'],x['classification']),('biofuels','subset'))
 def test_refinery_gas_fuel_is_not_gas_output(self):
  x=self.row('petroleum/pnp/capfuel','8_NA_8FN0_NUS_2');self.assertEqual((x['product'],x['activity'],x['sectorCellClassification']),('natural gas','consumption','subset'))
 def test_hydrogen_feedstock_not_hydrogen_production(self):
  x=self.row('petroleum/pnp/feedng','8_NA_8NGFSHY_NUS_MMCF');self.assertEqual((x['product'],x['activity']),('natural gas','consumption'));self.assertIn('one non-energy use',x['sourceScope'])
 def test_bioplant_coal_not_whole_industrial(self):
  x=self.row('petroleum/pnp/bioplfuel','8_NA_819CL0_NUS_MST');self.assertEqual((x['product'],x['sector'],x['sectorCellClassification']),('coal','industrial','subset'))
 def test_purchased_power_label(self):
  x=self.row('petroleum/pnp/bioplfuel','8_NA_819PE0_NUS_MMKWH');self.assertEqual(x['product'],'electricity');self.assertIn('excludes on-site',x['sourceScope'])
 def test_steam_hydrogen_not_invented_products(self):
  for code in ['8FS0','819PS0','819PH0']:self.assertEqual(c.process(c.PROCESSES[code])['classification'],'out of vocabulary')
 def test_mixed_other_fuels_not_all_renewable(self):
  x=c.process(c.PROCESSES['819OF0']);self.assertEqual((x['product'],x['classification']),('total energy','subset'))
 def test_missing_unit_preserved(self):
  xs=[x for x in self.drafts['petroleum/pnp/gp']['facets']['series'] if not x.get('unit')];self.assertEqual(len(xs),2)
  for x in xs:self.assertFalse(x['coverageEligible']);self.assertIn('omits unit',x['unitValidity'])
 def test_unknown_definitions_fail_closed(self):
  rng=random.Random(20261029)
  for _ in range(100):
   d=copy.deepcopy(rng.choice(list(c.PRODUCTS.values())));d['id']='UNKNOWN_'+str(rng.randrange(10**12));self.assertEqual(c.product(d,'petroleum/pnp/gp')['classification'],'pending')
  d=copy.deepcopy(c.PROCESSES['8FN0']);d['name']='Hydrogen Production';self.assertEqual(c.process(d)['classification'],'pending')
 def test_unit_conflict_retained_as_pending(self):
  route='petroleum/pnp/feedng';inv=c.i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']};d=copy.deepcopy(source['series']['8_NA_8NGFSHY_NUS_MMCF']);d['name']=d['name'].replace('Million Cubic Feet','Million Gallons');source['series'][d['id']]=d;self.assertEqual(c.series(d,route,source)['classification'],'pending')
 def test_complete_definition_provenance_no_whole_claims(self):
  self.assertEqual(len(self.drafts),9);self.assertEqual(sum(len(d['facets']['series']) for d in self.drafts.values()),570)
  for route,d in self.drafts.items():
   self.assertTrue(d['complete']);inv=c.i.inventory(route)
   for fid,rows in d['facets'].items():
    self.assertEqual(len(rows),len(inv[fid]))
    for a,b in zip(rows,inv[fid]):self.assertEqual((a['sourceDefinition'],a['frequencies'],a['calls']),(b['definition'],b['frequencies'],b['calls']));self.assertEqual(a['publicationStatus'],'unverified')
   for x in d['facets']['series']:self.assertNotEqual(x['classification'],'whole product')
if __name__=='__main__':unittest.main()
