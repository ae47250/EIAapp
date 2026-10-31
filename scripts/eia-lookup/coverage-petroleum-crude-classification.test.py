"""Source-based crude tests; retain reserve distinctions and native rate units."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-petroleum-crude-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CrudeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nodes={n['route']:n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in m.ROUTES}
        cls.built={r:m.build(n) for r,n in cls.nodes.items()}
    def row(self,leaf,code):return next(x for x in self.built['petroleum/crd/'+leaf]['facets']['series'] if x['sourceDefinition']['id']==code)
    def test_crude_is_not_whole_petroleum(self):
        r=self.row('crpdn','MCRFPUS1');self.assertEqual((r['product'],r['classification'],r['qualifier'],r['qualifierClassification']),('petroleum','subset','crude oil','whole product'))
    def test_rate_and_period_total_remain_distinct(self):
        a=self.row('crpdn','MCRFPTX1');b=self.row('crpdn','MCRFPTX2');self.assertEqual(a['unit'],'Thousand Barrels');self.assertEqual(b['unit'],'Thousand Barrels per Day')
    def test_north_slope_not_whole_alaska(self):
        self.assertEqual(self.row('crpdn','MANFPAK1')['qualifierClassification'],'subset');self.assertEqual(self.row('crpdn','MCRFPAK1')['qualifierClassification'],'whole product')
    def test_all_gravity_not_one_gravity_band(self):
        self.assertEqual(self.row('api','M_EPC99A_FPF_STX_MBBLD')['qualifierClassification'],'whole product');self.assertEqual(self.row('api','M_EPC50G_FPF_STX_MBBLD')['qualifierClassification'],'subset');self.assertEqual(self.row('api','M_EPC00U_FPF_R48_MBBLD')['qualifierClassification'],'subset')
    def test_malformed_unit_preserved_and_ineligible(self):
        r=self.row('api','M_EPC50G_FPF_R98_MBBLD');self.assertTrue(r['sourceDefinition']['name'].endswith(')ULL'));self.assertIsNone(r['unit']);self.assertFalse(r['coverageEligible']);self.assertEqual(r['qualifierClassification'],'subset')
    def test_reserve_sale_not_physical_product_sale(self):
        self.assertEqual(self.row('pres','RCRR05NUS_1')['classification'],'out of vocabulary')
    def test_reserve_survey_production_not_reserve_level(self):
        r=self.row('cplc','RES_EPCCOND_R10_NUS_MMBBL');self.assertEqual(r['activity'],'production');self.assertIn('estimated from reserves survey',r['basisLabel']);self.assertIn('official EIA field-production',r['selectionConstraint'])
    def test_nonproducing_reservoirs_remain_component(self):
        for r in self.built['petroleum/crd/nprod']['facets']['series']:
            self.assertEqual(r['classification'],'subset')
            if r.get('qualifier'):self.assertEqual(r['qualifierClassification'],'subset')
    def test_reserve_logic_reused_without_changed_meanings(self):
        for leaf in ['pres','cplc','nprod']:
            for r in self.built['petroleum/crd/'+leaf]['facets']['series']:
                expected=m.r.series(r['sourceDefinition'])
                for k,v in expected.items():self.assertEqual(r[k],v)
    def test_unknown_product_name_cannot_borrow_total_code(self):
        self.assertEqual(m.product({'id':'EPC99A','name':'Some gravity grades'})['classification'],'pending')
    def test_native_total_and_full_title_must_agree(self):
        inv=m.i.inventory('petroleum/crd/api');source={fid:{r['definition']['id']:r['definition'] for r in inv[fid]} for fid in ['product','duoarea']}
        d={'id':'M_EPC99A_FPF_STX_MBBLD','name':'Texas Crude Oil and Lease Condensate Production for 50.1 or Higher Degrees API Gravity (Thousand Barrels per Day)'}
        self.assertEqual(m.field_series(d,'petroleum/crd/api',source)['classification'],'pending')
    def test_all_definitions_retained_without_publication_claim(self):
        self.assertEqual(len(self.built),5);self.assertEqual(sum(len(x['facets']['series']) for x in self.built.values()),1594)
        for route,x in self.built.items():
            self.assertTrue(x['complete']);self.assertEqual({r['id']:r['sourceDefinition'] for r in x['dataColumns']},self.nodes[route]['data'])
            for fid,rows in x['facets'].items():
                original=m.i.inventory(route)[fid];self.assertEqual([(r['sourceDefinition'],r['frequencies'],r['calls']) for r in rows],[(r['definition'],r['frequencies'],r['calls']) for r in original]);self.assertTrue(all(r['publicationStatus']=='unverified' for r in rows))
if __name__=='__main__':unittest.main()
