"""Coal source-based regressions; no app-output-derived expectations or benchmark claim."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('coal',Path(__file__).with_name('coverage-coal-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CoalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.nodes={n['route']:n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('coal/')}
    def col(self,leaf,key):
        route='coal/'+leaf;return m.column(route,key,self.nodes[route]['data'][key])
    def test_all_coal_is_not_one_rank(self):
        self.assertEqual(m.facet('coalRankId',{'id':'TOT'})['classification'],'whole product')
        for code in ['ANT','BIT','SUB','LIG','MET','STM','COK','REF','WC','SYN']:self.assertEqual(m.facet('coalRankId',{'id':code})['classification'],'subset')
    def test_mine_type_and_market_components_stay_subset(self):
        for fid,codes in [('mineTypeId',['UND','SUR','REF']),('marketTypeId',['CAP','OM'])]:
            for code in codes:self.assertEqual(m.facet(fid,{'id':code})['classification'],'subset')
    def test_production_is_not_mining_productivity_or_labor(self):
        self.assertEqual(self.col('aggregate-production','production')['activity'],'production')
        for key in ['productivity','labor-hours','average-employees','number-of-mines']:self.assertEqual(self.col('aggregate-production',key)['classification'],'out of vocabulary')
    def test_capacity_is_potential_not_actual_output(self):
        r=self.col('reserves-capacity','productive-capacity');self.assertEqual((r['classification'],r['activity']),('whole product','capacity'))
    def test_producing_mine_reserves_are_not_all_reserves(self):
        r=self.col('reserves-capacity','recoverable-reserves');self.assertEqual((r['classification'],r['activity']),('subset','reserves'));self.assertIn('producing mines',r['basisLabel'])
    def test_stockholders_not_merged(self):
        r=self.col('reserves-capacity','producer-distributor-stocks');self.assertEqual((r['classification'],r['activity']),('subset','storage'))
        self.assertEqual(self.col('consumption-and-quality','stocks')['classification'],'subset')
    def test_other_industrial_and_coke_are_not_whole_industry(self):
        for code in ['9','10']:self.assertEqual(m.facet('sector',{'id':code})['sectorCellClassification'],'subset')
        self.assertEqual(m.facet('sector',{'id':'98'})['sectorCellClassification'],'whole product')
    def test_trade_requires_total_partners_and_districts(self):
        for key in ['quantity','price']:
            r=self.col('exports-imports-quantity-price',key);self.assertEqual(r['subjectKind'],'US');self.assertEqual(r['subjectCode'],'USA');self.assertEqual(r['requiredTotalFacets'],{'countryId':'TOT','customsDistrictId':'TOT'})
        r=m.build(self.nodes['coal/exports-imports-quantity-price']);self.assertEqual(r['scope']['placeFacetRoles']['countryId'],'foreign trade partner')
    def test_trade_direction_does_not_turn_price_into_export_volume(self):
        self.assertEqual(self.col('exports-imports-quantity-price','price')['activity'],'prices')
        self.assertEqual(self.col('exports-imports-quantity-price','quantity')['activityFacet'],'exportImportType')
        self.assertEqual(m.facet('exportImportType',{'id':'Imports'})['activity'],'imports')
    def test_shipments_and_receipts_not_consumption(self):
        for leaf in ['shipments/mine-state-aggregates','shipments/plant-state-aggregates']:
            self.assertEqual(self.col(leaf,'quantity')['classification'],'out of vocabulary')
            r=self.col(leaf,'price');self.assertEqual((r['classification'],r['sectorCellClassification']),('subset','subset'))
        self.assertEqual(self.col('consumption-and-quality','receipts')['classification'],'out of vocabulary')
    def test_origin_and_destination_not_interchangeable(self):
        a=m.build(self.nodes['coal/shipments/mine-state-aggregates']);b=m.build(self.nodes['coal/shipments/plant-state-aggregates']);self.assertEqual(a['scope']['placeRole'],'origin mine state');self.assertEqual(b['scope']['placeRole'],'destination plant state')
    def test_bad_heat_content_unit_cannot_become_quantity(self):
        self.assertEqual(self.col('consumption-and-quality','heat-content')['classification'],'out of vocabulary')
    def test_sector_total_cannot_widen_receipt_price_population(self):
        r=self.col('consumption-and-quality','price');self.assertEqual(r['sectorCellOverrides']['electric power'],'subset')
        self.assertNotIn('sectorCellOverrides',self.col('consumption-and-quality','consumption'))
    def test_unreviewed_definition_stays_pending(self):
        self.assertEqual(m.facet('coalRankId',{'id':'NEW'})['classification'],'pending')
        self.assertEqual(m.column('coal/new','production',{})['classification'],'pending')
    def test_all_eight_routes_preserve_definitions_without_publication_claim(self):
        self.assertEqual(len(self.nodes),8)
        for route,node in self.nodes.items():
            r=m.build(node);self.assertTrue(r['complete'],route);self.assertEqual({x['id']:x['sourceDefinition'] for x in r['dataColumns']},node['data'])
            self.assertTrue(all(x['publicationStatus']=='unverified' for x in r['dataColumns']))
            for fid,rows in r['facets'].items():self.assertEqual([x['sourceDefinition'] for x in rows],[x['definition'] for x in m.i.inventory(route)[fid]])
if __name__=='__main__':unittest.main()
