"""Independent reader for actual single-series and comparison XLSX downloads."""
import sys,json,zipfile,posixpath,xml.etree.ElementTree as ET
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
with zipfile.ZipFile(sys.argv[1]) as z:
 book=ET.fromstring(z.read('xl/workbook.xml'));rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'));sheets={}
 for s in book.find('s:sheets',n):
  target=next(r.attrib['Target'] for r in rels if r.attrib['Id']==s.attrib['{'+n['r']+'}id']);root=ET.fromstring(z.read(posixpath.normpath('xl/'+target)));sheets[s.attrib['name']]=[{''.join(filter(str.isalpha,c.attrib['r'])):(''.join(c.itertext()),c.attrib.get('t')) for c in row} for row in root.find('s:sheetData',n)]
 data=sheets['All_Data'];headers={v[0]:k for k,v in data[0].items()};meta={row.get('A',('',''))[0]:row.get('B',('',''))[0] for row in sheets.get('Metadata',[])[1:]};variables={}
 if 'Variables' in sheets:
  v=sheets['Variables'];h={x[0]:k for k,x in v[0].items()}
  variables={row[h['Definition ID']][0]:{'product':row[h['Product']][0],'activity':row[h['Activity']][0]} for row in v[1:]}
 rows=[]
 for row in data[1:]:
  def get(name):return row.get(headers.get(name),('',''))[0]
  cell=row.get(headers.get('Value',headers.get('Observation value')),('',''));number=float(cell[0]) if cell[0] and cell[1] not in ['inlineStr','s'] else None
  identity=variables.get(get('Definition ID'),{'product':meta.get('Product'),'activity':meta.get('Activity')})
  rows.append({'code':get('Country code') or meta.get('Country code'),'name':get('Country') or meta.get('Country'),'period':get('Period') or get('Observation period'),'value':number,**identity})
 print(json.dumps({'rows':rows,'metadataFields':[row.get('A',('',''))[0] for row in sheets.get('Metadata',[])[1:]]}))
