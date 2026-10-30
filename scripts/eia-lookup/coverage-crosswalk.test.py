"""Offline research checks; not application or scored-model tests."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('crosswalk',Path(__file__).with_name('coverage-crosswalk.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class CrosswalkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.geos={g['code']:g for g in c.i.read(c.i.ROOT/'data/eia/routing-metadata.json')['geographies'] if '+' not in g['code']}
        cls.result=c.build()
    def decision(self,route,fid,value):return c.classify(route,fid,value,self.geos,{})
    def test_trade_partner_never_becomes_requested_country(self):
        for name in ['Canada','CAN','United States']:
            d=self.decision('natural-gas/move/impc','duoarea',{'id':'NUS-NCA','name':name})
            self.assertEqual(d['status'],'not a place we use')
    def test_regional_code_does_not_become_named_state(self):
        d=self.decision('petroleum/cons/psup','duoarea',{'id':'R20','name':'Texas'})
        self.assertEqual(d['status'],'not a place we use')
    def test_ambiguous_name_requires_code(self):
        d=self.decision('coal/price-by-rank','stateRegionId',{'id':'GEO_UNKNOWN','name':'Georgia'})
        self.assertEqual(d['status'],'unresolved')
        d=self.decision('coal/price-by-rank','stateRegionId',{'id':'GA','name':'Georgia'})
        self.assertEqual(d['geographyCode'],'GA')
    def test_no_fuzzy_metadata_mapping(self):
        d=self.decision('international','countryRegionId',{'id':'UNKNOWN','name':'Icealnd'})
        self.assertEqual(d['status'],'unresolved')
    def test_port_and_refinery_are_not_state_totals(self):
        for prefix in ['PT','RF','PP','RP']:
            d=self.decision('crude-oil-imports','destinationId',{'id':prefix+'_TX','name':'Texas'})
            self.assertEqual(d['status'],'not a place we use')
    def test_state_destination_requires_type_filter(self):
        d=self.decision('crude-oil-imports','destinationId',{'id':'PS_TX','name':'Texas'})
        self.assertEqual(d['geographyCode'],'TX');self.assertEqual(d['requiredFilters'],{'destinationType':['PS']})
    def test_every_fit_place_definition_retained(self):
        for route,entry in self.result['routes'].items():
            source=c.i.inventory(route)
            for fid,rows in source.items():
                if fid not in c.PLACE_FACETS:continue
                self.assertEqual(len(rows),len(entry['facets'][fid]))
                self.assertEqual([r['definition'] for r in rows],[r['definition'] for r in entry['facets'][fid]])
    def test_all_mappings_use_approved_codes(self):
        for entry in self.result['routes'].values():
            for rows in entry['facets'].values():
                for r in rows:
                    if r['status']=='mapped':self.assertIn(r['geographyCode'],self.geos)
    def test_inherited_country_collision_cannot_override_domestic_definition(self):
        route='natural-gas/prod/sum'
        approved={route:{'geographyFacet':'duoarea','geographies':{'SSD':'SSD'}}}
        d=c.classify(route,'duoarea',{'id':'SSD','name':'USA-SD'},self.geos,approved)
        self.assertEqual(d['geographyCode'],'SD')
        d=c.classify('international','countryRegionId',{'id':'SSD','name':'South Sudan'},self.geos,approved)
        self.assertEqual(d['geographyCode'],'SSD')
    def test_all_explicit_domestic_state_names_survive_competing_inherited_mapping(self):
        for code,g in self.geos.items():
            if g['type']!='state' or not c.re.fullmatch('[A-Z]{2}',code):continue
            for name in [g['name'],'USA-'+code]:
                route='natural-gas/prod/sum';native='S'+code
                approved={route:{'geographyFacet':'duoarea','geographies':{'SSD':native}}}
                d=c.classify(route,'duoarea',{'id':native,'name':name},self.geos,approved)
                self.assertEqual(d.get('geographyCode'),code,(code,name,d))
    def test_inherited_mapping_does_not_bypass_bilateral_or_regional_scope(self):
        route='natural-gas/move/impc'
        for native in ['NUS-NCA','R20','Y123']:
            approved={route:{'geographyFacet':'duoarea','geographies':{'USA':native}}}
            self.assertEqual(c.classify(route,'duoarea',{'id':native,'name':'United States'},self.geos,approved)['status'],'not a place we use')
    def test_offshore_metadata_is_not_a_state_even_if_legacy_geography_says_state(self):
        for code,name in [('X3','Federal Offshore - Gulf of America'),('X5','Federal Offshore - Pacific')]:
            self.assertEqual(self.decision('seds','stateId',{'id':code,'name':name})['status'],'not a place we use')
    def test_lower48_never_becomes_new_us_coverage(self):
        rows=self.result['routes']['natural-gas/stor/wkly']['facets']['duoarea']
        self.assertTrue(rows);self.assertTrue(all(r['status']=='not a place we use' for r in rows))
    def test_annual_only_definitions_retained(self):
        d=c.i.inventory('international')
        q=next(r for r in d['productId'] if r['definition']['id']=='44')
        self.assertIn('annual',q['frequencies'])
        self.assertGreater(len(d['productId']),18)
if __name__=='__main__':unittest.main()
