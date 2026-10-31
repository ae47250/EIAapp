"""Offline correspondence tests against source definitions, not app outputs."""
import copy,importlib.util,unittest
from unittest.mock import patch
from pathlib import Path
BASE=Path(__file__).parent
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,BASE/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
s=module('seds','coverage-seds-classification.py')
c=module('catalog','coverage-series-catalog.py')
class SeriesClassificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.rows={r['definition']['id']:r['definition'] for r in s.i.inventory('seds')['seriesId']}
    def item(self,code):return s.classify(self.rows[code])
    def test_consumed_for_generation_stays_consumption(self):
        for code in ['NUETB','HYEGB']:
            self.assertEqual(self.item(code)['activity'],'consumption')
        self.assertEqual(self.item('NUETP')['activity'],'generation')
    def test_retail_sales_basis_keeps_named_consumption(self):
        for code in ['ESTCB','ESTCP']:
            r=self.item(code);self.assertEqual(r['activity'],'consumption');self.assertEqual(r['classification'],'whole product')
    def test_crude_does_not_become_whole_petroleum(self):
        r=self.item('PAPRP');self.assertEqual(r['product'],'petroleum');self.assertEqual(r['classification'],'subset');self.assertEqual(r['qualifier'],'crude oil')
    def test_gasoline_requires_explicit_qualifier(self):
        r=self.item('MGTCP');self.assertEqual(r['classification'],'subset');self.assertEqual(r['qualifier'],'gasoline');self.assertEqual(r['qualifierClassification'],'whole product')
    def test_nonmeasures_never_become_whole_totals(self):
        for code in ['ESTCK','FFETK','TETGR','TEGDS','ELVHS','BFLCB','TENEB']:
            self.assertEqual(self.item(code)['classification'],'out of vocabulary',code)
    def test_named_use_components_are_not_totals(self):
        for code in ['NGPZB','NGLPB','CLKCB','ESVHP','ESRFB']:
            self.assertEqual(self.item(code)['classification'],'subset',code)
    def test_sector_is_subset_of_base_but_whole_in_its_sector(self):
        r=self.item('CLCCP');self.assertEqual(r['classification'],'subset');self.assertEqual(r['sector'],'commercial');self.assertEqual(r['sectorCellClassification'],'whole product')
    def test_approved_liquid_biofuels_basis_survives(self):
        r=self.item('BFPRP');self.assertEqual(r['classification'],'whole product');self.assertEqual(r['product'],'biofuels');self.assertEqual(r['activity'],'production')
    def test_seds_gas_price_label_is_consistent_with_source(self):
        for code in ['NGRCD','NGCCD','NGICD']:
            r=self.item(code);self.assertEqual(r['classification'],'subset');self.assertEqual(r['sectorCellClassification'],'whole product');self.assertIn('sales price; excludes gas transported for other sellers',r['basisLabel']);self.assertIn('1987',r['historicalScope']);self.assertIn('broader EIA total',r['selectionConstraint'])
        self.assertIn('assigned prices',self.item('NGEID')['basisLabel'])
    def test_hydroelectric_is_not_an_electric_power_sector_mention(self):
        r=self.item('HVGBP');self.assertEqual((r['classification'],r['product'],r['activity']),('whole product','hydro','capacity'))
        self.assertNotIn('sector',r)
    def test_explicit_sector_words_survive_boundary_check(self):
        for sector in ['residential','commercial','industrial','transportation','electric power']:
            r=s.classify({'id':'CLTCB','name':'Coal consumption in the '+sector+' sector'})
            self.assertEqual(r.get('sector'),sector);self.assertEqual(r['sectorCellClassification'],'whole product')
    def test_substrings_inside_longer_words_are_not_sectors(self):
        for word in ['residentially','commercialization','preindustrial','transportational','hydroelectric power']:
            r=s.classify({'id':'CLTCB','name':'Coal consumption; '+word+' context'})
            self.assertNotIn('sector',r)
    def test_all_seds_definitions_are_accounted_for(self):
        self.assertEqual(len(self.rows),968)
        self.assertTrue(all(s.classify(v)['classification']!='pending' for v in self.rows.values()))
    def test_every_source_facet_is_retained(self):
        for node in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes']:
            if node.get('classification')!='FITS':continue
            out=c.build_node(node);source=c.i.inventory(node['route'])
            for fid,rows in source.items():
                if fid not in c.MEASURE_FACETS:continue
                self.assertEqual([r['definition'] for r in rows],[r['definition'] for r in out['facets'][fid]])
    def test_international_publication_is_not_inferred_from_cross_product(self):
        node=next(n for n in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes'] if n['route']=='international')
        out=c.build_node(node)
        self.assertTrue(all(r['publicationStatus']=='unverified' for r in out['candidateCombinations']))
        self.assertTrue(out['classificationComplete'])
        # Completed definitions are not verified coverage; an unknown definition still blocks.
        original_read=c.i.read
        def unresolved(path):
            data=original_read(path)
            if path.name=='international-classification.json':
                data=copy.deepcopy(data);data['products']['78']['classification']='pending'
            return data
        with patch.object(c.i,'read',side_effect=unresolved):
            self.assertFalse(c.build_node(node)['classificationComplete'])
if __name__=='__main__':unittest.main()
