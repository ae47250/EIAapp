"""Source-based regressions, not an independent benchmark or holdout.
Expectations were recorded in international-import-source-review.json before edits.
"""
import copy,importlib.util,random,unittest
from pathlib import Path
here=Path(__file__).parent
spec=importlib.util.spec_from_file_location('imports',here/'coverage-international-import-classification.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
spec=importlib.util.spec_from_file_location('catalog',here/'coverage-series-catalog.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class ImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review=m.i.read(m.i.EVIDENCE/m.SOURCE)
        cls.data=m.i.read(m.i.EVIDENCE/'international-classification.json')
        cls.cross=m.i.read(m.i.EVIDENCE/'place-crosswalk.json')['routes']['international']['facets']['countryRegionId']
        cls.node=next(n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n['route']=='international')
    def classify(self,code):return m.classify(self.data['products'][code]['source']['definition'],self.review['products'][code],self.cross)
    def test_ten_reviewed_import_definitions(self):
        self.assertEqual(set(self.review['products']),{'78','781','782','783','784','785','786','787','788','789'})
        for code in self.review['products']:
            r=self.classify(code);self.assertEqual((r['classification'],r['product']),('whole product','petroleum'))
            self.assertEqual(r['publicationStatus'],'unverified');self.assertFalse(r['coverageEligible'])
    def test_fixed_importing_countries(self):
        expected={'782':'FRA','783':'DEU','784':'ITA','785':'JPN','786':'KOR','787':'USA','788':'CAN','789':'GBR'}
        for code,subject in expected.items():
            r=self.classify(code);self.assertEqual(r['subjectGeographyCode'],subject)
            self.assertEqual(r['subjectPlaceKind'],'US' if subject=='USA' else 'country')
            self.assertEqual(r['placeRole'],'trade partner')
    def test_supplier_never_becomes_subject(self):
        r=self.classify('782');self.assertEqual(r['subjectGeographyCode'],'FRA')
        self.assertIn('Never map',r['geographyConstraint']);self.assertFalse(r['coverageEligible'])
        self.assertIn('all-source aggregate',r['partnerCoverageConstraint'])
    def test_group_importers_do_not_expand_into_countries(self):
        for code in ['78','781']:
            r=self.classify(code);self.assertIsNone(r['subjectGeographyCode']);self.assertIsNone(r['subjectPlaceKind']);self.assertFalse(r['coverageEligible'])
    def test_opec_origin_restriction_preserved(self):
        r=self.classify('78');self.assertEqual(r['sourceRestriction'],'OPEC');self.assertIn('from OPEC',r['basisLabel'])
    def test_no_unproved_sum_of_partners(self):
        for code in self.review['products']:self.assertIn('never sum',self.classify(code)['partnerCoverageConstraint'])
    def test_crosswalk_aliases_do_not_create_multiple_subjects(self):
        for code in ['785','788']:
            r=self.classify(code);self.assertIn(r['subjectGeographyCode'],['JPN','CAN'])
    def test_crosswalk_missing_subject_blocks(self):
        with self.assertRaises(ValueError):m.classify(self.data['products']['782']['source']['definition'],self.review['products']['782'],[])
    def test_changed_metadata_blocks(self):
        for field,value in [('title','Coal imports'),('activityid',4),('base_unit','MT')]:
            r=copy.deepcopy(self.review['products']['782']);r['productActivityDefinition'][field]=value
            with self.assertRaises(ValueError):m.classify(self.data['products']['782']['source']['definition'],r,self.cross)
    def test_unknown_native_products_block_seed_20261029(self):
        rng=random.Random(20261029)
        for code in rng.sample(range(10000,99999),100):
            with self.subTest(code=code),self.assertRaises(ValueError):m.classify({'id':str(code),'name':'France imports, by source'},self.review['products']['782'],self.cross)
    def test_source_selection_cannot_change_product_or_frequency(self):
        for field,value in [('toplevelproductid',7),('frequencycode','A'),('unitcode','MT')]:
            r=copy.deepcopy(self.review['products']['782']);r['selectionDefinitions'][0][field]=value
            with self.assertRaises(ValueError):m.classify(self.data['products']['782']['source']['definition'],r,self.cross)
    def test_catalog_preserves_all_constraints(self):
        catalog=c.build_node(self.node)
        for code in self.review['products']:
            expected=self.classify(code)
            combo=next(x for x in catalog['candidateCombinations'] if x['productId']==code and x['activityId']=='3')
            for key in ['subjectGeographyCode','subjectPlaceKind','placeRole','geographyConstraint','partnerCoverageConstraint','sourceRestriction','coverageEligible','basisLabel']:
                self.assertEqual(combo[key],expected[key])
            self.assertEqual(combo['frequencies'],['monthly'])
    def test_other_activity_import_origin_combinations_remain_out(self):
        catalog=c.build_node(self.node)
        for combo in catalog['candidateCombinations']:
            if combo['productId'] in self.review['products'] and combo['activityId']!='3':self.assertEqual(combo['classification'],'out of vocabulary')
    def test_normal_imports_keep_direct_subject_semantics(self):
        catalog=c.build_node(self.node)
        row=next(x for x in catalog['candidateCombinations'] if x['productId']=='5' and x['activityId']=='3')
        self.assertEqual((row['classification'],row['product'],row['activity']),('whole product','petroleum','imports'))
        self.assertNotIn('subjectGeographyCode',row);self.assertNotIn('placeRole',row);self.assertNotIn('coverageEligible',row)
    def test_complete_definitions_do_not_claim_publication(self):
        catalog=c.build_node(self.node);self.assertTrue(catalog['classificationComplete'])
        self.assertTrue(all(x['publicationStatus']=='unverified' for x in catalog['candidateCombinations']))
if __name__=='__main__':unittest.main()
