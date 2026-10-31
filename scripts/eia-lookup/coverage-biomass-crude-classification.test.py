"""Source-based regressions, not a standard benchmark or independent holdout."""
import importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-biomass-crude-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class BiomassCrudeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nodes={n['route']:n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and (n['route']=='crude-oil-imports' or n['route'].startswith('densified-biomass/'))}
    def col(self,route,key):return m.column(route,key,self.nodes[route]['data'][key])
    def test_source_expectations_recorded_before_classifier(self):
        for e in m.i.read(m.i.EVIDENCE/'biomass-crude-source-review.json')['expectationsBeforeClassifierEdit']:
            r=self.col(e['route'],e['column'])
            for k,v in e.items():
                if k not in ['route','column']:self.assertEqual(r[k],v,(e,k))
    def test_each_crude_grade_is_a_component(self):
        for d in [{'id':'HSW','name':'Heavy Sweet'},{'id':'MED','name':'Medium'},{'id':'HSO','name':'Heavy Sour'},{'id':'LSW','name':'Light Sweet'},{'id':'LSO','name':'Light Sour'}]:
            r=m.facet('crude-oil-imports','gradeId',d)
            self.assertEqual((r['classification'],r['qualifierClassification']),('subset','subset'))
    def test_no_whole_biofuels_from_manufacturing_headline(self):
        for route,node in self.nodes.items():
            if not route.startswith('densified-biomass/'):continue
            r=m.build(node)
            for d in r['dataColumns']+[x for rows in r['facets'].values() for x in rows]:
                self.assertNotEqual(d['classification'],'whole product')
                self.assertNotIn('qualifier',d)
    def test_raw_material_cost_is_not_finished_fuel_price(self):
        r=self.col('densified-biomass/feedstocks-and-cost','cost')
        self.assertEqual(r['classification'],'out of vocabulary');self.assertNotIn('activity',r)
    def test_facility_and_employee_counts_are_not_customers(self):
        for key in ['number-of-facilities','number-of-fte-employees']:
            self.assertEqual(self.col('densified-biomass/capacity-by-region',key)['classification'],'out of vocabulary')
    def test_exports_and_domestic_sales_not_confused(self):
        self.assertEqual(self.col('densified-biomass/export-sales-and-price','quantity')['activity'],'exports')
        self.assertEqual(self.col('densified-biomass/sales-and-price-by-region','quantity')['activity'],'sales')
        self.assertIn('export',self.col('densified-biomass/export-sales-and-price','average-price')['basisLabel'])
    def test_inventory_not_flow(self):
        r=self.col('densified-biomass/inventories-by-region','inventory');self.assertEqual(r['activity'],'storage');self.assertIn('end-of-month',r['basisLabel'])
    def test_capacity_source_unit_mismatch_disclosed(self):
        r=self.col('densified-biomass/capacity-by-region','capacity');self.assertIn('tons per year',r['unitNote']);self.assertIn('excludes',r['basisLabel'])
    def test_crude_not_whole_petroleum_or_implicit_sum(self):
        r=self.col('crude-oil-imports','quantity');self.assertEqual(r['classification'],'subset');self.assertEqual(r['qualifier'],'crude oil');self.assertIn('no summation',r['selectionConstraint']);self.assertIn('excludes estimates',r['basisLabel'])
    def test_partners_and_destination_roles_remain_distinct(self):
        r=m.build(self.nodes['crude-oil-imports'])['scope']
        self.assertIn('never subject-country',r['originRole']);self.assertNotEqual(r['destinationRoles']['RS'],r['destinationRoles']['PS'])
    def test_no_place_facet_never_becomes_foreign_or_state(self):
        for leaf in ['feedstocks-and-cost','export-sales-and-price']:
            s=m.build(self.nodes['densified-biomass/'+leaf])['scope'];self.assertEqual(s['placeKind'],'US');self.assertIsNone(s['placeFilter'])
    def test_unknown_definition_and_unit_remain_pending(self):
        self.assertEqual(m.facet('crude-oil-imports','gradeId',{'id':'TOTAL','name':'Total'})['classification'],'pending')
        self.assertEqual(m.facet('crude-oil-imports','gradeId',{'id':'MED','name':'All crude oil'})['classification'],'pending')
        self.assertEqual(m.column('crude-oil-imports','quantity',{'units':'percent'})['classification'],'pending')
        self.assertEqual(m.column('densified-biomass/new','quantity',{'units':'tons'})['classification'],'pending')
    def test_unreviewed_codes_cannot_borrow_valid_names_seeded(self):
        rng=random.Random(20261029)
        for _ in range(100):
            unknown='NEW'+str(rng.randrange(1000000))
            name=rng.choice(['Heavy Sweet','Medium','Total','All grades','Light Sour'])
            r=m.facet('crude-oil-imports','gradeId',{'id':unknown,'name':name})
            self.assertEqual(r['classification'],'pending')
            self.assertNotIn('qualifierClassification',r)
    def test_all_source_definitions_and_provenance_retained(self):
        self.assertEqual(len(self.nodes),7)
        for route,n in self.nodes.items():
            r=m.build(n);self.assertTrue(r['complete']);self.assertEqual({x['id']:x['sourceDefinition'] for x in r['dataColumns']},n['data'])
            for fid,rows in r['facets'].items():
                original=m.i.inventory(route)[fid]
                self.assertEqual([(x['sourceDefinition'],x['calls'],x['frequencies']) for x in rows],[(x['definition'],x['calls'],x['frequencies']) for x in original])
            self.assertTrue(all(x['publicationStatus']=='unverified' for x in r['dataColumns']))
if __name__=='__main__':unittest.main()
